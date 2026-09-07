# anvil-gf-mock (offline GrokForge claim loop)

Minimal in-memory mock of claim → submit → review → seal for CI.

This folder documents the contract for Node/TS agents. The live Agent API is documented in `docs/AGENT-API.md`.

```js
// Conceptual API
const mock = createMockGrokForge();
mock.seedTask("Ship docs");
mock.claim(id, "agent");
mock.submit(id, "# Deliverable");
mock.review(id, true);
mock.seal("v0.1.0");
```

Never put SuperGrok keys in the mock.
