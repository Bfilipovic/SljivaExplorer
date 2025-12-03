import type {
  ExplorerResult,
  ExplorerTransaction,
  ExplorerPart,
  ExplorerNFT,
  PartialTransaction,
  SearchMode,
  StoreInfo
} from "./types";

const DEFAULT_BASE = "/api/explorer";
const API_BASE = (import.meta.env.VITE_EXPLORER_API_BASE as string | undefined) ?? DEFAULT_BASE;
const NFT_BASE = "/api/nfts";

/**
 * Fetch list of available stores.
 */
export async function fetchStores(): Promise<StoreInfo[]> {
  const response = await fetch(`${API_BASE}/stores`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stores: ${response.status}`);
  }

  return (await response.json()) as StoreInfo[];
}

/**
 * Fetch last transaction for a specific store.
 */
export async function fetchLastTransaction(storeBaseUrl: string): Promise<{
  transaction: ExplorerTransaction | null;
  error?: string;
} | null> {
  try {
    const response = await fetch(`${storeBaseUrl}/last-transaction`, {
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout (increased from 5)
    });

    if (!response.ok) {
      // 404 means no transactions yet (store is online but empty)
      // Return a result object to indicate store is online, just no transactions
      if (response.status === 404) {
        return { transaction: null, error: "No transactions found" };
      }
      // Log other errors for debugging
      const errorText = await response.text().catch(() => `Status ${response.status}`);
      console.warn(`[fetchLastTransaction] Failed to fetch from ${storeBaseUrl}/last-transaction:`, response.status, errorText);
      return null; // Store might be offline (network/server error)
    }

    const data = await response.json();
    return {
      transaction: data.transaction
    };
  } catch (err) {
    // Network errors, timeouts, CORS errors indicate the store is offline
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[fetchLastTransaction] Error fetching from ${storeBaseUrl}/last-transaction:`, errorMsg);
    return null; // Store is offline or error occurred
  }
}

interface PartResponse {
  part: ExplorerPart;
  nft?: ExplorerNFT | null;
  partialTransactions: PartialTransaction[];
  pagination?: {
    total: number;
    skip: number;
    limit: number;
  };
}

interface TransactionResponse {
  transaction: ExplorerTransaction;
  parts?: ExplorerPart[];
  nft?: ExplorerNFT | null;
  partialTransactions: PartialTransaction[];
  pagination?: {
    total: number;
    skip: number;
    limit: number;
  } | null;
}

async function request<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const url = `${API_BASE}${path}${query}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    // ignore
  }
  return `Request failed with status ${response.status}`;
}

export async function fetchNftMetadata(nftId: string): Promise<ExplorerNFT | null> {
  if (!nftId) return null;
  const response = await fetch(`${NFT_BASE}/${encodeURIComponent(nftId)}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return null;
  }

  try {
    const data = (await response.json()) as ExplorerNFT;
    return {
      ...data,
      partialTransactions: data.partialTransactions ?? [],
      pagination: data.pagination ?? null
    };
  } catch {
    return null;
  }
}

