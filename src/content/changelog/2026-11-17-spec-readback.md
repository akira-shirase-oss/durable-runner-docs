---
title: The API key reads back a run's submitted spec
date: 2026-11-17
type: Feature
areas: [API]
docs:
  - label: API reference
    href: /api/reference/
---

`GET /jobs/{id}/spec` returns the spec exactly as it was submitted — the version, the steps and the
base64 input — so a controller can resubmit the same work under a new `op_key`, or audit what a run
was asked to do. Because the input may be job content, the read-only key cannot use this route:
it answers `403` to the read key and to open reads.
