---
name: SSR credential-form safety
description: Prevent credential disclosure when a server-rendered form appears before client handlers are ready.
---

Credential forms must declare POST in their HTML, even when JavaScript normally intercepts submission. A JavaScript-only form should not become submittable until its client handler is ready.

**Why:** During the framework migration, a browser test submitted a visually rendered login form before hydration completed. Without an explicit method, the browser defaulted to GET and placed form fields in the URL. A server render and passing typecheck did not catch this.

**How to apply:** For any SSR account form, keep native fallback behavior safe, provide clear no-JavaScript guidance when needed, and include a pre-hydration or JavaScript-disabled check in regression tests. Never rely solely on an event handler calling preventDefault.
