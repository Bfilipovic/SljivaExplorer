/**
 * Store link utilities
 */

import type { StoreInfo } from "../types";

/**
 * Get the store frontend URL from environment or default to localhost:5173
 */
export function getStoreFrontendUrl(): string {
  // Check for explicit store URL env var
  if (import.meta.env.VITE_STORE_URL) {
    return import.meta.env.VITE_STORE_URL.replace(/\/$/, '');
  }
  
  // Default to localhost:5173 for local development
  return 'http://localhost:5173';
}

/**
 * Get store frontend URL from store baseUrl (API URL)
 * Derives frontend URL by removing /api/explorer from baseUrl
 */
export function getStoreFrontendUrlFromBaseUrl(baseUrl: string): string {
  // Remove /api/explorer and trailing slashes
  return baseUrl.replace(/\/api\/explorer.*$/, '').replace(/\/$/, '');
}

/**
 * Generate a link to a part in the store frontend
 * @param partHash - The part hash/ID
 * @param storeBaseUrl - Optional store API baseUrl to derive frontend URL from
 * @param stores - Optional array of stores to look up storeId
 * @param storeId - Optional store ID to look up in stores array
 */
export function getPartLink(
  partHash: string,
  storeBaseUrl?: string,
  stores?: StoreInfo[],
  storeId?: string
): string {
  let base: string;
  
  // If storeId is provided and stores array is available, look up the store
  if (storeId && stores) {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      // Prefer website field if available, otherwise derive from baseUrl
      if (store.website) {
        base = store.website.replace(/\/$/, '');
      } else {
        base = getStoreFrontendUrlFromBaseUrl(store.baseUrl);
      }
    } else {
      base = getStoreFrontendUrl();
    }
  } else if (storeBaseUrl) {
    // Derive frontend URL from API baseUrl
    base = getStoreFrontendUrlFromBaseUrl(storeBaseUrl);
  } else {
    // Fallback to default
    base = getStoreFrontendUrl();
  }
  
  return `${base}/part/${encodeURIComponent(partHash)}`;
}

/**
 * Generate a link to a blockchain transaction explorer
 */
export function getChainTxLink(chainTx: string, currency?: string): string {
  if (!chainTx) return '#';
  const isSol = currency?.toUpperCase() === 'SOL';
  const base = isSol ? 'https://solscan.io/tx/' : 'https://etherscan.io/tx/';
  // Keep the hash as-is (with or without 0x prefix)
  return `${base}${chainTx}`;
}

/**
 * Generate a link to an Arweave transaction explorer
 */
export function getArweaveTxLink(arweaveTxId: string): string {
  if (!arweaveTxId) return '#';
  // Use viewblock.io Arweave explorer for better UX (can be configured via env)
  const explorer = import.meta.env.VITE_ARWEAVE_EXPLORER || 'https://viewblock.io/arweave/tx';
  return `${explorer.replace(/\/$/, '')}/${arweaveTxId}`;
}

