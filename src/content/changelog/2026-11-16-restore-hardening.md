---
title: Restore re-verifies each backup file as it writes it
date: 2026-11-16
type: Fix
areas: [Journal]
docs: []
---

`durable restore` now re-checks each file after opening it — so it restores the bytes it verified,
not whatever landed in the meantime — and it fsyncs the target directory before publishing the
restored manifest. A backup list with a duplicate entry or a missing checksum is refused by name
instead of producing a partial restore.
