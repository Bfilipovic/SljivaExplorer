# SljivaStore ↔ Explorer Bridge

## Data Model Reference

- **Parts**
  - `_id`: SHA-256 hash of `{ part_no, parent_hash, owner, listing }`.
  - `parent_hash`: NFT identifier produced by `hashObject` during minting.
  - `owner`: Lowercased wallet address.
  - `listing`: `null` when not listed; otherwise listing id string.

- **Transactions**
  - `_id`: Mongo ObjectId (stringified).
  - `chainTx`: On-chain transaction hash (string).
  - `buyer` / `seller`: Lowercased addresses.
  - `amount`: String representation of crypto amount.

- **Partial Transactions**
  - `part`: Part hash (`parts._id`).
  - `transaction`: Transaction id (string, may equal `txId`).
  - `chainTx`: Matches parent transaction `chainTx`.

## Backend Responsibilities

- Endpoints live under `/api/explorer`.
- Input sanitisation includes trimming, lowercasing, and ObjectId parsing.
- Responses always stringify ObjectIds so the Explorer can treat them as strings.

## Frontend Guidelines

- Validate user input before issuing requests (basic regex).
- Support copies of hashes/ids; provide clear empty state messaging.
- For pagination, use query parameters (`skip`, `limit`) when backend support is added.
- Avoid mutating backend state; Explorer is read-only.

