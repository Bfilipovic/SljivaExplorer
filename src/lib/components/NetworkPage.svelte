<script lang="ts">
  import { onMount } from "svelte";
  import { fetchStores, fetchLastTransaction } from "../api";
  import type { StoreInfo } from "../types";
  import type { ExplorerTransaction } from "../types";

  interface StoreWithStatus extends StoreInfo {
    lastTransaction: ExplorerTransaction | null;
    loading: boolean;
    offline: boolean;
    iconLoaded: boolean;
    iconLoadError: boolean;
  }

  let stores: StoreWithStatus[] = [];
  let loading = true;
  let error: string | null = null;
  let copiedTxId: string | null = null;

  onMount(async () => {
    await loadStores();
  });

  async function loadStores() {
    loading = true;
    error = null;

    try {
      const storeInfos = await fetchStores();

      // Initialize stores with loading state
      stores = storeInfos.map((store) => {
        return {
          ...store,
          lastTransaction: null,
          loading: true,
          offline: false,
          iconLoaded: false,
          iconLoadError: false
        };
      });

      // Fetch last transaction for each store in parallel
      const promises = stores.map(async (store) => {
        try {
          const result = await fetchLastTransaction(store.baseUrl);
          if (result) {
            // Store is online (we got a response)
            store.offline = false;
            if (result.transaction) {
              store.lastTransaction = result.transaction;
            }
            // If result.transaction is null but result exists, it means "no transactions yet" (404)
            // Store is still online, just empty
          } else {
            // result is null = network error, timeout, or CORS issue = store is offline
            store.offline = true;
          }
        } catch (err) {
          // Exception = store is offline
          store.offline = true;
        } finally {
          store.loading = false;
        }
      });

      await Promise.allSettled(promises);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load stores";
    } finally {
      loading = false;
    }
  }

  function formatAddress(address: string): string {
    if (!address) return "";
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}…${address.substring(address.length - 8)}`;
  }

  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
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

  async function copyTransactionId(txId: string) {
    try {
      await navigator.clipboard.writeText(txId);
      copiedTxId = txId;
      // Reset after 2 seconds
      setTimeout(() => {
        copiedTxId = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy transaction ID:", err);
    }
  }
</script>

<div class="content-page">
  <div class="content-header">
    <h2>Our Network</h2>
    <p class="content-description">
      Explore all Nomin instances connected to this explorer. Each store operates independently
      and maintains its own transaction history.
    </p>
  </div>

  {#if loading}
    <div class="loading-state">
      <p>Loading stores...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>Error: {error}</p>
      <button class="retry-button" on:click={loadStores}>Retry</button>
    </div>
  {:else if stores.length === 0}
    <div class="empty-state">
      <p>No stores configured.</p>
    </div>
  {:else}
    <div class="stores-grid">
      {#each stores as store (store.id)}
        <div class="store-card" class:offline={store.offline}>
          <div class="store-header">
            <div class="store-icon-wrapper">
              {#if store.icon && store.icon.trim()}
                <img 
                  src={store.icon} 
                  alt="{store.name} icon" 
                  class="store-icon"
                  class:hidden={!store.iconLoaded || store.iconLoadError}
                  on:error={() => {
                    store.iconLoadError = true;
                    store.iconLoaded = false;
                  }}
                  on:load={() => {
                    store.iconLoaded = true;
                    store.iconLoadError = false;
                  }}
                />
              {/if}
              <div class="store-icon-placeholder" class:hidden={store.icon && store.icon.trim() && store.iconLoaded && !store.iconLoadError}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              </div>
            </div>
            <div class="store-title-section">
              <h3 class="store-name">{store.name}</h3>
              {#if store.website}
                <p class="store-website">{store.website}</p>
              {/if}
            </div>
          </div>

          <div class="store-status">
            {#if store.loading}
              <div class="status-loading">
                <span class="status-dot loading"></span>
                <span>Checking status...</span>
              </div>
            {:else if store.offline}
              <div class="status-offline">
                <span class="status-dot offline"></span>
                <span>Store is currently offline</span>
              </div>
            {:else if store.lastTransaction}
              <div class="last-transaction">
                <div class="transaction-header">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span class="transaction-label">Last Transaction</span>
                </div>
                <div class="transaction-id-wrapper">
                  <div class="transaction-id">{formatAddress(store.lastTransaction._id)}</div>
                  <button
                    class="copy-button"
                    class:copied={copiedTxId === store.lastTransaction._id}
                    on:click={() => store.lastTransaction && copyTransactionId(store.lastTransaction._id)}
                    title="Copy transaction ID"
                  >
                    {#if copiedTxId === store.lastTransaction._id}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"></path>
                      </svg>
                    {:else}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    {/if}
                  </button>
                </div>
                <div class="transaction-time">{formatDate(store.lastTransaction.timestamp)}</div>
              </div>
            {:else}
              <div class="status-offline">
                <span class="status-dot offline"></span>
                <span>No transactions yet</span>
              </div>
            {/if}
          </div>

          <div class="store-actions">
            <a
              href={getStoreFrontendUrl(store.baseUrl)}
              target="_blank"
              rel="noopener noreferrer"
              class="visit-button"
            >
              Visit
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Content page styles are now global in App.svelte */

  .loading-state,
  .error-state,
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
  }

  .error-state {
    color: var(--error, #ef4444);
  }

  .retry-button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .retry-button:hover {
    opacity: 0.9;
  }

  .stores-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .store-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .store-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--card-shadow);
  }

  .store-card.offline {
    opacity: 0.7;
  }

  .store-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .store-icon-wrapper {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    position: relative;
  }

  .store-icon {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid var(--card-border);
  }

  .store-icon-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--card-border);
    color: var(--text-secondary);
  }

  .store-icon-placeholder.hidden {
    display: none;
  }

  .store-title-section {
    flex: 1;
    min-width: 0;
  }

  .store-name {
    margin: 0 0 0.25rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    word-wrap: break-word;
  }

  .store-website {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
    word-wrap: break-word;
  }

  .store-status {
    min-height: 60px;
    display: flex;
    align-items: flex-start;
  }

  .status-loading,
  .status-offline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.loading {
    background: var(--text-secondary);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .status-dot.offline {
    background: var(--error, #ef4444);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .last-transaction {
    width: 100%;
  }

  .transaction-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .transaction-header svg {
    flex-shrink: 0;
  }

  .transaction-label {
    flex: 1;
  }

  .transaction-id-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .transaction-id {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--text-primary);
    word-break: break-all;
    flex: 1;
    min-width: 0;
  }

  .copy-button {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  .copy-button:hover {
    background: var(--card-border);
    color: var(--text-primary);
  }

  .copy-button.copied {
    background: #10b981;
    border-color: #10b981;
    color: white;
  }

  .copy-button svg {
    width: 16px;
    height: 16px;
  }

  .transaction-time {
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .store-actions {
    margin-top: auto;
    padding-top: 0.5rem;
  }

  .visit-button {
    display: block;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    padding: 0.75rem 1rem;
    background: var(--accent);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: opacity 0.2s ease;
    border: none;
    cursor: pointer;
  }

  .visit-button:hover {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    .stores-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
