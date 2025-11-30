<script lang="ts">
  import type { ExplorerResult, ExplorerNFT } from "../types";
  import { formatAddress, formatAmount, formatDate } from "../utils/format";
  import PartialTable from "./PartialTable.svelte";
  import PartsList from "./PartsList.svelte";
  import { getPartLink, getChainTxLink } from "../utils/storeLinks";
  import { fetchNftMetadata } from "../api";

  export let result: ExplorerResult | null = null;

  let transactionNft: ExplorerNFT | null = null;

  // Fetch NFT metadata for transaction
  $: if (result && result.kind === "transaction") {
    if (result.nft) {
      transactionNft = result.nft;
    } else if (result.transaction.nftId) {
      // Fetch NFT metadata using transaction's nftId
      fetchNftMetadata(result.transaction.nftId).then((nft: ExplorerNFT | null) => {
        transactionNft = nft;
      });
    } else if (result.parts && result.parts.length > 0) {
      // Fallback: use first part's parent_hash
      const firstPart = result.parts[0];
      if (firstPart && firstPart.parent_hash) {
        fetchNftMetadata(firstPart.parent_hash).then((nft: ExplorerNFT | null) => {
          transactionNft = nft;
        });
      }
    }
  } else {
    transactionNft = null;
  }
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
            <dd>
              <a
                href={getPartLink(result.part._id)}
                target="_blank"
                rel="noopener noreferrer"
                class="part-link"
              >
                {result.part._id}
              </a>
            </dd>
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
          {#if result.part.storeName}
            <div>
              <dt>Store</dt>
              <dd>{result.part.storeName}</dd>
            </div>
          {/if}
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
            <dd>
              {#if result.transaction.chainTx}
                <a
                  href={getChainTxLink(result.transaction.chainTx, result.transaction.currency)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="chain-tx-link"
                >
                  {formatAddress(result.transaction.chainTx)}
                </a>
              {:else}
                —
              {/if}
            </dd>
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
          {#if result.transaction.storeName}
            <div>
              <dt>Store</dt>
              <dd>{result.transaction.storeName}</dd>
            </div>
          {/if}
        </dl>
      </div>
      {#if transactionNft}
        <div class="card media-card">
          <h3>NFT Metadata</h3>
          {#if transactionNft.imageurl}
            <figure>
              <img src={transactionNft.imageurl} alt={`NFT ${transactionNft.name}`} />
              <figcaption>{transactionNft.name}</figcaption>
            </figure>
          {:else}
            <p class="empty">No image available.</p>
          {/if}
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{transactionNft.name}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{transactionNft.description}</dd>
            </div>
            <div>
              <dt>Creator</dt>
              <dd>{formatAddress(transactionNft.creator)}</dd>
            </div>
          </dl>
        </div>
      {/if}
      {#if result.parts && result.parts.length > 0}
        <PartsList parts={result.parts} pagination={result.pagination} />
      {:else}
        <div class="card note-card">
          <h3>Parts</h3>
          <p>No parts found for this transaction.</p>
        </div>
      {/if}
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

  .part-link,
  .chain-tx-link {
    color: var(--accent);
    text-decoration: none;
    word-break: break-all;
  }

  .part-link:hover,
  .chain-tx-link:hover {
    text-decoration: underline;
  }
</style>

