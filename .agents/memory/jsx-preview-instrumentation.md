---
name: Generic JSX and preview instrumentation
description: Why generic JSX tags can pass builds but fail the instrumented development preview.
---

Avoid explicit type arguments on JSX tags in the instrumented Vite preview. Use a typed component alias outside JSX instead (for example, assign a generic component instantiation to a normal component identifier).

**Why:** Replit's preview metadata instrumentation can insert attributes between a JSX component name and its type arguments. Babel then rejects the transformed module, even though TypeScript and the production build both succeed.

**How to apply:** When development fails with unexpected-token errors involving injected metadata on a generic JSX tag, check the transformed module as well as type checking. Do not remove preview instrumentation globally to work around one component.
