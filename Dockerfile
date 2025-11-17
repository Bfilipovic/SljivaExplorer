#
# Multi-stage build for Explorer (frontend + backend)
#
# Stage 1: Build Svelte frontend
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

# Copy source files and build frontend
COPY . .
RUN npm run build

# Stage 2: Runtime with backend and static files
FROM node:20-alpine AS runtime

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --frozen-lockfile

# Copy built frontend from build stage
COPY --from=build /app/dist ./dist

# Copy backend server files
COPY server ./server
COPY tsconfig.json ./

# Install tsx for running TypeScript in production and curl for healthcheck
RUN npm install --global tsx@latest && \
    apk add --no-cache curl

# Environment variables documentation:
# - PORT: External port for serving both API and frontend (default: 4175)
# - EXPLORER_API_PORT: Internal backend port (default: 4176, only used if PORT not set)
# - EXPLORER_STORES: JSON array of store configurations (optional, defaults to local store)
# - NODE_ENV: Set to "production" for production mode
# - MAIN_STORE_PORT: Port of main SljivaStore backend (default: 3000, for local store default)
#
# Example EXPLORER_STORES:
# [{"id":"main","name":"Main SljivaStore","baseUrl":"https://store1.example.com/api/explorer"}]

EXPOSE 4175

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4175/health || exit 1

# Start backend server (serves both API and static files in production)
CMD ["tsx", "server/index.ts"]

