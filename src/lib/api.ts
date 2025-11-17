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

interface PartResponse {
  part: ExplorerPart;
  partialTransactions: PartialTransaction[];
  pagination?: {
    total: number;
    skip: number;
    limit: number;
  };
}

interface TransactionResponse {
  transaction: ExplorerTransaction;
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

async function fetchNftMetadata(nftId: string): Promise<ExplorerNFT | null> {
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
      const nft = await fetchNftMetadata(data.part.parent_hash);
      return {
        kind: "part",
        part: data.part,
        nft,
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

