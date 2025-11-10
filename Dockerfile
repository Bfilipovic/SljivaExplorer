#
# Multi-stage build for Explorer frontend
#

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

# Serve with a minimal Node static server
RUN npm install --global serve@14.2.0

COPY --from=build /app/dist ./dist

EXPOSE 4175

CMD ["serve", "-s", "dist", "-l", "4175"]

