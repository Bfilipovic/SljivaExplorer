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

# Fetch store info with error handling
DISCOVERY_URL="${STORE_URL}/.well-known/store-info"

# Check if endpoint exists and returns JSON
HTTP_CODE=$(curl -s -o /tmp/store-info-response.txt -w "%{http_code}" "$DISCOVERY_URL" || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Failed to fetch store info from $DISCOVERY_URL"
  echo "   HTTP Status: $HTTP_CODE"
  if [ "$HTTP_CODE" = "404" ]; then
    echo "   The endpoint does not exist. The store may not have discovery enabled."
    echo "   You can manually add the store using: ./scripts/add-store.sh"
  elif [ "$HTTP_CODE" = "000" ]; then
    echo "   Network error - could not connect to the server."
  else
    echo "   Response preview:"
    head -n 3 /tmp/store-info-response.txt 2>/dev/null || echo "   (no response body)"
  fi
  rm -f /tmp/store-info-response.txt
  exit 1
fi

STORE_INFO=$(cat /tmp/store-info-response.txt)
rm -f /tmp/store-info-response.txt

# Validate that response is JSON
if ! echo "$STORE_INFO" | node -e "
  try {
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    if (typeof data !== 'object' || data === null) {
      process.exit(1);
    }
  } catch (e) {
    console.error('Invalid JSON response. The endpoint may be returning HTML or an error page.');
    process.exit(1);
  }
" 2>/dev/null; then
  echo "❌ Invalid response from $DISCOVERY_URL"
  echo "   Expected JSON but received:"
  echo "$STORE_INFO" | head -n 5
  echo ""
  echo "   The endpoint may not be properly configured or may be returning an error page."
  echo "   You can manually add the store using: ./scripts/add-store.sh"
  exit 1
fi

# Extract store details with error handling
STORE_ID=$(echo "$STORE_INFO" | node -e "
  try {
    const d = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(d.id || '');
  } catch (e) {
    process.exit(1);
  }
" 2>/dev/null || echo "")

STORE_NAME=$(echo "$STORE_INFO" | node -e "
  try {
    const d = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(d.name || '');
  } catch (e) {
    process.exit(1);
  }
" 2>/dev/null || echo "")

BASE_URL=$(echo "$STORE_INFO" | node -e "
  try {
    const d = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(d.baseUrl || '');
  } catch (e) {
    process.exit(1);
  }
" 2>/dev/null || echo "")

PUBLIC_KEY=$(echo "$STORE_INFO" | node -e "
  try {
    const d = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(d.publicKey || '');
  } catch (e) {
    console.log('');
  }
" 2>/dev/null || echo "")

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

