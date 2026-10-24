---
name: Multipart code generation
description: Binary OpenAPI schemas require Blob and File declarations, even in the server schema library.
---

Generated Zod schemas for OpenAPI binary multipart fields reference the runtime global Blob and generated types reference Blob/File. The server schema library therefore needs DOM type declarations even though it is consumed by Node.

**Why:** Without these declarations, multipart code generation succeeds but its chained TypeScript library build fails with missing Blob/File types. Current Node provides the Blob runtime.

**How to apply:** Keep the upload contract multipart and preserve the schema library's DOM type declarations; do not replace transient documents with base64 JSON merely to work around codegen. Avoid retaining raw File values in long-lived React Query mutation caches.
