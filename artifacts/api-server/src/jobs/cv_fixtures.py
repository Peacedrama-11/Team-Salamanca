"""Synthetic fixtures only; no personal data or real CVs."""
import io
import sys
from pathlib import Path

PDF_TEXT = "SYNTHETIC SAMPLE CV - NOT A REAL PERSON\nSkills: JS, Python, SQL, Git\n3 years of professional experience"
DOCX_TEXT = "SYNTHETIC SAMPLE CV - NOT A REAL PERSON\nSkills: TypeScript, React, Docker\n1.5 years of professional experience"


def sample_pdf(text=PDF_TEXT, encrypted=False):
    from pypdf import PdfWriter
    from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    if text:
        font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})})
        commands = "BT /F1 12 Tf 40 740 Td "
        for line in text.splitlines():
            escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            commands += f"({escaped}) Tj 0 -18 Td "
        commands += "ET"
        stream = DecodedStreamObject()
        stream.set_data(commands.encode("latin-1"))
        page[NameObject("/Contents")] = writer._add_object(stream)
    if encrypted:
        writer.encrypt("synthetic-test-password")
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def sample_docx(text=DOCX_TEXT):
    from docx import Document
    document = Document()
    for line in text.splitlines():
        document.add_paragraph(line)
    output = io.BytesIO()
    document.save(output)
    return output.getvalue()


def write_fixtures(folder):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "sample-cv.pdf").write_bytes(sample_pdf())
    (folder / "sample-cv.docx").write_bytes(sample_docx())
    (folder / "scanned-sample.pdf").write_bytes(sample_pdf(""))
    (folder / "encrypted-sample.pdf").write_bytes(sample_pdf(encrypted=True))


if __name__ == "__main__":
    write_fixtures(Path(sys.argv[1]))
