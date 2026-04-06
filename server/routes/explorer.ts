/**
 * Explorer API Routes
 * 
 * Aggregator routes that query one or more Nomin backends.
 */

import express from "express";
import { getStores, getStoreById } from "../config/stores.js";
import {
  queryStore,
  queryStores,
  STORE_REQUEST_TIMEOUT_HEAVY_MS,
} from "../utils/storeClient.js";

const router = express.Router();

// In-memory cache for store icons
interface IconCacheEntry {
  data: Buffer;
  contentType: string;
  timestamp: number;
}

const iconCache = new Map<string, IconCacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * GET /api/explorer/icon/:storeId
 * 
 * Proxy and cache store icons to avoid CORS issues.
 */
router.get("/icon/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = getStoreById(storeId);
    
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    if (!store.icon) {
      return res.status(404).json({ error: "Store has no icon configured" });
    }

    // Check cache first
    const cacheKey = storeId;
    const cached = iconCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours
      return res.send(cached.data);
    }

    // Fetch icon from store
    try {
      const iconResponse = await fetch(store.icon, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      // Handle success codes: 200 (OK), 304 (Not Modified)
      if (!iconResponse.ok && iconResponse.status !== 304) {
        const errorText = await iconResponse.text().catch(() => 'Unable to read error response');
        throw new Error(`Failed to fetch icon: ${iconResponse.status} - ${errorText}`);
      }
      
      // For 304, use cached version if available
      if (iconResponse.status === 304 && cached) {
        res.setHeader("Content-Type", cached.contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(cached.data);
      }

      const contentType = iconResponse.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await iconResponse.arrayBuffer());

      // Cache the icon
      iconCache.set(cacheKey, {
        data: buffer,
        contentType,
        timestamp: Date.now(),
      });

      // Set headers
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours
      res.setHeader("Access-Control-Allow-Origin", "*");

      res.send(buffer);
    } catch (fetchError) {
      console.error(`[Explorer API] Failed to fetch icon for store ${storeId} from ${store.icon}:`, fetchError);
      console.error(`[Explorer API] Fetch error details:`, fetchError instanceof Error ? fetchError.message : String(fetchError));
      
      // If we have a stale cache, use it
      if (cached) {
        res.setHeader("Content-Type", cached.contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(cached.data);
      }

      res.status(502).json({ 
        error: "Failed to fetch store icon",
        details: fetchError instanceof Error ? fetchError.message : String(fetchError),
        iconUrl: store.icon
      });
    }
  } catch (err) {
    console.error("[Explorer API] Error in /icon/:storeId:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * GET /api/explorer/stores
 * 
 * Get list of configured stores.
 */
router.get("/stores", (req, res) => {
  try {
    const stores = getStores();
    res.json(
      stores.map(store => {
        // Extract website URL from baseUrl
        // e.g., https://store.example.com/api/explorer -> www.store.example.com
        let website: string | undefined;
        let icon = store.icon;
        
        try {
          const url = new URL(store.baseUrl);
          const hostname = url.hostname;
          
          // For localhost, show as-is (e.g., localhost:3000)
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            website = url.port ? `${hostname}:${url.port}` : hostname;
            
            // Ensure localhost stores have a default icon if not set
            if (!icon) {
              const frontendPort = process.env.FRONTEND_PORT || '5173';
              icon = `http://localhost:${frontendPort}/sljiva_icon.png`;
            }
          } else {
            // For other domains, add www prefix
            website = hostname.startsWith('www.') 
              ? hostname 
              : `www.${hostname}`;
          }
        } catch {
          // If URL parsing fails, try regex fallback
          const match = store.baseUrl.match(/^https?:\/\/([^\/]+)/);
          if (match) {
            const fullHost = match[1];
            const [hostname, port] = fullHost.split(':');
            
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
              website = port ? `${hostname}:${port}` : hostname;
              
              // Ensure localhost stores have a default icon if not set
              if (!icon) {
                const frontendPort = process.env.FRONTEND_PORT || '5173';
                icon = `http://localhost:${frontendPort}/sljiva_icon.png`;
              }
            } else {
              website = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
            }
          }
        }
        
        // Return proxied icon URL if icon exists
        let iconUrl: string | null = null;
        if (icon) {
          iconUrl = `/api/explorer/icon/${store.id}`;
        }
        
        return {
          id: store.id,
          name: store.name,
          baseUrl: store.baseUrl,
          website: website,
          icon: iconUrl
        };
      })
    );
  } catch (err) {
    console.error("[Explorer API] Error in /stores:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * Helper to parse pagination query params.
 */
function parsePagination(query: express.Request["query"]) {
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit ?? "50"), 10) || 50));
  const page = Math.max(0, parseInt(String(query.page ?? "0"), 10) || 0);
  const skip = Math.max(0, parseInt(String(query.skip ?? String(page * limit)), 10) || page * limit);
  return { skip, limit, page };
}

/**
 * Add store metadata to a part object.
 */
function enrichPart(part: any, storeId: string, storeName: string) {
  return {
    ...part,
    storeId,
    storeName
  };
}

/**
 * Add store metadata to a transaction object.
 */
function enrichTransaction(transaction: any, storeId: string, storeName: string) {
  return {
    ...transaction,
    storeId,
    storeName
  };
}

/**
 * Add store metadata to partial transactions.
 */
function enrichPartialTransactions(
  partials: any[],
  storeId: string,
  storeName: string
) {
  return partials.map(p => ({
    ...p,
    storeId,
    storeName
  }));
}

/**
 * GET /api/explorer/parts/:partHash
 * 
 * Look up a part by hash across one or all stores.
 */
router.get("/parts/:partHash", async (req, res) => {
  try {
    const { partHash } = req.params;
    const { skip, limit } = parsePagination(req.query);
    const storeId = req.query.storeId as string | undefined;

    const queryParams = {
      skip: String(skip),
      limit: String(limit)
    };

    if (storeId) {
      // Query single store
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        part: any;
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number };
      }>(store, `/parts/${encodeURIComponent(partHash)}`, queryParams);

      if (response.error) {
        return res.status(502).json({
          error: `Store '${storeId}' error: ${response.error}`,
          storeId: response.storeId,
          storeName: response.storeName
        });
      }

      if (!response.data) {
        return res.status(404).json({ error: "Part not found" });
      }

      const { part, partialTransactions, pagination } = response.data;

      // Fetch NFT metadata from the store
      let nft = null;
      if (part?.parent_hash) {
        try {
          const nftBaseUrl = store.baseUrl.replace("/api/explorer", "");
          const nftResponse = await fetch(`${nftBaseUrl}/api/nfts/${encodeURIComponent(part.parent_hash)}`, {
            headers: { Accept: "application/json" }
          });
          if (nftResponse.ok) {
            nft = await nftResponse.json();
          }
        } catch (err) {
          console.warn(`[Explorer API] Failed to fetch NFT metadata for ${part.parent_hash}:`, err);
        }
      }

      res.json({
        part: enrichPart(part, response.storeId, response.storeName),
        nft,
        partialTransactions: enrichPartialTransactions(
          partialTransactions,
          response.storeId,
          response.storeName
        ),
        pagination: pagination ?? {
          total: partialTransactions.length,
          skip,
          limit
        }
      });
    } else {
      // Query all stores in parallel
      const stores = getStores();
      if (stores.length === 0) {
        return res.status(500).json({ error: "No stores configured" });
      }

      const responses = await queryStores<{
        part: any;
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number };
      }>(stores, `/parts/${encodeURIComponent(partHash)}`, queryParams);

      const results: any[] = [];
      const errors: Array<{ storeId: string; storeName: string; error: string }> = [];

      for (const response of responses) {
        if (response.error) {
          errors.push({
            storeId: response.storeId,
            storeName: response.storeName,
            error: response.error
          });
          continue;
        }

        if (response.data) {
          const { part, partialTransactions, pagination } = response.data;
          
          // Fetch NFT metadata from the store
          let nft = null;
          if (part?.parent_hash) {
            try {
              const store = getStoreById(response.storeId);
              if (store) {
                const nftBaseUrl = store.baseUrl.replace("/api/explorer", "");
                const nftResponse = await fetch(`${nftBaseUrl}/api/nfts/${encodeURIComponent(part.parent_hash)}`, {
                  headers: { Accept: "application/json" }
                });
                if (nftResponse.ok) {
                  nft = await nftResponse.json();
                }
              }
            } catch (err) {
              console.warn(`[Explorer API] Failed to fetch NFT metadata for ${part.parent_hash}:`, err);
            }
          }
          
          results.push({
            part: enrichPart(part, response.storeId, response.storeName),
            nft,
            partialTransactions: enrichPartialTransactions(
              partialTransactions,
              response.storeId,
              response.storeName
            ),
            pagination: pagination ?? {
              total: partialTransactions.length,
              skip,
              limit
            }
          });
        }
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "Part not found in any store",
          errors: errors.length > 0 ? errors : undefined
        });
      }

      // If multiple results, merge them (for now, return first successful result)
      // In future, could aggregate/merge results from multiple stores
      const firstResult = results[0];
      const allPartials = results.flatMap(r => r.partialTransactions);

      res.json({
        part: firstResult.part,
        nft: firstResult.nft,
        partialTransactions: allPartials,
        pagination: {
          total: allPartials.length,
          skip,
          limit
        },
        ...(errors.length > 0 && { errors })
      });
    }
  } catch (err) {
    console.error("[Explorer API] Error in /parts/:partHash:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * GET /api/explorer/transactions/lookup?q=
 *
 * Resolves transaction via store indexes only (id → Arweave → chain). No parts.
 */
router.get("/transactions/lookup", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      return res.status(400).json({ error: "Missing q parameter" });
    }
    const storeId = req.query.storeId as string | undefined;
    const queryParams: Record<string, string> = { q };
    if (storeId) queryParams.storeId = storeId;

    if (storeId) {
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        transaction: any;
        matchedBy: string;
      }>(store, `/transactions/lookup`, queryParams);

      if (response.error) {
        return res.status(502).json({
          error: `Store '${storeId}' error: ${response.error}`,
          storeId: response.storeId,
          storeName: response.storeName
        });
      }

      if (!response.data?.transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      let nft = null;
      const transaction = response.data.transaction;
      if (transaction?.nftId) {
        try {
          const nftBaseUrl = store.baseUrl.replace("/api/explorer", "");
          const nftResponse = await fetch(`${nftBaseUrl}/api/nfts/${encodeURIComponent(transaction.nftId)}`, {
            headers: { Accept: "application/json" }
          });
          if (nftResponse.ok) {
            nft = await nftResponse.json();
          }
        } catch (err) {
          console.warn(`[Explorer API] Failed to fetch NFT metadata for ${transaction.nftId}:`, err);
        }
      }

      return res.json({
        transaction: enrichTransaction(transaction, response.storeId, response.storeName),
        matchedBy: response.data.matchedBy,
        nft
      });
    }

    const stores = getStores();
    if (stores.length === 0) {
      return res.status(500).json({ error: "No stores configured" });
    }

    const responses = await queryStores<{
      transaction: any;
      matchedBy: string;
    }>(stores, `/transactions/lookup`, queryParams);

    const errors: Array<{ storeId: string; storeName: string; error: string }> = [];

    for (const response of responses) {
      if (response.error) {
        errors.push({
          storeId: response.storeId,
          storeName: response.storeName,
          error: response.error
        });
        continue;
      }
      if (response.data?.transaction) {
        const transaction = response.data.transaction;
        let nft = null;
        const store = getStoreById(response.storeId);
        if (store && transaction?.nftId) {
          try {
            const nftBaseUrl = store.baseUrl.replace("/api/explorer", "");
            const nftResponse = await fetch(`${nftBaseUrl}/api/nfts/${encodeURIComponent(transaction.nftId)}`, {
              headers: { Accept: "application/json" }
            });
            if (nftResponse.ok) {
              nft = await nftResponse.json();
            }
          } catch (err) {
            console.warn(`[Explorer API] Failed to fetch NFT metadata for ${transaction.nftId}:`, err);
          }
        }
        return res.json({
          transaction: enrichTransaction(transaction, response.storeId, response.storeName),
          matchedBy: response.data.matchedBy,
          nft,
          ...(errors.length > 0 && { errors })
        });
      }
    }

    return res.status(404).json({
      error: "Transaction not found in any store",
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("[Explorer API] Error in /transactions/lookup:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * GET /api/explorer/transactions/id/:txId/parts
 */
router.get("/transactions/id/:txId/parts", async (req, res) => {
  try {
    const { txId } = req.params;
    const { skip, limit } = parsePagination(req.query);
    const storeId = req.query.storeId as string | undefined;

    const queryParams: Record<string, string> = {
      skip: String(skip),
      limit: String(limit)
    };
    if (storeId) queryParams.storeId = storeId;

    const stores = getStores();
    if (stores.length === 0) {
      return res.status(500).json({ error: "No stores configured" });
    }

    const storeFromParam = storeId ? getStoreById(storeId) : undefined;
    if (storeId && !storeFromParam) {
      return res.status(404).json({ error: `Store '${storeId}' not found` });
    }

    // One backend: always use a single queryStore (no "any store" messaging, same path as ?storeId=…).
    const loneStore = storeFromParam ?? (stores.length === 1 ? stores[0] : undefined);

    if (loneStore) {
      const response = await queryStore<{
        parts: any[];
        pagination: { total: number; skip: number; limit: number };
        note?: string;
      }>(loneStore, `/transactions/id/${encodeURIComponent(txId)}/parts`, queryParams, {
        timeout: STORE_REQUEST_TIMEOUT_HEAVY_MS,
      });

      if (response.error) {
        return res.status(502).json({
          error: `Store '${loneStore.id}' error: ${response.error}`,
          storeId: response.storeId,
          storeName: response.storeName
        });
      }

      if (!response.data) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const { parts = [], pagination, note } = response.data;
      return res.json({
        parts: parts.map((part: any) => enrichPart(part, response.storeId, response.storeName)),
        pagination,
        ...(note && { note })
      });
    }

    const responses = await queryStores<{
      parts: any[];
      pagination: { total: number; skip: number; limit: number };
      note?: string;
    }>(stores, `/transactions/id/${encodeURIComponent(txId)}/parts`, queryParams, {
      timeout: STORE_REQUEST_TIMEOUT_HEAVY_MS,
    });

    const errors: Array<{ storeId: string; storeName: string; error: string }> = [];
    const successes: typeof responses = [];

    for (const response of responses) {
      if (response.error) {
        errors.push({
          storeId: response.storeId,
          storeName: response.storeName,
          error: response.error
        });
        continue;
      }

      if (!response.data) {
        continue;
      }
      const rawParts = response.data.parts;
      if (rawParts !== undefined && !Array.isArray(rawParts)) {
        continue;
      }
      successes.push(response);
    }

    // Prefer a body that actually has rows; otherwise first successful JSON (even total 0).
    const withRows = successes.filter((r) => {
      const partsLen = r.data?.parts?.length ?? 0;
      const total = r.data?.pagination?.total ?? 0;
      return partsLen > 0 || total > 0;
    });
    const chosen = withRows[0] ?? successes[0];

    if (chosen?.data) {
      const parts = Array.isArray(chosen.data.parts) ? chosen.data.parts : [];
      const { pagination, note } = chosen.data;
      return res.json({
        parts: parts.map((part: any) => enrichPart(part, chosen.storeId, chosen.storeName)),
        pagination,
        ...(note && { note }),
        ...(errors.length > 0 && { errors })
      });
    }

    return res.status(404).json({
      error:
        errors.length > 0
          ? `Could not load transaction parts. Store errors: ${errors.map((e) => `${e.storeId}: ${e.error}`).join("; ")}`
          : "Transaction not found in any store",
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("[Explorer API] Error in /transactions/id/:txId/parts:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * GET /api/explorer/transactions/id/:txId
 *
 * Transaction document only (no parts query on the store).
 */
router.get("/transactions/id/:txId", async (req, res) => {
  try {
    const { txId } = req.params;
    const storeId = req.query.storeId as string | undefined;
    const queryParams: Record<string, string> = {};
    if (storeId) queryParams.storeId = storeId;

    if (storeId) {
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        transaction: any;
        parts?: any[];
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number } | null;
      }>(store, `/transactions/id/${encodeURIComponent(txId)}`, queryParams);

      if (response.error) {
        return res.status(502).json({
          error: `Store '${storeId}' error: ${response.error}`,
          storeId: response.storeId,
          storeName: response.storeName
        });
      }

      if (!response.data) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const { transaction, parts = [], partialTransactions, pagination } = response.data;

      let nft = null;
      if (transaction?.nftId) {
        try {
          const nftBaseUrl = store.baseUrl.replace("/api/explorer", "");
          const nftResponse = await fetch(`${nftBaseUrl}/api/nfts/${encodeURIComponent(transaction.nftId)}`, {
            headers: { Accept: "application/json" }
          });
          if (nftResponse.ok) {
            nft = await nftResponse.json();
          }
        } catch (err) {
          console.warn(`[Explorer API] Failed to fetch NFT metadata for ${transaction.nftId}:`, err);
        }
      }

      return res.json({
        transaction: enrichTransaction(transaction, response.storeId, response.storeName),
        parts: parts.map((part: any) => enrichPart(part, response.storeId, response.storeName)),
        nft,
        partialTransactions: [],
        pagination: pagination ?? null
      });
    }

    const stores = getStores();
    if (stores.length === 0) {
      return res.status(500).json({ error: "No stores configured" });
    }

    const responses = await queryStores<{
      transaction: any;
      parts?: any[];
      partialTransactions: any[];
      pagination?: { total: number; skip: number; limit: number } | null;
    }>(stores, `/transactions/id/${encodeURIComponent(txId)}`, queryParams);

    const results: any[] = [];
    const errors: Array<{ storeId: string; storeName: string; error: string }> = [];

    for (const response of responses) {
      if (response.error) {
        errors.push({
          storeId: response.storeId,
          storeName: response.storeName,
          error: response.error
        });
        continue;
      }

      if (response.data) {
        const { transaction, parts = [], pagination } = response.data;

        let nft = null;
        if (transaction?.nftId) {
          try {
            const store = getStoreById(response.storeId);
            if (store) {
              const nftBaseUrl = store.baseUrl.replace("/api/explorer", "");
              const nftResponse = await fetch(`${nftBaseUrl}/api/nfts/${encodeURIComponent(transaction.nftId)}`, {
                headers: { Accept: "application/json" }
              });
              if (nftResponse.ok) {
                nft = await nftResponse.json();
              }
            }
          } catch (err) {
            console.warn(`[Explorer API] Failed to fetch NFT metadata for ${transaction.nftId}:`, err);
          }
        }

        results.push({
          transaction: enrichTransaction(transaction, response.storeId, response.storeName),
          parts: parts.map((part: any) => enrichPart(part, response.storeId, response.storeName)),
          nft,
          partialTransactions: [],
          pagination: pagination ?? null
        });
      }
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: "Transaction not found in any store",
        errors: errors.length > 0 ? errors : undefined
      });
    }

    const firstResult = results[0];
    return res.json({
      ...firstResult,
      ...(errors.length > 0 && { errors })
    });
  } catch (err) {
    console.error("[Explorer API] Error in /transactions/id/:txId:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * GET /api/explorer/transactions/chain/:chainTx
 * 
 * Look up a transaction by chain hash.
 */
router.get("/transactions/chain/:chainTx", async (req, res) => {
  try {
    const { chainTx } = req.params;
    const storeId = req.query.storeId as string | undefined;

    const queryParams: Record<string, string> = {};
    if (storeId) queryParams.storeId = storeId;

    if (storeId) {
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        transaction: any;
        parts?: any[];
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number } | null;
      }>(store, `/transactions/chain/${encodeURIComponent(chainTx)}`, queryParams);

      if (response.error) {
        return res.status(502).json({
          error: `Store '${storeId}' error: ${response.error}`,
          storeId: response.storeId,
          storeName: response.storeName
        });
      }

      if (!response.data) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const { transaction, parts = [], partialTransactions, pagination } = response.data;

      // Fetch NFT metadata from the store
      let nft = null;
      if (transaction?.nftId) {
        try {
          const nftBaseUrl = store.baseUrl.replace("/api/explorer", "");
          const nftResponse = await fetch(`${nftBaseUrl}/api/nfts/${encodeURIComponent(transaction.nftId)}`, {
            headers: { Accept: "application/json" }
          });
          if (nftResponse.ok) {
            nft = await nftResponse.json();
          }
        } catch (err) {
          console.warn(`[Explorer API] Failed to fetch NFT metadata for ${transaction.nftId}:`, err);
        }
      }

      res.json({
        transaction: enrichTransaction(transaction, response.storeId, response.storeName),
        parts: parts.map((part: any) => enrichPart(part, response.storeId, response.storeName)),
        nft,
        partialTransactions: [],
        pagination: pagination ?? null
      });
    } else {
      const stores = getStores();
      if (stores.length === 0) {
        return res.status(500).json({ error: "No stores configured" });
      }

      const responses = await queryStores<{
        transaction: any;
        parts?: any[];
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number } | null;
      }>(stores, `/transactions/chain/${encodeURIComponent(chainTx)}`, queryParams);

      const results: any[] = [];
      const errors: Array<{ storeId: string; storeName: string; error: string }> = [];

      for (const response of responses) {
        if (response.error) {
          errors.push({
            storeId: response.storeId,
            storeName: response.storeName,
            error: response.error
          });
          continue;
        }

        if (response.data) {
          const { transaction, parts = [], pagination } = response.data;
          
          // Fetch NFT metadata from the store
          let nft = null;
          if (transaction?.nftId) {
            try {
              const store = getStoreById(response.storeId);
              if (store) {
                const nftBaseUrl = store.baseUrl.replace("/api/explorer", "");
                const nftResponse = await fetch(`${nftBaseUrl}/api/nfts/${encodeURIComponent(transaction.nftId)}`, {
                  headers: { Accept: "application/json" }
                });
                if (nftResponse.ok) {
                  nft = await nftResponse.json();
                }
              }
            } catch (err) {
              console.warn(`[Explorer API] Failed to fetch NFT metadata for ${transaction.nftId}:`, err);
            }
          }
          
          results.push({
            transaction: enrichTransaction(transaction, response.storeId, response.storeName),
            parts: parts.map((part: any) => enrichPart(part, response.storeId, response.storeName)),
            nft,
            partialTransactions: [],
            pagination: pagination ?? null
          });
        }
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "Transaction not found in any store",
          errors: errors.length > 0 ? errors : undefined
        });
      }

      const firstResult = results[0];
      res.json({
        ...firstResult,
        ...(errors.length > 0 && { errors })
      });
    }
  } catch (err) {
    console.error("[Explorer API] Error in /transactions/chain/:chainTx:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * GET /api/explorer/partial-transactions/part/:partHash
 * 
 * Fetch partial transactions for a part.
 */
router.get("/partial-transactions/part/:partHash", async (req, res) => {
  try {
    const { partHash } = req.params;
    const { skip, limit } = parsePagination(req.query);
    const storeId = req.query.storeId as string | undefined;

    const queryParams = {
      skip: String(skip),
      limit: String(limit)
    };

    if (storeId) {
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number };
      }>(store, `/partial-transactions/part/${encodeURIComponent(partHash)}`, queryParams);

      if (response.error) {
        return res.status(502).json({
          error: `Store '${storeId}' error: ${response.error}`,
          storeId: response.storeId,
          storeName: response.storeName
        });
      }

      if (!response.data) {
        return res.status(404).json({ error: "Partial transactions not found" });
      }

      const { partialTransactions, pagination } = response.data;

      res.json({
        partialTransactions: enrichPartialTransactions(
          partialTransactions,
          response.storeId,
          response.storeName
        ),
        pagination: pagination ?? {
          total: partialTransactions.length,
          skip,
          limit
        }
      });
    } else {
      const stores = getStores();
      if (stores.length === 0) {
        return res.status(500).json({ error: "No stores configured" });
      }

      const responses = await queryStores<{
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number };
      }>(stores, `/partial-transactions/part/${encodeURIComponent(partHash)}`, queryParams);

      const allPartials: any[] = [];
      const errors: Array<{ storeId: string; storeName: string; error: string }> = [];

      for (const response of responses) {
        if (response.error) {
          errors.push({
            storeId: response.storeId,
            storeName: response.storeName,
            error: response.error
          });
          continue;
        }

        if (response.data) {
          const { partialTransactions } = response.data;
          allPartials.push(
            ...enrichPartialTransactions(
              partialTransactions,
              response.storeId,
              response.storeName
            )
          );
        }
      }

      res.json({
        partialTransactions: allPartials,
        pagination: {
          total: allPartials.length,
          skip,
          limit
        },
        ...(errors.length > 0 && { errors })
      });
    }
  } catch (err) {
    console.error("[Explorer API] Error in /partial-transactions/part/:partHash:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * GET /api/explorer/partial-transactions/id/:txId
 * 
 * Fetch partial transactions for a transaction ID.
 */
router.get("/partial-transactions/id/:txId", async (req, res) => {
  try {
    const { txId } = req.params;
    const { skip, limit } = parsePagination(req.query);
    const storeId = req.query.storeId as string | undefined;

    const queryParams = {
      skip: String(skip),
      limit: String(limit)
    };

    if (storeId) {
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number };
      }>(store, `/partial-transactions/id/${encodeURIComponent(txId)}`, queryParams);

      if (response.error) {
        return res.status(502).json({
          error: `Store '${storeId}' error: ${response.error}`,
          storeId: response.storeId,
          storeName: response.storeName
        });
      }

      if (!response.data) {
        return res.status(404).json({ error: "Partial transactions not found" });
      }

      const { partialTransactions, pagination } = response.data;

      res.json({
        partialTransactions: enrichPartialTransactions(
          partialTransactions,
          response.storeId,
          response.storeName
        ),
        pagination: pagination ?? {
          total: partialTransactions.length,
          skip,
          limit
        }
      });
    } else {
      const stores = getStores();
      if (stores.length === 0) {
        return res.status(500).json({ error: "No stores configured" });
      }

      const responses = await queryStores<{
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number };
      }>(stores, `/partial-transactions/id/${encodeURIComponent(txId)}`, queryParams);

      const allPartials: any[] = [];
      const errors: Array<{ storeId: string; storeName: string; error: string }> = [];

      for (const response of responses) {
        if (response.error) {
          errors.push({
            storeId: response.storeId,
            storeName: response.storeName,
            error: response.error
          });
          continue;
        }

        if (response.data) {
          const { partialTransactions } = response.data;
          allPartials.push(
            ...enrichPartialTransactions(
              partialTransactions,
              response.storeId,
              response.storeName
            )
          );
        }
      }

      res.json({
        partialTransactions: allPartials,
        pagination: {
          total: allPartials.length,
          skip,
          limit
        },
        ...(errors.length > 0 && { errors })
      });
    }
  } catch (err) {
    console.error("[Explorer API] Error in /partial-transactions/id/:txId:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

/**
 * GET /api/explorer/partial-transactions/chain/:chainTx
 * 
 * Fetch partial transactions for a chain transaction hash.
 */
router.get("/partial-transactions/chain/:chainTx", async (req, res) => {
  try {
    const { chainTx } = req.params;
    const { skip, limit } = parsePagination(req.query);
    const storeId = req.query.storeId as string | undefined;

    const queryParams = {
      skip: String(skip),
      limit: String(limit)
    };

    if (storeId) {
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number };
      }>(store, `/partial-transactions/chain/${encodeURIComponent(chainTx)}`, queryParams);

      if (response.error) {
        return res.status(502).json({
          error: `Store '${storeId}' error: ${response.error}`,
          storeId: response.storeId,
          storeName: response.storeName
        });
      }

      if (!response.data) {
        return res.status(404).json({ error: "Partial transactions not found" });
      }

      const { partialTransactions, pagination } = response.data;

      res.json({
        partialTransactions: enrichPartialTransactions(
          partialTransactions,
          response.storeId,
          response.storeName
        ),
        pagination: pagination ?? {
          total: partialTransactions.length,
          skip,
          limit
        }
      });
    } else {
      const stores = getStores();
      if (stores.length === 0) {
        return res.status(500).json({ error: "No stores configured" });
      }

      const responses = await queryStores<{
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number };
      }>(stores, `/partial-transactions/chain/${encodeURIComponent(chainTx)}`, queryParams);

      const allPartials: any[] = [];
      const errors: Array<{ storeId: string; storeName: string; error: string }> = [];

      for (const response of responses) {
        if (response.error) {
          errors.push({
            storeId: response.storeId,
            storeName: response.storeName,
            error: response.error
          });
          continue;
        }

        if (response.data) {
          const { partialTransactions } = response.data;
          allPartials.push(
            ...enrichPartialTransactions(
              partialTransactions,
              response.storeId,
              response.storeName
            )
          );
        }
      }

      res.json({
        partialTransactions: allPartials,
        pagination: {
          total: allPartials.length,
          skip,
          limit
        },
        ...(errors.length > 0 && { errors })
      });
    }
  } catch (err) {
    console.error("[Explorer API] Error in /partial-transactions/chain/:chainTx:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error"
    });
  }
});

export default router;

