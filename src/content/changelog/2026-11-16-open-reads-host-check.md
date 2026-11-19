---
title: Open reads answer only requests addressed to a loopback Host
date: 2026-11-16
type: Security
areas: [Server]
docs:
  - label: Authentication
    href: /api/authentication/
---

`--open-reads` was already refused at startup on a non-loopback listen. Now it also checks the
request's `Host` header against the listener, so a web page that rebinds an attacker-controlled
name to `127.0.0.1` (DNS rebinding) can't read the run list through the victim's browser. It
changes nothing about the rule that matters most: never put `--open-reads` behind a proxy.
