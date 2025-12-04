# Explorer Backend Server

This directory contains the Node.js backend server for the Explorer project.

## Structure

- `index.ts` - Main server entrypoint
- `config/stores.ts` - Store configuration management
- `tsconfig.json` - TypeScript configuration for the server

## Environment Variables

Create a `.env` file in the repo root (or `.env.production` for production) with:

```env
EXPLORER_API_PORT=4176
NODE_ENV=development
MAIN_STORE_PORT=3000

# Multi-store configuration (JSON array)
EXPLORER_STORES='[{"id":"main","name":"Main Nomin","baseUrl":"https://store1.example.com/api/explorer"},{"id":"test","name":"Test Store","baseUrl":"https://teststore.example.com/api/explorer"}]'
```

### Store Configuration

The `EXPLORER_STORES` environment variable defines multiple Nomin-compatible stores that the Explorer can query. If not provided or invalid, it defaults to a single local store pointing to `http://localhost:3000/api/explorer`.

**Store Configuration Fields:**
- `id` (required) - Unique identifier for the store
- `name` (required) - Human-readable store name
- `baseUrl` (required) - Base URL of the store's Explorer API endpoint
- `publicKey` (optional) - Public key for store verification
- `description` (optional) - Store description
- `enabled` (optional) - Whether the store is enabled (default: true)

**Example:**
```json
[
  {
    "id": "main",
    "name": "Main Nomin",
    "baseUrl": "https://store1.example.com/api/explorer",
    "description": "Primary production store"
  },
  {
    "id": "test",
    "name": "Test Store",
    "baseUrl": "https://teststore.example.com/api/explorer",
    "enabled": true
  }
]
```

## Routes

The server exposes aggregator routes under `/api/explorer` that query one or more configured stores:

### Query Parameters

All routes support an optional `storeId` query parameter:
- If provided: Query only that specific store
- If omitted: Query all configured stores in parallel and aggregate results

Additional query parameters:
- `skip` / `page` / `limit` - Pagination (for routes that support it)

### Endpoints

#### Part Lookup
- `GET /api/explorer/parts/:partHash?storeId=...&skip=...&limit=...`
  - Returns part metadata and paginated partial transactions
  - Response includes `storeId` and `storeName` fields on all items

#### Transaction Lookup
- `GET /api/explorer/transactions/id/:txId?storeId=...`
  - Look up transaction by database ID
- `GET /api/explorer/transactions/chain/:chainTx?storeId=...`
  - Look up transaction by chain hash

#### Partial Transactions
- `GET /api/explorer/partial-transactions/part/:partHash?storeId=...&skip=...&limit=...`
  - Get paginated partial transactions for a part
- `GET /api/explorer/partial-transactions/id/:txId?storeId=...&skip=...&limit=...`
  - Get paginated partial transactions for a transaction ID
- `GET /api/explorer/partial-transactions/chain/:chainTx?storeId=...&skip=...&limit=...`
  - Get paginated partial transactions for a chain transaction hash

### Response Format

**Single Store Query:**
```json
{
  "part": { ... },
  "partialTransactions": [ ... ],
  "pagination": { ... }
}
```

**Multi-Store Query (aggregated):**
```json
{
  "part": { ... },
  "partialTransactions": [ ... ],
  "pagination": { ... },
  "errors": [
    {
      "storeId": "store1",
      "storeName": "Store 1",
      "error": "Request timed out"
    }
  ]
}
```

All returned items include `storeId` and `storeName` fields to identify their source store.

### Error Handling

- Store timeouts: 10 seconds default
- Failed stores are logged in the `errors` array (multi-store queries)
- Individual store failures don't block successful responses from other stores
- Invalid `storeId` returns 404
- No stores configured returns 500

## Development

Run the server in watch mode:
```bash
npm run dev:server
```

Run both frontend and backend together:
```bash
npm run dev
```

## Production

Run the server in production mode:
```bash
npm run start:server
```

