"""Bounded JSON-lines bridge to the pinned upstream job-boards scanner.

Contact is inherited per subprocess, never mutated in a shared Python process.
No user input is interpreted as an executable, regex, board slug or URL.
"""
import argparse
import concurrent.futures
import functools
import importlib.util
import json
from pathlib import Path
import sys
from html.parser import HTMLParser
from html import unescape

VENDOR = Path(__file__).resolve().parents[2] / "vendor" / "job-boards"
spec = importlib.util.spec_from_file_location("job_boards", VENDOR / "job_boards.py")
upstream = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upstream)

# Keep the upstream retries/backoff, with bounded per-board network budgets.
upstream.fetch = functools.partial(upstream.fetch, timeout=12, retries=2)


def read_boards(path=None):
    boards = json.loads(Path(path or VENDOR / "boards.seed.json").read_text())
    if not isinstance(boards, dict) or set(boards) - set(upstream.SOURCES):
        raise ValueError("Invalid board configuration")
    pairs = []
    for ats, slugs in boards.items():
        if not isinstance(slugs, list):
            raise ValueError("Invalid board list")
        for slug in slugs:
            if not isinstance(slug, str) or not upstream.plausible(slug, ats):
                raise ValueError("Invalid board slug")
            pairs.append((ats, slug))
    if not pairs or len(pairs) > 200:
        raise ValueError("Configure between 1 and 200 boards per collection")
    return list(dict.fromkeys(pairs))


class DescriptionText(HTMLParser):
    """Preserve requirement headings and bullets while dropping executable markup."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.ignored += 1
        if tag in {"br", "p", "div", "li", "h1", "h2", "h3", "h4", "section"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style"} and self.ignored:
            self.ignored -= 1
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "section"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)


def description_text(value):
    parser = DescriptionText()
    parser.feed(unescape(str(value or "")[:150_000]))
    return "\n".join(line.strip() for line in "".join(parser.parts).splitlines() if line.strip())[:30_000] or None


def scan_with_descriptions(ats, slug):
    # Reuse the pinned upstream network/retry/source normalizers. The upstream
    # scan_board intentionally discards descriptions, so retain them here.
    payload = json.loads(upstream.fetch(upstream.board_url(ats, slug, want_content=True)))
    jobs = upstream.SOURCES[ats]["jobs"](payload)
    if not isinstance(jobs, list):
        raise ValueError("Invalid board payload")
    rows = []
    for job in jobs:
        if not isinstance(job, dict):
            continue
        norm = upstream.SOURCES[ats]["normalize"](job)
        if norm is None:
            continue
        norm = upstream._clean(norm)
        if ats == "lever":
            # Lever puts qualifications in lists, which the upstream normalizer
            # omits from its compact search metadata.
            norm["_description"] += "\n" + "\n".join(
                str(section.get("text", "")) + "\n" + str(section.get("content", ""))
                for section in job.get("lists", []) if isinstance(section, dict)
            )
        norm["description"] = description_text(norm.pop("_description", ""))
        rows.append({"ats": ats, "company": slug, **norm, "matched": ""})
    return rows


def collect(pair):
    ats, slug = pair
    try:
        rows = scan_with_descriptions(ats, slug)
        return {"provider": ats, "company": slug, "ok": True, "rows": rows}
    except Exception:
        # Never propagate URLs/headers/contact addresses from upstream errors.
        return {"provider": ats, "company": slug, "ok": False, "rows": []}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--boards", help="Operator-managed trusted board JSON")
    args = parser.parse_args()
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(collect, pair) for pair in read_boards(args.boards)]
        for future in concurrent.futures.as_completed(futures):
            print(json.dumps(future.result()), flush=True)


if __name__ == "__main__":
    main()
