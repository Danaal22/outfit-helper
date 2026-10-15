---
name: Runtime dependency boundaries
description: Why an externalized SDK used through a workspace library must resolve from the server application.
---

Externalized dependencies pulled through a workspace library must also be resolvable from the server application's runtime location.

**Why:** Bundling moves the importing code into the server output. Node then resolves external imports from that output, not from the original workspace library; typechecks and bundling can pass while startup fails.

**How to apply:** When adding an SDK through a shared library, check the server bundler's external patterns. Declare external runtime packages directly on the server application or deliberately bundle them, and verify startup plus the configured health endpoint.
