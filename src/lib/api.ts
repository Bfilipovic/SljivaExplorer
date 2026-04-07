import type {
  ExplorerResult,
  ExplorerTransaction,
  ExplorerPart,
  ExplorerNFT,
  PartialTransaction,
  SearchMode,
  StoreInfo,
  TransactionLookupMatchedBy,
  Pagination
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

    // Handle 304 (Not Modified) first - this means store is online and browser has cached data
    // For 304, the response body might not be accessible to JavaScript, but the store is definitely online
    // The 304 status code itself is proof that the server responded, so the store is online
    if (response.status === 304) {
      // Try to read body if available (some servers send body with 304), but don't fail if unavailable
      try {
        // Read response as text first to avoid "body already consumed" errors
        const text = await response.text();
        if (text && text.trim().length > 0) {
          try {
            const data = JSON.parse(text);
            return { transaction: data.transaction || null };
          } catch {
            // JSON parse failed, but store is still online
          }
        }
      } catch (readError) {
        // Body might not be accessible for 304 - that's fine, store is still online
      }
      // Store is online (304 proves the server responded), return success even without transaction data
      return { transaction: null, error: "Using cached data (304)" };
    }

    // Handle 200 (OK) - normal response
    if (response.ok) {
      try {
        const data = await response.json();
        return {
          transaction: data.transaction || null
        };
      } catch (parseError) {
        // If parsing fails, store is still online (we got a response)
        return { transaction: null, error: "Failed to parse response" };
      }
    }

    // 404 means no transactions yet (store is online but empty)
    if (response.status === 404) {
      return { transaction: null, error: "No transactions found" };
    }

    // Log other errors for debugging
    const errorText = await response.text().catch(() => `Status ${response.status}`);
    console.warn(`[fetchLastTransaction] Failed to fetch from ${storeBaseUrl}/last-transaction:`, response.status, errorText);
    return null; // Store might be offline (network/server error)
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
    return (await response.json()) as ExplorerNFT;
  } catch {
    return null;
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
      const lookupParams: Record<string, string> = { q: sanitized };
      if (options.storeId) {
        lookupParams.storeId = options.storeId;
      }
      const data = await request<{
        transaction: ExplorerTransaction;
        matchedBy: TransactionLookupMatchedBy;
        nft?: ExplorerNFT | null;
      }>(`/transactions/lookup`, lookupParams);

      let nft: ExplorerNFT | null = data.nft ?? null;
      if (!nft && data.transaction.nftId) {
        nft = await fetchNftMetadata(data.transaction.nftId);
      }

      return {
        kind: "transaction",
        transaction: data.transaction,
        matchedBy: data.matchedBy,
        parts: [],
        partsLoaded: false,
        partsNote: null,
        nft,
        partialTransactions: [],
        pagination: null
      };
    }
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unsupported search mode: ${exhaustive}`);
    }
  }
}

export interface TransactionPartsResponse {
  parts: ExplorerPart[];
  pagination: Pagination;
  note?: string;
}

/**
 * Paginated parts belonging to a transaction (Explorer backend; max 50 per page).
 */
export async function fetchTransactionParts(
  txId: string,
  options: { page?: number; pageSize?: number; storeId?: string } = {}
): Promise<TransactionPartsResponse> {
  const raw = String(txId || "").trim();
  if (!raw) {
    throw new Error("Missing transaction id.");
  }
  const page = Math.max(0, options.page ?? 0);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 50));
  const params: Record<string, string> = {
    skip: String(page * pageSize),
    limit: String(pageSize)
  };
  if (options.storeId) {
    params.storeId = options.storeId;
  }
  return request<TransactionPartsResponse>(
    `/transactions/id/${encodeURIComponent(raw)}/parts`,
    params
  );
}
