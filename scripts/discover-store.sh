#!/bin/bash
# Script to discover and add a store using /.well-known/store-info
# Usage: ./scripts/discover-store.sh <store-url>

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 <store-url>"
  echo ""
  echo "Example:"
  echo "  $0 https://store.example.com"
  exit 1
fi

STORE_URL="$1"
# Remove trailing slash
STORE_URL="${STORE_URL%/}"

echo "🔍 Discovering store at $STORE_URL..."

# Fetch store info
DISCOVERY_URL="${STORE_URL}/.well-known/store-info"
STORE_INFO=$(curl -s "$DISCOVERY_URL" || echo "")

if [ -z "$STORE_INFO" ]; then
  echo "❌ Failed to fetch store info from $DISCOVERY_URL"
  echo "   Make sure the store exposes /.well-known/store-info endpoint"
  exit 1
fi

# Extract store details
STORE_ID=$(echo "$STORE_INFO" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).id)")
STORE_NAME=$(echo "$STORE_INFO" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).name)")
BASE_URL=$(echo "$STORE_INFO" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).baseUrl)")
PUBLIC_KEY=$(echo "$STORE_INFO" | node -e "const d=JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(d.publicKey || '')")

if [ -z "$STORE_ID" ] || [ -z "$STORE_NAME" ] || [ -z "$BASE_URL" ]; then
  echo "❌ Invalid store info response:"
  echo "$STORE_INFO"
  exit 1
fi

echo "✅ Discovered store:"
echo "   ID: $STORE_ID"
echo "   Name: $STORE_NAME"
echo "   Base URL: $BASE_URL"
if [ -n "$PUBLIC_KEY" ]; then
  echo "   Public Key: $PUBLIC_KEY"
fi
echo ""

# Call add-store script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "$PUBLIC_KEY" ]; then
  "$SCRIPT_DIR/add-store.sh" "$STORE_ID" "$STORE_NAME" "$BASE_URL" "$PUBLIC_KEY"
else
  "$SCRIPT_DIR/add-store.sh" "$STORE_ID" "$STORE_NAME" "$BASE_URL"
fi

