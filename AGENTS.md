# Durable Runner Docs — agent instructions

The docs site for [durable-runner](https://github.com/akira-shirase-oss/durable-runner), built with
Astro Starlight and deployed to Cloudflare Pages as `docs.durable-runner.404human.dev`. The product
repository is read-only reference for this worktree; never edit it from here.

## The model (same as the sibling docs site)

- `src/content/docs/*.mdx` are the pages. Code fences carry test markers: `run=<suite>` executes,
  `output=<suite>` must match the real server (normalised), `not-run="why"` explains a block that
  cannot run. `node scripts/snippets.mjs --coverage` fails on any unmarked block.
- Suites run against a `durable-server` built from the product's `main` with the quick start's own
  commands. Hosted pages show `https://runner.example.com` (RFC 2606); the pages that run on this
  machine show `http://127.0.0.1:58300` and say so — the list lives in `scripts/check-urls.mjs`
  (`ALLOWED`) and `scripts/snippets.mjs` (`LOCAL_PAGES`, `LOCAL_ADDRS`). Keep them aligned.
- `src/data/openapi.json` is a **draft** authored here; `scripts/check-openapi.mjs` keeps it
  bidirectionally in sync with the routes in the server's router. It moves into the product
  repository once reviewed.
- `scripts/check.sh` is the gate before every push: node tests, the accessibility scan's self-test,
  snippet coverage, `npm run build` (internal links, CSP hashes, the output checks), no home paths
  in tracked files.

## Non-negotiables

- No secrets, real hostnames, home paths, user names, commit hashes or internal decision numbers in
  anything committed (public repo). The only real hostname allowed is
  `docs.durable-runner.404human.dev`. `scripts/check-dist.mjs` enforces most of this in the output.
- Every example runs in CI or carries a `not-run` reason. Never fake an output block.
- The brand theme is Durable Runner's design system (the landing page's). The palette is the two blocks
  at the top of `src/styles/theme.css` (dark, then light); everything else reads it through `var()`,
  except two mirrors: the code-block background in `astro.config.mjs` (Expressive Code checks contrast
  against it) and the API reference page, which doesn't load the theme. `scripts/design-contrast.test.mjs`
  checks the text pairs in both themes. One webfont (Google Sans Flex, self-hosted, OFL); light
  animations only (no blur, no infinite or scroll effects, hover/focus ≤150 ms).
- Small commits on `main`; the coordinator reviews and pushes.

## Verification

`scripts/check.sh` before every commit that touches pages, scripts or config; `npm run build`
before any commit, always.
