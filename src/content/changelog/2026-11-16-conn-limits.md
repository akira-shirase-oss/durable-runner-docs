---
title: Connections are capped, and every request is on a deadline
date: 2026-11-16
type: Security
areas: [Server]
docs: []
---

The server now bounds its connection count and enforces deadlines on request headers and bodies, so
a client that drips bytes or never reads its response can no longer hold a connection forever.
Bodies cut off at their deadline answer `408 body_timeout` instead of a parse error.
