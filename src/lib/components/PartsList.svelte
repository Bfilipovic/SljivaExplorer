<script lang="ts">
  import type { ExplorerPart, Pagination, StoreInfo } from "../types";
  import { formatAddress } from "../utils/format";
  import { createEventDispatcher } from "svelte";

  export let parts: ExplorerPart[] = [];
  export let pagination: Pagination | null = null;

  export let showPager = false;

  const dispatch = createEventDispatcher<{
    search: { query: string; mode?: "part" | "transaction" };
    partspage: { page: number };
  }>();

  function handlePartHashClick(partHash: string, event: MouseEvent) {
    event.preventDefault();
    dispatch("search", { query: partHash, mode: "part" });
  }

  $: rangeStart = pagination && pagination.total > 0 ? pagination.skip + 1 : parts.length ? 1 : 0;
  $: rangeEnd = pagination && pagination.total > 0
    ? Math.min(pagination.skip + pagination.limit, pagination.total)
    : parts.length;
  $: currentPage =
    pagination && pagination.limit > 0 ? Math.floor(pagination.skip / pagination.limit) : 0;
  $: totalPages =
    pagination && pagination.total > 0
      ? Math.max(1, Math.ceil(pagination.total / pagination.limit))
      : 1;
  $: pagerVisible = showPager && pagination && pagination.total > pagination.limit;
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
    {#if pagerVisible}
      <div class="pager">
        <button
          type="button"
          class="pager__btn"
          disabled={currentPage <= 0}
          on:click={() => dispatch("partspage", { page: currentPage - 1 })}
        >
          Previous
        </button>
        <span class="pager__info">Page {currentPage + 1} of {totalPages}</span>
        <button
          type="button"
          class="pager__btn"
          disabled={currentPage + 1 >= totalPages}
          on:click={() => dispatch("partspage", { page: currentPage + 1 })}
        >
          Next
        </button>
      </div>
    {/if}
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

  .pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid var(--card-border);
    flex-shrink: 0;
  }

  .pager__btn {
    padding: 0.4rem 0.9rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .pager__btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .pager__info {
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>

