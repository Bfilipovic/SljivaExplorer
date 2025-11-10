# Running Explorer

## Development (with main project)

1. Start the SljivaStore backend:
   ```bash
   cd ../backend
   npm run dev
   ```
2. Start the main SljivaStore frontend (optional, for parity testing):
   ```bash
   cd ../frontend
   npm run dev
   ```
3. Run the Explorer in dev mode from this directory:
   ```bash
   npm run dev
   ```
   - Explorer runs on `http://localhost:4175`
   - API requests are proxied to `http://localhost:3000/api/*`

## Production build

```bash
npm run build
npm run preview
```

## Docker

Build and run the Explorer container:

```bash
docker build -t sljivastore-explorer .
docker run -it --rm -p 4175:4175 sljivastore-explorer
```

The app will be available at `http://localhost:4175`.

