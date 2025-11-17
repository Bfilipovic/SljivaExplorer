import express from "express";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { initializeStores } from "./config/stores.js";
import explorerRouter from "./routes/explorer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
config({ path: join(__dirname, "..", envFile) });

// Initialize store configuration
initializeStores();

const app = express();
// Use PORT for external traffic (serves both API and static files in production)
// In production, PORT is the external port, and backend serves both API and static files
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.EXPLORER_API_PORT ? parseInt(process.env.EXPLORER_API_PORT, 10) : 4175);
const NODE_ENV = process.env.NODE_ENV || "development";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for development
if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "explorer-api" });
});

// Explorer API routes
app.use("/api/explorer", explorerRouter);

// Serve static files from dist/ in production
if (NODE_ENV === "production") {
  const distPath = resolve(__dirname, "..", "dist");
  app.use(express.static(distPath));
  
  // SPA fallback: serve index.html for all non-API routes
  app.get("*", (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(resolve(distPath, "index.html"));
  });
} else {
  // Development: 404 handler for non-API routes
  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "Not found" });
    } else {
      res.status(404).json({ error: "Not found (dev mode - use Vite dev server)" });
    }
  });
}

// Error handling (must be last)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Explorer API] Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("=".repeat(50));
  console.log("🔍 Explorer Server");
  console.log("=".repeat(50));
  console.log(`📍 Listening on: http://0.0.0.0:${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔗 API base path: /api/explorer`);
  if (NODE_ENV === "production") {
    console.log(`📦 Serving static files from: ${resolve(__dirname, "..", "dist")}`);
  }
  console.log("=".repeat(50));
});

