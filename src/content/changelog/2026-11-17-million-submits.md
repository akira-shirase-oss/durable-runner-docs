---
title: One million submits in a single sustained run
date: 2026-11-17
type: Improvement
areas: [Performance, Journal]
docs: []
---

The load harness completed a sustained run of 1,000,000 acknowledged submits against a single
runner — every acknowledgment committed to the journal first — with the group's batching and bounds
holding throughout. Result records no longer carry the machine's hostname.
