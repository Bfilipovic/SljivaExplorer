# Adding Your Store to Explorer

The Explorer can't find your data because your store isn't configured. Here's how to add it:

## Step 1: Determine Your Store URL

Based on your nginx configuration, your store should be accessible at one of these domains:
- `http://kodak.beogradfilm.com/api/explorer`
- `http://nft.kodak.press/api/explorer`  
- `http://nft.beogradfilm.com/api/explorer`

**Replace with your actual domain** - whichever one you use to access your store website.

If you're running locally, it might be:
- `http://localhost:3000/api/explorer`

## Step 2: Add Your Store

### Option A: Using the Script (Easiest)

```bash
cd explorer
./scripts/add-store.sh main "My Nomin" http://YOUR-DOMAIN/api/explorer
```

Replace `YOUR-DOMAIN` with your actual domain (e.g., `kodak.beogradfilm.com`).

### Option B: Manual Configuration

1. Edit `explorer/.env.production` (or create it if it doesn't exist):

```bash
cd explorer
nano .env.production
```

2. Add or update the `EXPLORER_STORES` variable:

```bash
EXPLORER_STORES='[
  {
    "id": "main",
    "name": "My Nomin",
    "baseUrl": "http://kodak.beogradfilm.com/api/explorer"
  }
]'
```

Replace `http://kodak.beogradfilm.com` with your actual store URL.

**Important**: The `baseUrl` must end with `/api/explorer`

## Step 3: Restart Explorer

After adding the store, restart the Explorer:

```bash
# If using Docker
docker restart explorer

# If running directly
# Stop the current process and restart it
cd explorer
npm run build
npm run start:server
```

## Step 4: Verify

1. Check that stores are loaded:
```bash
curl http://localhost:4175/api/explorer/stores
```

You should see your store in the list.

2. Try searching again for your transaction hash or part hash.

## Troubleshooting

### Store URL Format

The baseUrl must:
- End with `/api/explorer`
- Be accessible from where Explorer is running
- Use the correct protocol (`http://` or `https://`)

### Multiple Stores

You can add multiple stores by adding more objects to the array:

```bash
EXPLORER_STORES='[
  {
    "id": "main",
    "name": "Main Store",
    "baseUrl": "http://store1.example.com/api/explorer"
  },
  {
    "id": "secondary",
    "name": "Secondary Store",
    "baseUrl": "http://store2.example.com/api/explorer"
  }
]'
```

### Testing the Store URL

Before adding, test that the store API is accessible:

```bash
# Test the stores endpoint
curl http://YOUR-DOMAIN/api/explorer/stores

# Test a part search (should return 404 if part doesn't exist, but proves the endpoint works)
curl http://YOUR-DOMAIN/api/explorer/parts/test-hash-12345
```

If these return errors, check that:
- Your backend is running
- The `/api/explorer` routes are enabled
- The domain/port is correct

