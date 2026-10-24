#!/bin/bash
set -e
pnpm install --frozen-lockfile
UV_PROJECT_ENVIRONMENT=.pythonlibs uv sync --frozen --no-dev
pnpm --filter db push
