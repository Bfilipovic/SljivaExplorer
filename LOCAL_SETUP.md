# Local Development Setup

## Configuration

The Explorer is now configured to use your local backend:

- **Backend**: `http://localhost:3000`
- **Explorer**: `http://localhost:4175`
- **Frontend**: `http://localhost:5173`

## Current Configuration

The `.env` file in the explorer directory is set to:

```bash
EXPLORER_STORES='[{"id":"local","name":"Local SljivaStore","baseUrl":"http://localhost:3000/api/explorer"}]'
MAIN_STORE_PORT=3000
PORT=4175
```

## Running the Explorer

### Development Mode

```bash
cd explorer
npm run dev
```

This will:
- Start the Explorer frontend on port **4175**
- Start the Explorer API server on port **4176**
- Both are accessible and will proxy API calls to your backend

### Production Mode

```bash
cd explorer
npm run build
npm run start:server
```

This will:
- Build the frontend
- Start the server on port **4175** serving both the API and static files

## Restart After Configuration Changes

If you change the `.env` file, you need to restart the Explorer:

1. Stop the current process (Ctrl+C)
2. Start it again with `npm run dev` or `npm run start:server`

## Testing

1. **Check stores are loaded** (when explorer is running):
   ```bash
   curl http://localhost:4175/api/explorer/stores
   ```

2. **Search for a part**:
   - Open `http://localhost:4175`
   - Enter a part hash in the search field
   - Click Search

3. **Search for a transaction**:
   - Enter a chain hash (with or without 0x prefix) or transaction ID
   - The unified search will try all variations automatically

## Troubleshooting

### Explorer can't find data

1. **Check backend is running**:
   ```bash
   curl http://localhost:3000/api/explorer/parts/test
   ```
   Should return an error about the part not being found (404), not a connection error.

2. **Check explorer configuration**:
   ```bash
   curl http://localhost:4175/api/explorer/stores
   ```
   Should return your local store configuration.

3. **Check explorer logs**:
   Look for store configuration messages when the explorer starts. You should see:
   ```
   [Stores Config] Loaded 1 store(s):
     - local: Local SljivaStore (http://localhost:3000/api/explorer)
   ```

### Backend not accessible

If the backend is in Docker or on a different network:
- Make sure the backend is accessible from where the explorer is running
- Update the `baseUrl` in `.env` to match your setup (e.g., `http://host.docker.internal:3000/api/explorer` for Docker Desktop)

### Port conflicts

If port 4175 is already in use:
- Change `PORT=4175` to a different port in `.env`
- Or stop the process using port 4175

