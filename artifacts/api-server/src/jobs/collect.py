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


def collect(pair):
    ats, slug = pair
    try:
        rows = upstream.scan_board(ats, slug, None, False, "exact")
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
