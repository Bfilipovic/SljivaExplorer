<script lang="ts">
  import type { SearchMode, StoreInfo } from "../types";
  import { createEventDispatcher } from "svelte";

  export let query = "";
  export let searchMode: SearchMode = "part";
  export let loading = false;
  export let error: string | null = null;
  export let stores: StoreInfo[] = [];
  export let selectedStoreId: string | null = null;
  export let onSearch:
    | ((payload: { query: string; storeId?: string | null; mode: SearchMode }) => void)
    | null = null;

  const dispatch = createEventDispatcher<{
    search: { query: string; storeId?: string | null; mode: SearchMode };
  }>();

  $: showStoreSelector = stores.length > 1;
  $: searchPlaceholder =
    searchMode === "transaction"
      ? "Paste transaction ID, Arweave tx, or chain hash"
      : "Enter part hash";

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (loading) return;
    const payload = { query, storeId: selectedStoreId, mode: searchMode };
    onSearch?.(payload);
    dispatch("search", payload);
  }
</script>

<form class="search-panel" on:submit={handleSubmit}>
  <div class="controls">
    {#if showStoreSelector}
      <label class="field field--store">
        <span class="field__label">Store</span>
        <select bind:value={selectedStoreId} class="field__input" disabled={loading}>
          <option value={null}>All stores</option>
          {#each stores as store}
            <option value={store.id}>{store.name}</option>
          {/each}
        </select>
      </label>
    {/if}
    <div class="field field--mode" role="group" aria-label="Search target">
      <span class="field__label">Look up</span>
      <div class="mode-toggle">
        <button
          type="button"
          class="mode-toggle__btn"
          class:mode-toggle__btn--active={searchMode === "part"}
          disabled={loading}
          on:click={() => (searchMode = "part")}
        >
          Part
        </button>
        <button
          type="button"
          class="mode-toggle__btn"
          class:mode-toggle__btn--active={searchMode === "transaction"}
          disabled={loading}
          on:click={() => (searchMode = "transaction")}
        >
          Transaction
        </button>
      </div>
    </div>
    <label class="field field--search">
      <span class="field__label">Search</span>
      <input
        class="field__input"
        type="text"
        placeholder={searchPlaceholder}
        bind:value={query}
        spellcheck="false"
        autocomplete="off"
        disabled={loading}
      />
    </label>
  </div>
  <button class="submit" type="submit" disabled={loading}>
    {#if loading}
      Searching…
    {:else}
      Search
    {/if}
  </button>
  {#if error}
    <p class="error">{error}</p>
  {/if}
</form>

<style>
  .search-panel {
    display: grid;
    gap: 1rem;
    padding: 1.5rem;
    background-color: var(--card-bg);
    border-radius: 1rem;
    border: 1px solid var(--card-border);
    box-shadow: 0 20px 45px var(--card-shadow);
    backdrop-filter: blur(10px);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
  }

  .field--store {
    flex: 0 0 auto;
    min-width: min(100%, 12rem);
  }

  .field--mode {
    flex: 0 0 auto;
  }

  .mode-toggle {
    display: flex;
    align-items: stretch;
    box-sizing: border-box;
    /* Match .field__input: 0.75rem*2 padding + 1.5 line-height + 1px borders */
    min-height: calc(3rem + 2px);
    border-radius: 0.75rem;
    border: 1px solid var(--input-border);
    overflow: hidden;
    background: var(--input-bg);
  }

  .mode-toggle__btn {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .mode-toggle__btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .mode-toggle__btn--active {
    background: var(--accent-shadow);
    color: var(--text-primary);
  }

  .field--search {
    flex: 1 1 220px;
    min-width: min(100%, 220px);
  }

  .field {
    display: grid;
    gap: 0.5rem;
  }

  .field__label {
    display: block;
    min-height: 1.25rem;
    line-height: 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-label);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .field__input {
    box-sizing: border-box;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 1rem;
    line-height: 1.5;
    min-height: calc(3rem + 2px);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .field__input:focus {
    outline: none;
    border-color: var(--accent-border);
    box-shadow: 0 0 0 3px var(--accent-shadow);
  }

  .submit {
    justify-self: flex-start;
    padding: 0.85rem 1.8rem;
    border-radius: 999px;
    border: none;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: linear-gradient(135deg, var(--button-gradient-start), var(--button-gradient-end));
    color: var(--button-text);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  }

  .submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .submit:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 30px var(--button-shadow);
  }

  .error {
    margin: 0;
    color: var(--danger);
    font-size: 0.95rem;
  }
</style>

