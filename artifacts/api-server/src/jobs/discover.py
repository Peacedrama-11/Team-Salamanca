"""Operator-only discovery. Never exposed as a public API endpoint.

Output is a candidate list, not automatically activated. Review it and select
at most 200 boards in config/boards.json before restarting the server.
"""
import argparse
import json
import os
from pathlib import Path
import collect as bridge

parser = argparse.ArgumentParser()
parser.add_argument("--output", required=True)
args = parser.parse_args()
if not os.environ.get("JOB_SCRAPER_CONTACT"):
    os.environ["JOB_SCRAPER_CONTACT"] = "temp@gmail.com"
    # Module UA was built at import time; set an explicit default if absent.
    bridge.upstream.UA = "job-boards-scraper/1.0 (public posting APIs; contact: temp@gmail.com)"
boards = {}
for ats in bridge.upstream.SOURCES:
    seed = [slug for source, slug in bridge.read_boards() if source == ats]
    try:
        discovered = bridge.upstream.discover_boards(ats, concurrency=2)
    except Exception:
        discovered = []
    boards[ats] = sorted(set(seed + discovered))
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(boards, indent=2))
print("Candidate boards written. Review before activating; discovery is not exhaustive.")
