# Vendored job-boards

- Source: https://github.com/mherzog4/job-boards
- Revision: `da7885cff552c513319318f2f31ed23f049f426e`
- License: MIT; see LICENSE (preserved verbatim).
- job_boards.py, boards.seed.json and test_job_boards.py are unmodified upstream files.

The application wrapper imports the upstream scanner, HTTP retry handling,
source adapters and seed boards. It does not reimplement scraping in TypeScript.
The application uses metadata-only matching: descriptions are intentionally not
retained. Do not describe skills absent from metadata as unmet job requirements.

Requires Python >=3.11 (the project includes Python 3.13). There are no Python
dependencies or virtual environments. Assets remain beside the server package,
outside its generated dist directory.
