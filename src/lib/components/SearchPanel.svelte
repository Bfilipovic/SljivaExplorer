<script lang="ts">
  import type { SearchMode } from "../types";
  import { createEventDispatcher } from "svelte";

  const modes: { value: SearchMode; label: string; placeholder: string }[] = [
    { value: "part", label: "Part Hash", placeholder: "Enter part hash" },
    {
      value: "transaction",
      label: "Transaction (ID or Chain Hash)",
      placeholder: "Enter transaction id or chain hash"
    }
  ];

  export let mode: SearchMode = "part";
  export let query = "";
  export let loading = false;
  export let error: string | null = null;
  export let onSearch: ((payload: { mode: SearchMode; query: string }) => void) | null = null;

  const dispatch = createEventDispatcher<{
    search: { mode: SearchMode; query: string };
    modeChange: { mode: SearchMode };
  }>();

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (loading) return;
    const payload = { mode, query };
    onSearch?.(payload);
    dispatch("search", payload);
  }

  function handleModeChange(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    const next = target.value as SearchMode;
    mode = next;
    dispatch("modeChange", { mode });
  }
</script>

<form class="search-panel" on:submit={handleSubmit}>
  <div class="controls">
    <label class="field">
      <span class="field__label">Search type</span>
      <select bind:value={mode} class="field__input" on:change={handleModeChange} disabled={loading}>
        {#each modes as item}
          <option value={item.value}>
            {item.label}
          </option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span class="field__label">Value</span>
      <input
        class="field__input"
        type="text"
        placeholder={modes.find((item) => item.value === mode)?.placeholder}
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
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .field {
    display: grid;
    gap: 0.5rem;
  }

  .field__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-label);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .field__input {
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 1rem;
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

