<script lang="ts">
  import type { ExplorerPart, Pagination, StoreInfo } from "../types";
  import { formatAddress } from "../utils/format";

  export let parts: ExplorerPart[] = [];
  export let pagination: Pagination | null = null;
  export let stores: StoreInfo[] = [];

  // Use the same function as NetworkPage to get store frontend URL
  function getStoreFrontendUrl(baseUrl: string): string {
    console.log("[PartsList.getStoreFrontendUrl] Called with baseUrl:", baseUrl);
    
    // Always use the current browser's origin (production domain)
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      console.log("[PartsList.getStoreFrontendUrl] Using window.location.origin:", origin);
      return origin;
    }
    
    console.log("[PartsList.getStoreFrontendUrl] window is undefined, using fallback");
    
    // Fallback for SSR: try to extract from baseUrl
    try {
      const url = new URL(baseUrl);
      const hostname = url.hostname;
      const protocol = url.protocol;
      
      console.log("[PartsList.getStoreFrontendUrl] Parsed URL - hostname:", hostname, "protocol:", protocol);
      
      // For localhost, use port 5173 for frontend (standard Vite dev port)
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const result = `${protocol}//${hostname}:5173`;
        console.log("[PartsList.getStoreFrontendUrl] Localhost detected, returning:", result);
        return result;
      }
      
      // For production, remove /api/explorer path and use base domain
      const result = baseUrl.replace(/\/api\/explorer.*$/, "");
      console.log("[PartsList.getStoreFrontendUrl] Production URL, returning:", result);
      return result;
    } catch (error) {
      console.log("[PartsList.getStoreFrontendUrl] URL parsing failed, trying regex. Error:", error);
      // Fallback: try regex extraction
      const match = baseUrl.match(/^(https?:\/\/[^\/]+)/);
      if (match) {
        const base = match[1];
        console.log("[PartsList.getStoreFrontendUrl] Regex match found:", base);
        if (base.includes('localhost')) {
          const result = base.replace(/:(\d+)/, ':5173');
          console.log("[PartsList.getStoreFrontendUrl] Localhost in regex, returning:", result);
          return result;
        }
        console.log("[PartsList.getStoreFrontendUrl] Returning regex base:", base);
        return base;
      }
      console.log("[PartsList.getStoreFrontendUrl] All fallbacks failed, returning original baseUrl:", baseUrl);
      return baseUrl;
    }
  }

  function getPartLink(part: ExplorerPart): string {
    console.log("[PartsList.getPartLink] Called for part:", {
      partId: part._id,
      storeId: part.storeId,
      storeName: part.storeName,
      storesLength: stores.length,
      storeIds: stores.map(s => s.id)
    });
    
    // If we have storeId, look up the store and use its baseUrl
    if (part.storeId && stores.length > 0) {
      console.log("[PartsList.getPartLink] Looking up store with storeId:", part.storeId);
      const store = stores.find(s => s.id === part.storeId);
      if (store) {
        console.log("[PartsList.getPartLink] Store found:", {
          id: store.id,
          name: store.name,
          baseUrl: store.baseUrl
        });
        if (store.baseUrl) {
          const frontendUrl = getStoreFrontendUrl(store.baseUrl);
          const link = `${frontendUrl}/part/${encodeURIComponent(part._id)}`;
          console.log("[PartsList.getPartLink] Generated link:", link);
          return link;
        } else {
          console.error("[PartsList.getPartLink] Store has no baseUrl!");
        }
      } else {
        console.error("[PartsList.getPartLink] Store not found! Available stores:", stores.map(s => ({ id: s.id, name: s.name })));
      }
    } else {
      if (!part.storeId) {
        console.warn("[PartsList.getPartLink] Part has no storeId");
      }
      if (stores.length === 0) {
        console.warn("[PartsList.getPartLink] Stores array is empty!");
      }
    }
    
    // Fallback: no link if store not found
    console.log("[PartsList.getPartLink] Returning fallback '#'");
    return "#";
  }

  $: rangeStart = pagination && pagination.total > 0 ? pagination.skip + 1 : parts.length ? 1 : 0;
  $: rangeEnd = pagination && pagination.total > 0
    ? Math.min(pagination.skip + pagination.limit, pagination.total)
    : parts.length;
</script>

<section class="card {parts.length ? 'table-card' : ''}">
  <h3>Parts in Transaction</h3>
  {#if !parts.length}
    <p class="empty">No parts found.</p>
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
            <th>Part Hash</th>
            <th>Part Number</th>
            <th>Owner</th>
            <th>Store</th>
          </tr>
        </thead>
        <tbody>
          {#each parts as part}
            <tr>
              <td>
                {#if part.storeId}
                  <a
                    href={getPartLink(part)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="part-link"
                  >
                    {formatAddress(part._id)}
                  </a>
                {:else}
                  {formatAddress(part._id)}
                {/if}
              </td>
              <td>{part.part_no}</td>
              <td>{formatAddress(part.owner)}</td>
              <td>{part.storeName ?? "—"}</td>
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
    min-width: 500px;
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

  .part-link {
    color: var(--accent);
    text-decoration: none;
  }

  .part-link:hover {
    text-decoration: underline;
  }
</style>

