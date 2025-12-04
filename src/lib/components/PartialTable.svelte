<script lang="ts">
  import type { PartialTransaction, Pagination, StoreInfo } from "../types";
  import { formatAddress, formatAmount, formatDate } from "../utils/format";
  import { getPartLink } from "../utils/storeLinks";

  export let title: string;
  export let partials: PartialTransaction[] = [];
  export let pagination: Pagination | null = null;
  export let stores: StoreInfo[] = [];

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
      
      // For localhost, use port 5173 for frontend (standard Vite dev port)
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
        if (base.includes('localhost')) {
          return base.replace(/:(\d+)/, ':5173');
        }
        return base;
      }
      return baseUrl;
    }
  }

  function getPartLinkForPartial(partial: PartialTransaction): string {
    // Get store baseUrl from stores array if storeId is available
    // Use the same logic as NetworkPage's Visit button
    if (partial.storeId && stores.length > 0) {
      const store = stores.find(s => s.id === partial.storeId);
      if (store && store.baseUrl) {
        // Use the same function as NetworkPage to get frontend URL
        const frontendUrl = getStoreFrontendUrl(store.baseUrl);
        return `${frontendUrl}/part/${encodeURIComponent(partial.part)}`;
      }
    }
    
    // Fallback - this should not happen in production
    return getPartLink(partial.part);
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
                <a
                  href={getPartLinkForPartial(partial)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="part-link"
                >
                  {formatAddress(partial.part)}
                </a>
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
