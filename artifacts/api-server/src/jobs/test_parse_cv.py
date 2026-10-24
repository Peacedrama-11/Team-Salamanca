"""Offline parser regression tests using synthetic, in-memory documents."""
import io
import json
import subprocess
import sys
import unittest
import zipfile
from pathlib import Path
from parse_cv import parse_document, DocumentError, MAX_FILE
from cv_fixtures import sample_pdf, sample_docx


class ParserTests(unittest.TestCase):
    def test_pdf_and_docx_text(self):
        self.assertIn("JS, Python, SQL", parse_document(sample_pdf(), "pdf"))
        self.assertIn("TypeScript, React, Docker", parse_document(sample_docx(), "docx"))

    def test_unreadable_scan_and_encrypted(self):
        with self.assertRaisesRegex(DocumentError, "No readable text"):
            parse_document(sample_pdf(""), "pdf")
        with self.assertRaisesRegex(DocumentError, "Password-protected"):
            parse_document(sample_pdf(encrypted=True), "pdf")

    def test_actual_type_checks_and_size(self):
        for data, kind in [(b"not PDF", "pdf"), (sample_pdf(), "docx"), (b"x" * (MAX_FILE + 1), "pdf"), (b"", "docx")]:
            with self.assertRaises(DocumentError):
                parse_document(data, kind)

    def test_archive_bomb_and_xml_entities(self):
        for content in ["<!DOCTYPE root [<!ENTITY x 'bad'>]><root/>", "x" * 1_000_000]:
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("[Content_Types].xml", "<Types/>")
                archive.writestr("word/document.xml", content)
            with self.assertRaises(DocumentError):
                parse_document(buf.getvalue(), "docx")

    def test_resource_bounded_child_never_echoes_bad_input(self):
        result = subprocess.run([sys.executable, str(Path(__file__).with_name("parse_cv.py")), "pdf"],
                                input=b"not a PDF confidential-marker", capture_output=True, check=True)
        self.assertIn("error", json.loads(result.stdout))
        self.assertNotIn(b"confidential-marker", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
