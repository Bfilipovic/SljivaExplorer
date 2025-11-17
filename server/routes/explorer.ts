/**
 * Explorer API Routes
 * 
 * Aggregator routes that query one or more SljivaStore backends.
 */

import express from "express";
import { getStores, getStoreById } from "../config/stores.js";
import { queryStore, queryStores } from "../utils/storeClient.js";

const router = express.Router();

/**
 * GET /api/explorer/stores
 * 
 * Get list of configured stores.
 */
router.get("/stores", (req, res) => {
  try {
    const stores = getStores();
    res.json(
      stores.map(store => ({
        id: store.id,
        name: store.name
      }))
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
 * GET /api/explorer/transactions/id/:txId
 * 
 * Look up a transaction by database ID.
 */
router.get("/transactions/id/:txId", async (req, res) => {
  try {
    const { txId } = req.params;
    const storeId = req.query.storeId as string | undefined;

    if (storeId) {
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        transaction: any;
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number } | null;
      }>(store, `/transactions/id/${encodeURIComponent(txId)}`);

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

      const { transaction, partialTransactions, pagination } = response.data;

      res.json({
        transaction: enrichTransaction(transaction, response.storeId, response.storeName),
        partialTransactions: [],
        pagination: null
      });
    } else {
      const stores = getStores();
      if (stores.length === 0) {
        return res.status(500).json({ error: "No stores configured" });
      }

      const responses = await queryStores<{
        transaction: any;
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number } | null;
      }>(stores, `/transactions/id/${encodeURIComponent(txId)}`);

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
          const { transaction } = response.data;
          results.push({
            transaction: enrichTransaction(transaction, response.storeId, response.storeName),
            partialTransactions: [],
            pagination: null
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

    if (storeId) {
      const store = getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: `Store '${storeId}' not found` });
      }

      const response = await queryStore<{
        transaction: any;
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number } | null;
      }>(store, `/transactions/chain/${encodeURIComponent(chainTx)}`);

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

      const { transaction } = response.data;

      res.json({
        transaction: enrichTransaction(transaction, response.storeId, response.storeName),
        partialTransactions: [],
        pagination: null
      });
    } else {
      const stores = getStores();
      if (stores.length === 0) {
        return res.status(500).json({ error: "No stores configured" });
      }

      const responses = await queryStores<{
        transaction: any;
        partialTransactions: any[];
        pagination?: { total: number; skip: number; limit: number } | null;
      }>(stores, `/transactions/chain/${encodeURIComponent(chainTx)}`);

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
          const { transaction } = response.data;
          results.push({
            transaction: enrichTransaction(transaction, response.storeId, response.storeName),
            partialTransactions: [],
            pagination: null
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

