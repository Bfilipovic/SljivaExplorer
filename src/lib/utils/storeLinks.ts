/**
 * Store link utilities
 */

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
 * Generate a link to a part in the store frontend
 */
export function getPartLink(partHash: string): string {
  const base = getStoreFrontendUrl();
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

