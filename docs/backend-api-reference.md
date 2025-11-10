# Backend API Reference for Explorer

The Explorer consumes the read-only Explorer endpoints exposed by the
SljivaStore backend. All URLs shown below are relative to the main backend
origin (e.g. `https://store.example.com/api`).

## Explorer Endpoints

### `GET /explorer/parts/:partHash`
- **Description:** Retrieve a part by its hash along with all partial transactions.
- **Parameters:**
  - `partHash` — deterministic SHA-256 hash of the part document (see minting notes).
- **Response:**
  ```json
  {
    "part": {
      "_id": "string",
      "part_no": number,
      "parent_hash": "string",
      "owner": "string",
      "listing": null | "string"
    },
    "partialTransactions": [
      {
        "part": "string",
        "txId": "string",
        "from": "string",
        "to": "string",
        "nftId": "string",
        "transaction": "string",
        "chainTx": "string",
        "currency": "ETH" | "SOL",
        "amount": "string",
        "timestamp": "ISO date"
      }
    ]
  }
  ```

### `GET /explorer/transactions/id/:txId`
- **Description:** Look up a completed transaction by its database identifier.
- **Parameters:**
  - `txId` — Mongo ObjectId (24 hex chars) or stored string identifier.
- **Response:** Same `transaction` payload plus `partialTransactions` array as above.

### `GET /explorer/transactions/chain/:chainTx`
- **Description:** Find a transaction using its on-chain hash/identifier.
- **Parameters:**
  - `chainTx` — Raw chain hash (case-sensitive).
- **Response:** Same shape as `/transactions/id/:txId`.

### `GET /explorer/partial-transactions/part/:partHash`
- **Description:** Fetch partial transaction history for a part without the part metadata.
- **Response:** `{ "partialTransactions": [...] }`

### `GET /explorer/partial-transactions/id/:txId`
- **Description:** Fetch partial transactions for a parent transaction id.

### `GET /explorer/partial-transactions/chain/:chainTx`
- **Description:** Fetch partial transactions grouped by on-chain hash.

## Related Store Endpoints

The Explorer may reuse the existing store APIs when necessary:

- `GET /nfts/:id` — NFT metadata.
- `GET /parts/:id` — Raw part document (same as Explorer plus defaults).
- `GET /userTransactions/:address` — Transaction summaries for wallets.

## Authentication & CORS

- Explorer endpoints are expected to be accessible cross-origin.
- In production, configure CORS to allow the Explorer host for `/api/explorer/*`.
- All endpoints are read-only; no credentials are required by default.

## Data Normalisation

- Addresses are stored in lowercase.
- Part `_id` values are SHA-256 hashes of `{ part_no, parent_hash, owner, listing }`.
- Transaction amounts are stored as strings; format on the frontend as needed.

