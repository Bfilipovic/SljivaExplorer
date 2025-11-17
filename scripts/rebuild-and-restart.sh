#!/bin/bash
# Script to rebuild and restart the Explorer container
# Works whether the container is already running or not

set -e

echo "🔄 Rebuilding and restarting Explorer..."

# Navigate to Explorer directory
cd "$(dirname "$0")/.." || exit 1

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main || echo "⚠️  Git pull failed or not a git repo, continuing..."

# Stop container if it exists (ignore errors if it doesn't)
echo "🛑 Stopping existing container (if running)..."
sudo docker stop explorer 2>/dev/null || echo "   Container not running, skipping stop"

# Remove container if it exists (ignore errors if it doesn't)
echo "🗑️  Removing existing container (if exists)..."
sudo docker rm explorer 2>/dev/null || echo "   Container doesn't exist, skipping remove"

# Build the Docker image
echo "🔨 Building Docker image..."
sudo docker build -t explorer .

# Start the new container
echo "🚀 Starting new container..."
sudo docker run -d \
  --name explorer \
  -p 4175:4175 \
  --env-file .env.production \
  --restart unless-stopped \
  explorer

# Wait a moment for container to start
sleep 2

# Show logs
echo ""
echo "📋 Recent logs:"
echo "=========================================="
sudo docker logs explorer | tail -20

echo ""
echo "✅ Explorer rebuilt and restarted!"
echo ""
echo "To view full logs: sudo docker logs explorer"
echo "To follow logs:    sudo docker logs -f explorer"

