<script lang="ts">
  import type { PartialTransaction, Pagination, StoreInfo } from "../types";
  import { formatAddress, formatAmount, formatDate } from "../utils/format";
  import { getPartLink } from "../utils/storeLinks";

  export let title: string;
  export let partials: PartialTransaction[] = [];
  export let pagination: Pagination | null = null;
  export let stores: StoreInfo[] = [];
  
  // Reactive: log when stores change
  $: if (stores.length > 0) {
    console.log("[PartialTable] Stores loaded:", stores.length, stores.map(s => ({ id: s.id, baseUrl: s.baseUrl })));
  } else {
    console.warn("[PartialTable] Stores array is empty!");
  }

  $: rangeStart =
    pagination && pagination.total > 0 ? pagination.skip + 1 : partials.length ? 1 : 0;
  $: rangeEnd =
    pagination && pagination.total > 0
      ? Math.min(pagination.skip + pagination.limit, pagination.total)
      : partials.length;

  function explorerLink(partial: PartialTransaction): string {
    const hash = partial.chainTx;
    if (!hash) return "#";
    const base = partial.currency?.toUpperCase() === "SOL"
      ? "https://solscan.io/tx/"
      : "https://etherscan.io/tx/";
    return `${base}${hash}`;
  }

  function getStoreFrontendUrl(baseUrl: string): string {
    try {
      const url = new URL(baseUrl);
      const hostname = url.hostname;
      const protocol = url.protocol;
      
      // Check if we're in the browser and on a production domain
      const isProduction = typeof window !== 'undefined' && 
                          !window.location.hostname.includes('localhost') && 
                          !window.location.hostname.includes('127.0.0.1');
      
      // If baseUrl has localhost but we're in production browser, use current domain
      if ((hostname === 'localhost' || hostname === '127.0.0.1') && isProduction) {
        // Use the current browser's origin (production domain)
        return window.location.origin;
      }
      
      // For localhost in development, use port 5173 for frontend (standard Vite dev port)
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:5173`;
      }
      
      // For production, remove /api/explorer path and use base domain
      return baseUrl.replace(/\/api\/explorer.*$/, "");
    } catch {
      // Fallback: try regex extraction
      const match = baseUrl.match(/^(https?:\/\/[^\/]+)/);
      if (match) {
        const base = match[1];
        
        // Check if we're in production browser
        const isProduction = typeof window !== 'undefined' && 
                            !window.location.hostname.includes('localhost') && 
                            !window.location.hostname.includes('127.0.0.1');
        
        // If base has localhost but we're in production, use current domain
        if (base.includes('localhost') && isProduction) {
          return window.location.origin;
        }
        
        if (base.includes('localhost')) {
          return base.replace(/:(\d+)/, ':5173');
        }
        return base;
      }
      
      // Last resort: if we're in production browser, use current origin
      if (typeof window !== 'undefined' && 
          !window.location.hostname.includes('localhost') && 
          !window.location.hostname.includes('127.0.0.1')) {
        return window.location.origin;
      }
      
      return baseUrl;
    }
  }

  function getPartLinkForPartial(partial: PartialTransaction): string {
    // Get store baseUrl from stores array if storeId is available
    // Use the same logic as NetworkPage's Visit button
    
    // Always log for debugging
    console.log("[PartialTable] Generating part link:", {
      part: partial.part,
      storeId: partial.storeId,
      storesLength: stores.length,
      storeIds: stores.map(s => s.id),
      stores: stores.map(s => ({ id: s.id, baseUrl: s.baseUrl }))
    });
    
    if (!partial.storeId) {
      console.error("[PartialTable] Partial transaction missing storeId:", partial);
      // Don't fall back to localhost - return a placeholder
      return "#";
    }
    
    if (stores.length === 0) {
      console.error("[PartialTable] Stores array is empty! Cannot generate part link for storeId:", partial.storeId);
      // Don't fall back to localhost - return a placeholder
      return "#";
    }
    
    const store = stores.find(s => s.id === partial.storeId);
    if (!store) {
      console.error("[PartialTable] Store not found! storeId:", partial.storeId, "Available store IDs:", stores.map(s => s.id));
      // Don't fall back to localhost - return a placeholder
      return "#";
    }
    
    if (!store.baseUrl) {
      console.error("[PartialTable] Store has no baseUrl! Store:", store);
      // Don't fall back to localhost - return a placeholder
      return "#";
    }
    
    // Use the same function as NetworkPage to get frontend URL
    const frontendUrl = getStoreFrontendUrl(store.baseUrl);
    const link = `${frontendUrl}/part/${encodeURIComponent(partial.part)}`;
    
    // Always log the generated link
    console.log("[PartialTable] Generated link:", {
      link,
      storeId: partial.storeId,
      storeBaseUrl: store.baseUrl,
      frontendUrl,
      currentHostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
    });
    
    // Log error if we're getting localhost in production
    if (typeof window !== 'undefined' && frontendUrl.includes('localhost') && !window.location.hostname.includes('localhost')) {
      console.error("[PartialTable] ERROR: Generated localhost link in production!", {
        link,
        storeId: partial.storeId,
        storeBaseUrl: store.baseUrl,
        frontendUrl,
        currentHostname: window.location.hostname
      });
    }
    
    return link;
  }

  function getTransactionId(partial: PartialTransaction): string | null {
    // Return the parent transaction ID (transaction field takes precedence over txId)
    return partial.transaction || partial.txId || null;
  }

  async function copyTransactionId(partial: PartialTransaction) {
    const txId = getTransactionId(partial);
    if (!txId) return;
    
    try {
      await navigator.clipboard.writeText(txId);
      // You could add a toast notification here if desired
    } catch (err) {
      console.error("Failed to copy transaction ID:", err);
    }
  }
</script>

<section class="card {partials.length ? 'table-card' : ''}">
  <h3>{title}</h3>
  {#if !partials.length}
    <p class="empty">No partial transactions found.</p>
  {:else}
    {#if pagination}
      <div class="summary">
        Showing {rangeStart}-{rangeEnd} of {pagination.total}
      </div>
    {/if}
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Part</th>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
            <th>Chain Hash</th>
            <th>Timestamp</th>
            <th>Store</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each partials as partial}
            <tr>
              <td>
                {#each [partial] as p}
                  {@const partLink = getPartLinkForPartial(p)}
                  <a
                    href={partLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="part-link"
                    title={partLink}
                  >
                    {formatAddress(p.part)}
                  </a>
                {/each}
              </td>
              <td>{formatAddress(partial.from)}</td>
              <td>{formatAddress(partial.to)}</td>
              <td>{formatAmount(partial.amount, partial.currency)}</td>
              <td>
                {#if partial.chainTx}
                  <a
                    href={explorerLink(partial)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="tx-link"
                  >
                    {formatAddress(partial.chainTx, 8)}
                  </a>
                {:else}
                  —
                {/if}
              </td>
              <td>{formatDate(partial.timestamp)}</td>
              <td>{partial.storeName ?? "—"}</td>
              <td>
                {#if getTransactionId(partial)}
                  <button
                    type="button"
                    class="copy-button"
                    on:click={() => copyTransactionId(partial)}
                    title="Copy transaction ID"
                    aria-label="Copy transaction ID"
                  >
                    📋
                  </button>
                {:else}
                  —
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .card {
    background: var(--card-bg);
    border-radius: 1rem;
    border: 1px solid var(--card-border);
    padding: 1.25rem 1.5rem;
    box-shadow: 0 18px 40px var(--card-shadow);
  }

  .table-card {
    padding: 0;
    overflow: hidden;
  }

  .card h3 {
    margin: 0;
    padding-bottom: 0.75rem;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .table-card h3 {
    padding: 1.25rem 1.5rem 0.75rem;
  }

  .summary {
    padding: 0 1.5rem 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .table-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 640px;
  }

  thead {
    background: var(--table-header-bg);
  }

  th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-label);
  }

  td {
    padding: 0.9rem 1rem;
    font-size: 0.9rem;
    color: var(--text-primary);
    border-top: 1px solid var(--card-border);
  }

  tr:nth-child(odd) {
    background: var(--table-row-alt);
  }

  .empty {
    margin: 0;
    color: var(--text-muted);
  }

  .tx-link {
    color: var(--accent);
    text-decoration: none;
  }

  .tx-link:hover {
    text-decoration: underline;
  }

  .part-link {
    color: var(--accent);
    text-decoration: none;
  }

  .part-link:hover {
    text-decoration: underline;
  }

  .copy-button {
    background: transparent;
    border: 1px solid var(--card-border);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    color: var(--text-primary);
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  .copy-button:hover {
    background: var(--card-bg);
    border-color: var(--accent);
  }

  .copy-button:active {
    transform: scale(0.95);
  }
</style>
