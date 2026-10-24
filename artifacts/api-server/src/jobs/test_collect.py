"""Offline integration tests for the wrapper, without hitting public APIs."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("collect", Path(__file__).with_name("collect.py"))
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class BridgeTests(unittest.TestCase):
    def test_seed_covers_three_platforms_and_is_bounded(self):
        pairs = bridge.read_boards()
        self.assertEqual(set(p[0] for p in pairs), {"ashby", "greenhouse", "lever"})
        self.assertTrue(3 <= len(pairs) <= 200)

    def test_no_arbitrary_urls_or_invalid_slugs(self):
        for payload in [{"custom": ["board"]}, {"ashby": ["https://example.org"]}, {"ashby": ["../etc"]}, {}]:
            with tempfile.TemporaryDirectory() as folder:
                source = Path(folder) / "boards.json"
                source.write_text(json.dumps(payload))
                with self.assertRaises(ValueError):
                    bridge.read_boards(source)

    def test_partial_failure_is_not_successful_empty_board(self):
        original = bridge.upstream.scan_board
        try:
            def fail(*args, **kwargs):
                raise RuntimeError("private contact must not be returned")
            bridge.upstream.scan_board = fail
            result = bridge.collect(("ashby", "board"))
            self.assertFalse(result["ok"])
            self.assertEqual(result["rows"], [])
            self.assertNotIn("private", json.dumps(result))
            bridge.upstream.scan_board = lambda *args, **kwargs: []
            self.assertTrue(bridge.collect(("ashby", "board"))["ok"])
        finally:
            bridge.upstream.scan_board = original

    def test_contact_is_subprocess_scoped_and_header_identifies_each_request(self):
        # A real upstream HTTP request would read exactly this UA; no network here.
        code = "import sys;sys.path.insert(0,sys.argv[1]);import job_boards;print(job_boards.UA)"
        for email in ["temp@gmail.com", "provided@example.org"]:
            result = subprocess.check_output(
                [sys.executable, "-c", code, str(bridge.VENDOR)],
                env={**os.environ, "JOB_SCRAPER_CONTACT": email}, text=True,
            )
            self.assertIn(email, result)
            self.assertNotIn("other-user@example.org", result)


if __name__ == "__main__":
    unittest.main()
