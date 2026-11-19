---
title: SIGTERM exits non-zero when the drain timeout cuts requests short
date: 2026-11-16
type: Fix
areas: [Server]
docs:
  - label: Deployment
    href: /self-hosting/deployment/
---

A clean stop is supposed to mean clean. The server now exits `0` on SIGTERM only if it finished
within `--drain-timeout-secs` — requests answered, decisions made durable. If the deadline cut
anything off, it exits non-zero, so systemd and operators can tell a drained stop from a forced
one instead of assuming both look the same.
