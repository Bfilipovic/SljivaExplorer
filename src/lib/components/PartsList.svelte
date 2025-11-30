<script lang="ts">
  import type { ExplorerPart, Pagination } from "../types";
  import { formatAddress } from "../utils/format";
  import { getPartLink } from "../utils/storeLinks";

  export let parts: ExplorerPart[] = [];
  export let pagination: Pagination | null = null;

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
                <a
                  href={getPartLink(part._id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="part-link"
                >
                  {formatAddress(part._id)}
                </a>
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

