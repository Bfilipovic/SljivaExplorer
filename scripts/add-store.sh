#!/bin/bash
# Script to add a store to Explorer configuration
# Usage: ./scripts/add-store.sh <store-id> <store-name> <base-url> [public-key]

set -e

if [ $# -lt 3 ]; then
  echo "Usage: $0 <store-id> <store-name> <base-url> [public-key]"
  echo ""
  echo "Example:"
  echo "  $0 main \"Main Store\" https://store.example.com/api/explorer"
  exit 1
fi

STORE_ID="$1"
STORE_NAME="$2"
BASE_URL="$3"
PUBLIC_KEY="${4:-}"

# Ensure baseUrl ends with /api/explorer
if [[ ! "$BASE_URL" =~ /api/explorer$ ]]; then
  BASE_URL="${BASE_URL%/}/api/explorer"
fi

# Read current EXPLORER_STORES from .env.production or .env
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Creating $ENV_FILE..."
  touch "$ENV_FILE"
fi

# Extract current stores or use empty array (strip surrounding single or double quotes)
CURRENT_STORES=$(grep "^EXPLORER_STORES=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || echo '[]')

# Validate JSON or default to empty array
if [ -z "$CURRENT_STORES" ] || [ "$CURRENT_STORES" = "" ]; then
  CURRENT_STORES='[]'
fi

# Create temp file for JSON processing
TEMP_JSON=$(mktemp)
echo "$CURRENT_STORES" > "$TEMP_JSON"

# Validate JSON before parsing
if ! node -e "JSON.parse(require('fs').readFileSync('$TEMP_JSON', 'utf-8'))" 2>/dev/null; then
  echo "⚠️  Invalid JSON in EXPLORER_STORES, resetting to empty array"
  echo '[]' > "$TEMP_JSON"
fi

# Parse JSON and add new store
NEW_STORES=$(node -e "
  const fs = require('fs');
  const stores = JSON.parse(fs.readFileSync('$TEMP_JSON', 'utf-8'));
  const newStore = {
    id: '$STORE_ID',
    name: '$STORE_NAME',
    baseUrl: '$BASE_URL'
  };
  if ('$PUBLIC_KEY') {
    newStore.publicKey = '$PUBLIC_KEY';
  }
  
  // Remove existing store with same ID if present
  const filtered = stores.filter(s => s.id !== '$STORE_ID');
  filtered.push(newStore);
  console.log(JSON.stringify(filtered));
")

rm -f "$TEMP_JSON"

# Escape double quotes for .env: value written as EXPLORER_STORES="[...]" so
# env loaders pass raw JSON (no outer quotes), avoiding JSON parse errors in Node.
NEW_STORES_ESCAPED=$(echo "$NEW_STORES" | sed 's/"/\\"/g')

# Update .env file
if grep -q "^EXPLORER_STORES=" "$ENV_FILE"; then
  # Update existing line
  sed -i "s|^EXPLORER_STORES=.*|EXPLORER_STORES=\"$NEW_STORES_ESCAPED\"|" "$ENV_FILE"
else
  # Add new line
  echo "EXPLORER_STORES=\"$NEW_STORES_ESCAPED\"" >> "$ENV_FILE"
fi

echo "✅ Store '$STORE_ID' added successfully!"
echo ""
echo "Updated configuration:"
echo "$NEW_STORES" | node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(0, 'utf-8')), null, 2))"
echo ""
echo "⚠️  Restart Explorer server for changes to take effect:"
echo "   docker restart explorer"
echo "   # or"
echo "   # Stop and restart your Node.js process"

