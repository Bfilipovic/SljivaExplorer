# Explorer Frontend

This directory will host the standalone Explorer application. The Explorer is
responsible for searching parts and transactions across the SljivaStore network.

## Goals

- Discover parts by hash
- Look up completed transactions by their transaction id or on-chain hash
- Enumerate partial transactions for a part or a chain transaction
- Provide a read-only experience that mirrors the main store data model

## Getting Started

```bash
cd explorer
npm install
npm run dev         # starts Vite on http://localhost:4175 with /api proxy
npm run test        # runs Vitest (jsdom)
npm run build       # creates production bundle in dist/
npm run preview     # serves built bundle locally
```

- Run `./orchestrate "Your task"` for AI workflows.
- Docs live in `./docs` for backend integration, API details, running instructions, and session playbooks.
- For Docker deployment see `docs/running.md`.

The Explorer is read-only and reuses the main SljivaStore backend through the
`/api/explorer/*` endpoints.

