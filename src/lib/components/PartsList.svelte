<script lang="ts">
  import type { ExplorerPart, Pagination } from "../types";
  import { formatAddress } from "../utils/format";
  import { createEventDispatcher } from "svelte";

  export let parts: ExplorerPart[] = [];
  export let pagination: Pagination | null = null;
  export let loadPartsDisabled = false;
  const dispatch = createEventDispatcher<{
    search: { query: string };
    loadparts: { page?: number };
  }>();

  function handlePartHashClick(partHash: string, event: MouseEvent) {
    event.preventDefault();
    dispatch("search", { query: partHash });
  }

  $: rangeStart = pagination && pagination.total > 0 ? pagination.skip + 1 : parts.length ? 1 : 0;
  $: rangeEnd = pagination && pagination.total > 0
    ? Math.min(pagination.skip + pagination.limit, pagination.total)
    : parts.length;
  /** Lookup returns pagination:null; first parts fetch always sets pagination (even when total is 0). */
  $: showLoadPartsPrompt = parts.length === 0 && pagination == null;
</script>

<section class="card {parts.length ? 'table-card' : ''}">
  <h3>Parts in Transaction</h3>
  {#if showLoadPartsPrompt}
    <p class="hint">
      Load part rows on demand so large transactions stay fast to open.
    </p>
    <button
      type="button"
      class="load-parts-btn"
      disabled={loadPartsDisabled}
      on:click={() => dispatch("loadparts", { page: 0 })}
    >
      Show parts
    </button>
  {:else if !parts.length}
    <p class="empty">No parts found for this transaction.</p>
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
                <button
                  type="button"
                  class="hash-link"
                  on:click={(e) => handlePartHashClick(part._id, e)}
                  title="Search for this part hash"
                >
                  {formatAddress(part._id)}
                </button>
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

  .hint {
    margin: 0 0 1rem;
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .load-parts-btn {
    padding: 0.55rem 1.1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--btn-primary-text, #fff);
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .load-parts-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .load-parts-btn:not(:disabled):hover {
    filter: brightness(1.05);
  }

  .hash-link {
    background: transparent;
    border: none;
    color: var(--accent);
    text-decoration: none;
    cursor: pointer;
    padding: 0;
    font: inherit;
    text-align: left;
    transition: text-decoration 0.2s ease;
  }

  .hash-link:hover {
    text-decoration: underline;
  }
</style>

