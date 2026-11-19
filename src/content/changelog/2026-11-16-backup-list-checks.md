---
title: A backup whose file list is wrong is refused by name
date: 2026-11-16
type: Fix
areas: [Server]
docs:
  - label: Backups
    href: /self-hosting/backups/
---

Restore and backup verification now reject a manifest that names the same file twice or lacks a
checksum for a file it lists — and the error names the file, so a damaged backup is diagnosable
instead of mysteriously unrestorable. The checks happen before a byte of the target is trusted.
