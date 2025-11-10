<script lang="ts">
  import type { ExplorerResult } from "../types";
  import { formatAddress, formatAmount, formatDate } from "../utils/format";
  import PartialTable from "./PartialTable.svelte";

  export let result: ExplorerResult | null = null;
</script>

{#if !result}
  <section class="empty-state">
    <h2>Explorer</h2>
    <p>Enter a part hash or transaction identifier to explore the SljivaStore network.</p>
  </section>
{:else if result.kind === "part"}
  <section class="result-section">
    <header>
      <h2>Part</h2>
      <span class="badge">Part Hash</span>
    </header>
    <div class="grid">
      <div class="card">
        <h3>Part Metadata</h3>
        <dl>
          <div>
            <dt>Part Hash</dt>
            <dd>{result.part._id}</dd>
          </div>
          <div>
            <dt>Part Number</dt>
            <dd>{result.part.part_no}</dd>
          </div>
          <div>
            <dt>Parent NFT</dt>
            <dd>{result.part.parent_hash}</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{formatAddress(result.part.owner)}</dd>
          </div>
          <div>
            <dt>Listing</dt>
            <dd>{result.part.listing ?? "Not Listed"}</dd>
          </div>
        </dl>
      </div>
      {#if result.nft}
        <div class="card media-card">
          <h3>NFT Metadata</h3>
          {#if result.nft.imageurl}
            <figure>
              <img src={result.nft.imageurl} alt={`NFT ${result.nft.name}`} />
              <figcaption>{result.nft.name}</figcaption>
            </figure>
          {:else}
            <p class="empty">No image available.</p>
          {/if}
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{result.nft.name}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{result.nft.description}</dd>
            </div>
            <div>
              <dt>Creator</dt>
              <dd>{formatAddress(result.nft.creator)}</dd>
            </div>
          </dl>
        </div>
      {/if}
      <PartialTable
        title="Partial Transactions"
        partials={result.partialTransactions}
        pagination={result.pagination}
      />
    </div>
  </section>
{:else if result.kind === "transaction"}
  <section class="result-section">
    <header>
      <h2>Transaction</h2>
      <span class="badge">Transaction Lookup</span>
    </header>
    <div class="grid">
      <div class="card">
        <h3>Summary</h3>
        <dl>
          <div>
            <dt>Transaction ID</dt>
            <dd>{result.transaction._id}</dd>
          </div>
          <div>
            <dt>Chain Hash</dt>
            <dd>{result.transaction.chainTx}</dd>
          </div>
          <div>
            <dt>Buyer</dt>
            <dd>{formatAddress(result.transaction.buyer)}</dd>
          </div>
          <div>
            <dt>Seller</dt>
            <dd>{formatAddress(result.transaction.seller)}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{result.transaction.quantity}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatAmount(result.transaction.amount, result.transaction.currency)}</dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>{formatDate(result.transaction.timestamp)}</dd>
          </div>
        </dl>
      </div>
      <div class="card note-card">
        <h3>Partial Transactions</h3>
        <p>
          Partial transfers for this transaction are omitted to keep the Explorer responsive.
          Use the part hash search to inspect individual partial movements.
        </p>
      </div>
    </div>
  </section>
{/if}

<style>
  .empty-state {
    padding: 2rem;
    border-radius: 1rem;
    border: 1px dashed var(--border-muted);
    text-align: center;
    color: var(--text-muted);
  }

  .empty-state h2 {
    margin-bottom: 0.5rem;
    font-size: 1.75rem;
  }

  .result-section {
    display: grid;
    gap: 1.5rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .badge {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: var(--badge-bg);
    color: var(--badge-text);
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .grid {
    display: grid;
    gap: 1.5rem;
  }

  @media (min-width: 1280px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }
  }

  .card {
    background: var(--card-bg);
    border-radius: 1rem;
    border: 1px solid var(--card-border);
    padding: 1.25rem 1.5rem;
    box-shadow: 0 18px 40px var(--card-shadow);
  }

  .note-card p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .card h3 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  dl {
    display: grid;
    gap: 0.75rem;
  }

  dt {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-label);
  }

  dd {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-primary);
    word-break: break-all;
  }

  .media-card figure {
    margin: 0 0 1rem;
    display: grid;
    gap: 0.75rem;
  }

  .media-card img {
    width: 100%;
    border-radius: 0.75rem;
    object-fit: cover;
    max-height: 240px;
    border: 1px solid var(--image-border);
  }

  .media-card figcaption {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .media-card .empty {
    margin: 0;
    color: var(--text-muted);
  }
</style>

