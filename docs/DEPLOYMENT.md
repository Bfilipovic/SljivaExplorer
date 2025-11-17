# Explorer Deployment Guide

Complete guide for deploying the Explorer in production and managing store connections.

## Quick Start

**Recommended order:**

```bash
# 1. Deploy Explorer
git clone <explorer-repo>
cd explorer
docker build -t explorer .
docker run -d -p 4175:4175 --env-file .env.production explorer

# 2. Enable Explorer on store (set CORS) - DO THIS FIRST
cd ../backend  # or navigate to your store's backend directory
./scripts/enable-explorer.sh https://explorer.example.com

# 3. Add store to Explorer (after CORS is enabled)
cd ../explorer  # or navigate to your explorer directory
./scripts/discover-store.sh https://store.example.com
# OR manually:
./scripts/add-store.sh main "Store Name" https://store.example.com/api/explorer
```

**Why this order?**
- Discovery (`/.well-known/store-info`) works without CORS (it's a public endpoint)
- But Explorer needs CORS enabled to query the actual API routes (`/api/explorer/**`)
- Enabling CORS first ensures Explorer can query immediately after being added

## Table of Contents

1. [Production Deployment](#production-deployment)
2. [Adding a Store to Explorer](#adding-a-store-to-explorer)
3. [Enabling Explorer Access on a Store](#enabling-explorer-access-on-a-store)
4. [Store Discovery](#store-discovery)

---

## Production Deployment

### Prerequisites

- **Docker** installed (see [INSTALLATION.md](./INSTALLATION.md) for Docker setup)
- **Git** installed
- Access to the Explorer repository

### Minimal Production Setup (Docker)

**Quick deployment on a fresh server:**

```bash
# 1. Install Docker (if not installed)
# See INSTALLATION.md for detailed instructions
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and back in

# 2. Clone repository
git clone <explorer-repo-url>
cd explorer

# 3. Create minimal .env.production
cat > .env.production << EOF
NODE_ENV=production
PORT=4175
EXPLORER_STORES='[{"id":"local","name":"Local Store","baseUrl":"http://localhost:3000/api/explorer"}]'
EOF

# 4. Build and run
docker build -t explorer .
docker run -d \
  --name explorer \
  -p 4175:4175 \
  --env-file .env.production \
  --restart unless-stopped \
  explorer

# 5. Verify
curl http://localhost:4175/health
```

**That's it!** Explorer is now running. Access it at `http://your-server:4175`

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <explorer-repo-url>
cd explorer

# Install dependencies
npm install
```

### Step 2: Configure Environment

Create a `.env.production` file:

```bash
# Required
NODE_ENV=production
PORT=4175

# Store Configuration (JSON array)
EXPLORER_STORES='[
  {
    "id": "main",
    "name": "Main SljivaStore",
    "baseUrl": "https://store.example.com/api/explorer"
  }
]'

# Optional: Main store port (for local store default)
MAIN_STORE_PORT=3000
```

### Step 3: Build and Run

#### Option A: Docker (Recommended)

```bash
# Build the image
docker build -t explorer .

# Run the container
docker run -d \
  --name explorer \
  -p 4175:4175 \
  --env-file .env.production \
  --restart unless-stopped \
  explorer
```

#### Option B: Direct Node.js

```bash
# Build frontend
npm run build

# Start server
NODE_ENV=production npm run start:server
```

### Step 4: Verify Deployment

```bash
# Check health
curl http://localhost:4175/health

# Check stores
curl http://localhost:4175/api/explorer/stores

# Open in browser
# http://your-server:4175
```

### Step 5: Reverse Proxy (Nginx Example)

```nginx
server {
    listen 80;
    server_name explorer.example.com;

    location / {
        proxy_pass http://localhost:4175;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Adding a Store to Explorer

**Note:** Make sure you've enabled Explorer access on the store first (see [Enabling Explorer Access](#enabling-explorer-access-on-a-store)) so Explorer can query the API immediately after being added.

### Method 1: Using Helper Script (Easiest)

```bash
cd explorer
./scripts/add-store.sh <store-id> "<store-name>" <base-url> [public-key]
```

**Example:**
```bash
./scripts/add-store.sh main "Main SljivaStore" https://store.example.com/api/explorer
./scripts/add-store.sh secondary "Secondary Store" https://store2.example.com/api/explorer "public-key-here"
```

The script automatically:
- Ensures baseUrl ends with `/api/explorer`
- Updates `.env.production` (or `.env`)
- Preserves existing stores
- Replaces stores with the same ID

### Method 2: Automatic Discovery

If the store exposes `/.well-known/store-info`, you can discover and add it automatically:

```bash
cd explorer
./scripts/discover-store.sh https://store.example.com
```

This will:
1. Fetch store info from `/.well-known/store-info`
2. Extract store details (id, name, baseUrl, publicKey)
3. Automatically add it using `add-store.sh`

### Method 3: Environment Variable (Manual)

Update `EXPLORER_STORES` in your `.env.production`:

```bash
EXPLORER_STORES='[
  {
    "id": "main",
    "name": "Main SljivaStore",
    "baseUrl": "https://store1.example.com/api/explorer"
  },
  {
    "id": "secondary",
    "name": "Secondary Store",
    "baseUrl": "https://store2.example.com/api/explorer",
    "description": "Secondary production store"
  },
  {
    "id": "test",
    "name": "Test Store",
    "baseUrl": "https://test-store.example.com/api/explorer",
    "enabled": true
  }
]'
```

**Restart the Explorer server** after updating:

```bash
# Docker
docker restart explorer

# Direct Node.js
# Stop and restart the process
```

### Method 2: Using Store Discovery (Automatic)

If stores expose `/.well-known/store-info`, Explorer can discover them automatically (see [Store Discovery](#store-discovery)).

### Store Configuration Fields

- `id` (required) - Unique identifier for the store
- `name` (required) - Human-readable store name
- `baseUrl` (required) - Full URL to the store's Explorer API endpoint (must end with `/api/explorer`)
- `publicKey` (optional) - Public key for store verification
- `description` (optional) - Store description
- `enabled` (optional) - Whether the store is enabled (default: `true`)

---

## Enabling Explorer Access on a Store

**⚠️ Important: Enable Explorer access BEFORE adding the store to Explorer.**

This ensures Explorer can immediately query the store's API after being added. The discovery endpoint works without CORS, but the actual API routes require it.

To allow Explorer to query your SljivaStore backend, you need to:

### Step 1: Enable CORS for Explorer Routes

**Using Helper Script (Easiest):**

```bash
cd backend
./scripts/enable-explorer.sh https://explorer1.example.com https://explorer2.example.com
```

**Manual Configuration:**

Add to store's `.env.production`:

```bash
EXPLORER_ORIGINS=https://explorer1.example.com,https://explorer2.example.com
```

**Note:** CORS support for Explorer routes is already implemented in `server.js`. Just set the `EXPLORER_ORIGINS` environment variable and restart the server.

### Step 2: Expose Store Discovery Endpoint

Ensure `/.well-known/store-info` is accessible (should already be implemented).

### Step 3: Verify Explorer API Routes

The store should expose these routes:
- `GET /api/explorer/parts/:partHash`
- `GET /api/explorer/transactions/id/:txId`
- `GET /api/explorer/transactions/chain/:chainTx`
- `GET /api/explorer/partial-transactions/part/:partHash`
- `GET /api/explorer/partial-transactions/id/:txId`
- `GET /api/explorer/partial-transactions/chain/:chainTx`

### Step 4: Test Connection

From Explorer server, test the connection:

```bash
# Test store discovery
curl https://store.example.com/.well-known/store-info

# Test Explorer API
curl https://store.example.com/api/explorer/stores
```

---

## Store Discovery

### Automatic Store Discovery

Stores can expose a discovery endpoint at `/.well-known/store-info` that returns:

```json
{
  "id": "main",
  "name": "Main SljivaStore",
  "baseUrl": "https://store.example.com/api/explorer",
  "publicKey": "optional-key"
}
```

### Using Discovery in Explorer

You can manually add stores discovered via this endpoint, or implement automatic discovery (future feature).

**Manual discovery:**

```bash
# Get store info
curl https://store.example.com/.well-known/store-info

# Add to EXPLORER_STORES using the returned baseUrl
```

---

## Troubleshooting

### Explorer can't connect to store

1. **Check CORS**: Ensure `EXPLORER_ORIGINS` includes Explorer's origin
2. **Verify baseUrl**: Must end with `/api/explorer`
3. **Test connectivity**: `curl https://store.example.com/api/explorer/stores`
4. **Check firewall**: Ensure ports are accessible

### Store not appearing in Explorer

1. **Check JSON syntax**: `EXPLORER_STORES` must be valid JSON
2. **Restart Explorer**: Changes require server restart
3. **Check logs**: Look for store configuration errors
4. **Verify enabled**: Ensure `enabled: true` (or omit the field)

### 404 errors on Explorer API routes

1. **Verify routes exist**: Check store's `backend/routes/explorer.js`
2. **Check mounting**: Ensure router is mounted at `/api/explorer`
3. **Test directly**: `curl https://store.example.com/api/explorer/stores`

---

## Security Considerations

1. **CORS**: Only allow specific Explorer origins in production
2. **Rate Limiting**: Consider adding rate limits to Explorer API routes
3. **Authentication**: Explorer APIs are read-only, but consider IP whitelisting for sensitive stores
4. **HTTPS**: Always use HTTPS in production

---

## Quick Reference

### Environment Variables

**Explorer:**
- `NODE_ENV=production` - Production mode
- `PORT=4175` - External port
- `EXPLORER_STORES` - JSON array of stores
- `MAIN_STORE_PORT=3000` - Default local store port

**Store:**
- `EXPLORER_ORIGINS` - Comma-separated list of allowed Explorer origins
- `STORE_ID` - Store identifier
- `STORE_NAME` - Store display name
- `STORE_BASE_URL` - Store's base URL (for discovery)

### Common Commands

```bash
# Build Explorer
docker build -t explorer .

# Run Explorer
docker run -d -p 4175:4175 --env-file .env.production explorer

# Check Explorer health
curl http://localhost:4175/health

# List configured stores
curl http://localhost:4175/api/explorer/stores

# Test store connection
curl https://store.example.com/api/explorer/stores
```

