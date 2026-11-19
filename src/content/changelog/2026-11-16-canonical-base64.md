---
title: Job input must be canonical base64, refused with one stable message
date: 2026-11-16
type: Fix
areas: [API]
docs: []
---

`input_b64` in a submit now has to be canonical, padded standard base64 (RFC 4648). Anything else —
unpadded, URL-safe alphabet, stray whitespace — comes back `400 bad_input` with a single stable
message instead of the decoder's own wording, which varied between versions.
