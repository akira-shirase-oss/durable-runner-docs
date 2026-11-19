---
title: Handler calls say which run, step and attempt they are
date: 2026-11-17
type: Feature
areas: [API]
docs: []
---

Every call the runner makes to a step handler now carries `x-durable-run-id`, `x-durable-step` and
`x-durable-attempt` alongside the input and the idempotency key, so a handler can log, trace or
reconcile an individual attempt without parsing the body. The reconciliation probe carries the same
headers.
