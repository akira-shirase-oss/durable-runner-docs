# Durable Runner Docs

The documentation for [Durable Runner](https://github.com/akira-shirase-oss/durable-runner), the
open-source durable workflow runner whose journal outlives its process: the quick start, jobs and
step handlers, the HTTP API and its keys, the CLI, self-hosting, the API reference and the changelog.

**Read it at <https://docs.durable-runner.404human.dev>.**

Built with [Astro Starlight](https://starlight.astro.build): static pages, Pagefind search, and almost
no JavaScript. The API reference is [Scalar](https://github.com/scalar/scalar), served from this site.

Version note: Astro is pinned at 7.4.13, a patch release above the sibling docs site's — chosen
deliberately to clear a security advisory in the Astro line we share (GHSA-r3h5-4585-7x3w).

## How it stays true

Documentation that drifts from the code is worse than none, so CI checks the docs against Durable
Runner itself (`.github/workflows/ci.yml`), on every push and every night:

- **Examples run.** Code blocks marked `run=<suite>` are executed in order, in one shell, against a
  `durable-server` built from durable-runner `main` with the quick start's own commands; the block
  marked `output=<suite>` after each must match what the server printed, once ids, times and secrets
  are normalised (`scripts/snippets.mjs`). A block that cannot run in CI says why, `not-run="…"`,
  and the coverage check fails on any unmarked block.
- **The API reference covers the server.** `src/data/openapi.json` is a **draft** OpenAPI document
  authored here from durable-server's real request and response shapes; CI fails when a route in
  `crates/durable-server/src/main.rs` is missing from it, or when it names a route the server does
  not have (`scripts/check-openapi.mjs`). The draft is meant to move into durable-runner, where a
  contract test will validate real responses against it — then this repo will byte-copy it, the way
  Colophon's docs do.
- **Links resolve.** Internal links are checked while building; external ones by lychee.
- **The output is complete and clean.** Every page has its Markdown copy, search and `llms.txt` are
  built, and no machine path, private name or real hostname is in the output (`scripts/check-dist.mjs`).

## Working on it

Node.js 22.17 or newer.

```sh
npm ci
npm run dev                    # http://localhost:4321
npm run build                  # the site in dist/, checked
npm test                       # the snippet runner's own tests
scripts/check.sh               # the gate before every push
npm run hooks                  # once per clone: git runs that gate before every push
node scripts/make-og.mjs       # after a design change: re-render public/og.png, the share image
```

Running the examples needs `curl`, `python3` and a Rust toolchain. With nothing on the ports the
pages use (they show `127.0.0.1:58300`, the server's default):

```sh
node scripts/snippets.mjs                  # clone durable-runner, build it, start it, run every example
node scripts/snippets.mjs --list           # what would run, in order
node scripts/snippets.mjs --coverage       # every code block: runs, a checked output, or not-run="why"
```

Against a server you already started (fresh journal, an API key exported, a `step` handler running):

```sh
node scripts/snippets.mjs --base http://127.0.0.1:58300 --handler-base http://127.0.0.1:58320 --skip install
```

## Writing

- Say what Durable Runner does on `main` today. Something not built yet is left out, or marked
  **Planned** when the roadmap says so.
- Examples on hosted pages call `https://runner.example.com`, a reserved example domain. A local
  address (`http://127.0.0.1:58300`, the server's default) appears only on the pages that run on
  this machine — the quick start, the CLI, the handler guide, the inspector and self-hosting —
  which say so. `scripts/check-urls.mjs` holds the list.
- No commit hashes, file paths of the product repository, internal decision numbers, secrets,
  hostnames or real names in public text.
- Changelog entries live in `src/content/changelog/`, one file per change, named
  `YYYY-MM-DD-short-name.md` (the name is the entry's permanent anchor). The schema is in
  `src/content.config.ts`.

## Deploying

Cloudflare Pages, project `durable-runner-docs`:

```sh
npm run build
npx -y wrangler@4.148.0 pages deploy dist --project-name durable-runner-docs --branch main
npm run check:live -- https://docs.durable-runner.404human.dev   # search, the reference, no sideways scroll
```

## Licence

MIT, like Durable Runner.
