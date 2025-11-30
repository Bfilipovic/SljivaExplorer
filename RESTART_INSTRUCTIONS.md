# Restart Instructions

The explorer needs to be restarted to pick up the configuration changes. Here's what to do:

## Stop Current Processes

If you see port conflicts, stop all explorer processes:

```bash
cd explorer
pkill -f "tsx watch server/index.ts"
pkill -f "vite dev"
pkill -f "concurrently"
```

Or press `Ctrl+C` in the terminal where `npm run dev` is running.

## Configuration

Your `.env` file is now configured for local development:

```
EXPLORER_STORES='[{"id":"local","name":"Local SljivaStore","baseUrl":"http://localhost:3000/api/explorer"}]'
MAIN_STORE_PORT=3000
```

**Important**: No `PORT=` variable is set, so the server will use `EXPLORER_API_PORT=4176` from package.json.

## Start Explorer

```bash
cd explorer
npm run dev
```

This will:
- Start Vite frontend on port **4175** (http://localhost:4175)
- Start Explorer API server on port **4176** (internal)
- Vite will proxy `/api/explorer/*` requests to port 4176

## Verify It's Working

1. Check that stores are loaded:
   ```bash
   curl http://localhost:4175/api/explorer/stores
   ```
   Should return: `[{"id":"local","name":"Local SljivaStore","baseUrl":"http://localhost:3000/api/explorer"}]`

2. Try searching in the browser at http://localhost:4175

## If You Still Get Errors

1. **500 errors from backend**: Check backend logs for errors
2. **Port conflicts**: Make sure no other process is using ports 4175 or 4176
3. **Connection refused**: Make sure the backend is running on port 3000

