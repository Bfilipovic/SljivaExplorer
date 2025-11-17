# Explorer

Standalone Explorer application for searching parts and transactions across the SljivaStore network.

## Structure

- **Frontend**: Svelte + Vite application in `src/`
- **Backend**: Node.js + Express API server in `server/`
- **Docs**: Integration guides and API references in `docs/`

## Goals

- Discover parts by hash
- Look up completed transactions by their transaction id or on-chain hash
- Enumerate partial transactions for a part or a chain transaction
- Provide a read-only experience that mirrors the main store data model

## Getting Started

### Prerequisites

See [docs/INSTALLATION.md](./docs/INSTALLATION.md) for complete installation instructions.

**Quick checklist:**
- Docker (for production) or Node.js 20+ (for development)
- Git (for cloning repository)

### Installation

```bash
cd explorer
npm install
```

### Development

Run both frontend and backend together:
```bash
npm run dev
```

Or run them separately:
```bash
npm run dev:server    # Backend only (port 4176)
npm run dev:frontend  # Frontend only (port 4175)
```

### Environment Variables

Create a `.env` file in the repo root:

```env
EXPLORER_API_PORT=4176
NODE_ENV=development
```

For production, use `.env.production`.

### Scripts

- `npm run dev` - Run both backend and frontend in development mode
- `npm run dev:server` - Run backend only in watch mode
- `npm run dev:frontend` - Run frontend only
- `npm run build` - Build frontend for production
- `npm run preview` - Preview built frontend
- `npm run start:server` - Run backend in production mode
- `npm run test` - Run Vitest tests

### Backend API

The backend server runs on port 4176 (configurable via `EXPLORER_API_PORT`) and exposes routes under `/api/explorer`:

- `GET /api/explorer/parts/:partHash`
- `GET /api/explorer/transactions/id/:txId`
- `GET /api/explorer/transactions/chain/:chainTx`
- `GET /api/explorer/partial-transactions/part/:partHash`
- `GET /api/explorer/partial-transactions/id/:txId`
- `GET /api/explorer/partial-transactions/chain/:chainTx`

See `server/README.md` for more details.

### Development Proxy

The Vite dev server automatically proxies:
- `/api/explorer/**` → Explorer backend (localhost:4176)
- `/api/**` (excluding `/api/explorer`) → Main store backend (localhost:3000)

### AI Workflows

- Run `./orchestrate "Your task"` for AI-assisted development
- Docs live in `./docs` for backend integration, API details, running instructions, and session playbooks
- For Docker deployment see `docs/running.md`

