<script lang="ts">
  import type { PartialTransaction, Pagination } from "../types";
  import { formatAddress, formatAmount, formatDate } from "../utils/format";
  import { createEventDispatcher } from "svelte";

  export let title: string;
  export let partials: PartialTransaction[] = [];
  export let pagination: Pagination | null = null;
  export let showTransactionHash = false; // When true, show transaction hash instead of part hash

  const dispatch = createEventDispatcher<{
    search: { query: string };
  }>();

  function handleHashClick(hash: string, event: MouseEvent) {
    event.preventDefault();
    dispatch("search", { query: hash });
  }

  function getTransactionId(partial: PartialTransaction): string | null {
    // Return the parent transaction ID (transaction field takes precedence over txId)
    return partial.transaction || partial.txId || null;
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
  <div class="table-content">
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
            <th>{showTransactionHash ? "Transaction Hash" : "Part"}</th>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
            {#if !showTransactionHash}
              <th>Chain Hash</th>
            {/if}
            <th>Timestamp</th>
            {#if !showTransactionHash}
              <th>Store</th>
              <th>Actions</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each partials as partial}
            <tr>
              <td>
                {#if showTransactionHash}
                  {@const txId = getTransactionId(partial)}
                  {#if txId}
                    <button
                      type="button"
                      class="hash-link"
                      on:click={(e) => handleHashClick(txId, e)}
                      title="Search for this transaction hash"
                    >
                      {formatAddress(txId)}
                    </button>
                  {:else}
                    —
                  {/if}
                {:else}
                  <button
                    type="button"
                    class="hash-link"
                    on:click={(e) => handleHashClick(partial.part, e)}
                    title="Search for this part hash"
                  >
                    {formatAddress(partial.part)}
                  </button>
                {/if}
              </td>
              <td>{formatAddress(partial.from)}</td>
              <td>{formatAddress(partial.to)}</td>
              <td>{formatAmount(partial.amount, partial.currency)}</td>
              {#if !showTransactionHash}
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
              {/if}
              <td>{formatDate(partial.timestamp)}</td>
              {#if !showTransactionHash}
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
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  </div>
</section>

<style>
  .card {
    background: var(--card-bg);
    border-radius: 1rem;
    border: 1px solid var(--card-border);
    padding: 1.25rem 1.5rem;
    box-shadow: 0 18px 40px var(--card-shadow);
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 600px;
    max-height: 600px;
  }

  .table-card {
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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

  .table-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .summary {
    flex-shrink: 0;
  }

  .table-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
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
    padding: 0.75rem 0.5rem;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-label);
    white-space: nowrap;
  }

  td {
    padding: 0.9rem 0.5rem;
    font-size: 0.85rem;
    color: var(--text-primary);
    border-top: 1px solid var(--card-border);
    word-break: break-all;
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
    word-break: break-all;
    max-width: 100%;
    display: inline-block;
  }

  .hash-link:hover {
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