async function requestSafe<T>(path: string, params?: Record<string, string>): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await request<T>(path, params);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export async function searchExplorer(
  mode: SearchMode,
  query: string,
  options: { page?: number; pageSize?: number; storeId?: string } = {}
): Promise<ExplorerResult> {
  const sanitized = query.trim();
  if (!sanitized) {
    throw new Error("Please enter a value to search.");
  }

  const page = Math.max(0, options.page ?? 0);
  const pageSize = Math.max(1, Math.min(100, options.pageSize ?? 50));
  const paginationParams: Record<string, string> = {
    skip: String(page * pageSize),
    limit: String(pageSize),
  };

  if (options.storeId) {
    paginationParams.storeId = options.storeId;
  }

  switch (mode) {
    case "part": {
      const data = await request<PartResponse>(`/parts/${encodeURIComponent(sanitized)}`, paginationParams);
      // NFT is now included in the response from the backend
      return {
        kind: "part",
        part: data.part,
        nft: data.nft ?? null,
        partialTransactions: data.partialTransactions,
        pagination: data.pagination ?? {
          total: data.partialTransactions.length,
          skip: page * pageSize,
          limit: pageSize
        }
      };
    }
    case "transaction": {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(sanitized);
      const path = isObjectId
        ? `/transactions/id/${encodeURIComponent(sanitized)}`
        : `/transactions/chain/${encodeURIComponent(sanitized)}`;
      const data = await request<TransactionResponse>(path, paginationParams);
      return {
        kind: "transaction",
        transaction: data.transaction,
        partialTransactions: data.partialTransactions ?? [],
        pagination: null
      };
    }
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unsupported search mode: ${exhaustive}`);
    }
  }
}

/**
 * Unified search that automatically tries part hash, chain hash, or transaction ID.
 * Tries different endpoints in sequence until one succeeds.
 */
export async function unifiedSearch(
  query: string,
  options: { page?: number; pageSize?: number; storeId?: string } = {}
): Promise<ExplorerResult> {
  const sanitized = query.trim();
  if (!sanitized) {
    throw new Error("Please enter a value to search.");
  }

  const page = Math.max(0, options.page ?? 0);
  const pageSize = Math.max(1, Math.min(100, options.pageSize ?? 50));
  const paginationParams: Record<string, string> = {
    skip: String(page * pageSize),
    limit: String(pageSize),
  };

  if (options.storeId) {
    paginationParams.storeId = options.storeId;
  }

  const errors: string[] = [];

  // Detect input characteristics
  const has0xPrefix = sanitized.toLowerCase().startsWith("0x");
  const without0x = has0xPrefix ? sanitized.slice(2) : sanitized;
  const with0x = has0xPrefix ? sanitized : `0x${sanitized}`;

  // Build search candidates - try all variations to maximize chances of finding the result
  const searchCandidates: Array<{ type: string; path: string; desc: string }> = [];
  const seenPaths = new Set<string>();

  // Helper to add candidate without duplicates
  const addCandidate = (type: string, path: string, desc: string) => {
    if (!seenPaths.has(path)) {
      seenPaths.add(path);
      searchCandidates.push({ type, path, desc });
    }
  };

  // 1. Try part hash (original input)
  addCandidate("part-hash", `/parts/${encodeURIComponent(sanitized)}`, "part hash");

  // 2. Chain hash variations - try with and without 0x prefix
  addCandidate("chain-hash", `/transactions/chain/${encodeURIComponent(sanitized)}`, "chain hash (as-is)");
  
  if (has0xPrefix) {
    addCandidate("chain-hash", `/transactions/chain/${encodeURIComponent(without0x)}`, "chain hash (without 0x)");
  }
  
  if (!has0xPrefix && /^[0-9a-fA-F]+$/i.test(sanitized)) {
    addCandidate("chain-hash", `/transactions/chain/${encodeURIComponent(with0x)}`, "chain hash (with 0x)");
  }

  // 3. Transaction ID - always try
  addCandidate("transaction-id", `/transactions/id/${encodeURIComponent(sanitized)}`, "transaction ID");

  // Try all candidates
  for (const candidate of searchCandidates) {
    try {
      if (candidate.type === "part-hash") {
        const result = await requestSafe<PartResponse>(candidate.path, paginationParams);
        if (result.success) {
          return {
            kind: "part",
            part: result.data.part,
            nft: result.data.nft ?? null,
            partialTransactions: result.data.partialTransactions,
            pagination: result.data.pagination ?? {
              total: result.data.partialTransactions.length,
              skip: page * pageSize,
              limit: pageSize
            }
          };
        }
        const errorMsg = result.error || "Unknown error";
        errors.push(`${candidate.desc}: ${errorMsg}`);
      } else {
        // transaction searches
        const result = await requestSafe<TransactionResponse>(candidate.path, paginationParams);
        if (result.success) {
          // Use NFT metadata from server response, or fetch if not provided
          let nft = result.data.nft ?? null;
          if (!nft && result.data.transaction.nftId) {
            nft = await fetchNftMetadata(result.data.transaction.nftId);
          }

          return {
            kind: "transaction",
            transaction: result.data.transaction,
            parts: result.data.parts ?? [],
            nft: nft,
            partialTransactions: result.data.partialTransactions ?? [],
            pagination: result.data.pagination ?? null
          };
        }
        const errorMsg = result.error || "Unknown error";
        errors.push(`${candidate.desc}: ${errorMsg}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${candidate.desc}: ${errorMsg}`);
    }
  }

  // All searches failed - provide detailed error message
  const triedTypes = [...new Set(searchCandidates.map(c => c.desc))].join(", ");
  const allErrors = errors.length > 0 ? errors.join("; ") : "No specific errors available";
  throw new Error(
    `No results found for "${sanitized}". ` +
    `Tried searching as: ${triedTypes}. ` +
    `Errors: ${allErrors}`
  );
}

