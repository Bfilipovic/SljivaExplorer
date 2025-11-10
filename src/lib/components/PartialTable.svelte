<script lang="ts">
  import type { PartialTransaction, Pagination } from "../types";
  import { formatAddress, formatAmount, formatDate } from "../utils/format";

  export let title: string;
  export let partials: PartialTransaction[] = [];
  export let pagination: Pagination | null = null;

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
          </tr>
        </thead>
        <tbody>
          {#each partials as partial}
            <tr>
              <td>{formatAddress(partial.part)}</td>
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
</style>
