<script lang="ts">
  import { onMount } from "svelte";
  import SearchPanel from "./lib/components/SearchPanel.svelte";
  import ResultPanel from "./lib/components/ResultPanel.svelte";
  import type { ExplorerResult, Pagination, StoreInfo } from "./lib/types";
  import { unifiedSearch, fetchStores } from "./lib/api";

  const pageSize = 50;

  let query = "";
  let loading = false;
  let error: string | null = null;
  let result: ExplorerResult | null = null;
  let pagination: Pagination | null = null;
  let currentPage = 0;
  let theme: "dark" | "light" = "dark";
  let stores: StoreInfo[] = [];
  let selectedStoreId: string | null = null;

  onMount(async () => {
    applyTheme();
    try {
      stores = await fetchStores();
    } catch (err) {
      console.error("Failed to fetch stores:", err);
      // Continue with empty stores array - will default to "all stores"
    }
  });

  async function executeSearch(value: string, page = 0, storeId: string | null = null) {
    const input = value.trim();
    if (!input) {
      error = "Please enter a value to search.";
      result = null;
      pagination = null;
      return;
    }

    loading = true;
    error = null;

    try {
      const data = await unifiedSearch(input, { 
        page, 
        pageSize,
        storeId: storeId || undefined
      });
      result = data;
      pagination = data.pagination;
      currentPage = page;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unexpected error";
      result = null;
      pagination = null;
    } finally {
      loading = false;
    }
  }

  async function handleSearch(event: CustomEvent<{ query: string; storeId?: string | null }>) {
    query = event.detail.query;
    selectedStoreId = event.detail.storeId ?? null;
    await executeSearch(query, 0, selectedStoreId);
  }

  function totalPages() {
    if (!pagination) return 0;
    return Math.max(1, Math.ceil(pagination.total / pagination.limit));
  }

  async function goToPage(page: number) {
    if (!pagination) return;
    const pages = totalPages();
    if (page < 0 || page >= pages) return;
    await executeSearch(query, page, selectedStoreId);
  }

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme();
  }

  function applyTheme() {
    document.body.classList.toggle("light-theme", theme === "light");
  }

</script>

<main class="app">
  <header class="hero">
    <div class="hero__text">
      <h1>SljivaStore Explorer</h1>
      <p class="subtitle">
        Search parts, transactions, and partial transfers across the network.
      </p>
    </div>
    <div class="hero__actions">
      <button class="theme-toggle" type="button" on:click={toggleTheme}>
        {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
    </div>
  </header>

  <SearchPanel
    bind:query
    {loading}
    {error}
    {stores}
    bind:selectedStoreId
    on:search={handleSearch}
  />

  <ResultPanel {result} />

  {#if pagination && pagination.total > pagination.limit}
    <nav class="pager">
      <button
        type="button"
        class="pager__button"
        on:click={() => goToPage(currentPage - 1)}
        disabled={loading || currentPage === 0}
      >
        Previous
      </button>
      <span class="pager__info">
        Page {currentPage + 1} of {totalPages()}
      </span>
      <button
        type="button"
        class="pager__button"
        on:click={() => goToPage(currentPage + 1)}
        disabled={loading || currentPage + 1 >= totalPages()}
      >
        Next
      </button>
    </nav>
  {/if}
</main>

<style>
  .app {
    min-height: 100vh;
    padding: 2.5rem clamp(1rem, 5vw, 4rem);
    display: grid;
    gap: 2rem;
    color: var(--text-primary);
  }

  .hero {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: var(--card-bg);
    border-radius: 1.25rem;
    padding: 2rem;
    border: 1px solid var(--card-border);
    box-shadow: 0 24px 55px var(--card-shadow);
  }

  @media (min-width: 900px) {
    .hero {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .hero__text {
    max-width: 640px;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.2rem, 3vw, 2.8rem);
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .subtitle {
    margin: 0.35rem 0 0;
    color: var(--text-secondary);
    max-width: 48ch;
    font-size: 1.05rem;
  }

  .hero__actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .theme-toggle {
    padding: 0.75rem 1.4rem;
    border-radius: 999px;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--text-primary);
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .theme-toggle:hover {
    background: var(--card-border);
  }

  .pager {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: flex-end;
  }

  .pager__button {
    padding: 0.65rem 1.2rem;
    border-radius: 999px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.2s ease, opacity 0.2s ease;
  }

  .pager__button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pager__button:not(:disabled):hover {
    background: var(--card-border);
  }

  .pager__info {
    font-size: 0.9rem;
    color: var(--text-muted);
  }
</style>

