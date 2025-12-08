<script lang="ts">
  import type { ExplorerResult, ExplorerNFT, StoreInfo } from "../types";
  import { formatAddress, formatAmount, formatDate } from "../utils/format";
  import PartialTable from "./PartialTable.svelte";
  import PartsList from "./PartsList.svelte";
  import VerificationModal from "./VerificationModal.svelte";
  import { getPartLink, getChainTxLink, getArweaveTxLink } from "../utils/storeLinks";
  import { fetchNftMetadata } from "../api";
  import { verifyTransaction, fetchArweaveTransaction } from "../utils/verification";

  import { createEventDispatcher } from "svelte";
  
  export let result: ExplorerResult | null = null;
  export let stores: StoreInfo[] = [];
  
  const dispatch = createEventDispatcher();

  let transactionNft: ExplorerNFT | null = null;
  let verificationModalOpen = false;
  let verificationStep = "";
  let verificationState: "idle" | "verifying" | "verified" | "failed" = "idle";
  let verificationError: string | null = null;
  let verificationChecks: any[] = [];

  // Reset verification state when result changes (new search)
  $: if (result) {
    verificationState = "idle";
    verificationModalOpen = false;
    verificationStep = "";
    verificationError = null;
    verificationChecks = [];
  }

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

  async function handleVerify() {
    if (!result || result.kind !== "transaction" || verificationState === "verifying") {
      return;
    }

    // If already verified, just show the results
    if (verificationState === "verified" || verificationState === "failed") {
      verificationModalOpen = true;
      return;
    }

    verificationModalOpen = true;
    verificationState = "verifying";
    verificationError = null;
    verificationStep = "";
    verificationChecks = [];

    try {
      const updateStep = (step: string) => {
        verificationStep = step;
      };

      const verificationResult = await verifyTransaction(result.transaction, updateStep);

      // Store checks for display
      verificationChecks = verificationResult.checks || [];

      if (verificationResult.verified) {
        verificationState = "verified";
        verificationStep = "";
        verificationError = null;
      } else {
        verificationState = "failed";
        verificationStep = "";
        verificationError = verificationResult.errors.length > 0 
          ? verificationResult.errors.join("; ")
          : "Unknown verification error";
      }
    } catch (error) {
      verificationState = "failed";
      verificationStep = "";
      verificationError = error instanceof Error ? error.message : String(error);
      verificationChecks = [{
        name: "Verification Process",
        passed: false,
        message: error instanceof Error ? error.message : String(error)
      }];
    }
  }

  let loadingPrevious = false;
  let previousError: string | null = null;

  async function handlePreviousTransaction() {
    if (!result || result.kind !== "transaction" || !result.transaction.arweaveTxId) {
      return;
    }

    loadingPrevious = true;
    previousError = null;

    try {
      // Step 1: Fetch current transaction from Arweave to get previous_arweave_tx
      const currentArweaveData = await fetchArweaveTransaction(result.transaction.arweaveTxId);
      const previousArweaveTxId = currentArweaveData.previous_arweave_tx;

      if (!previousArweaveTxId) {
        previousError = "This is the first transaction in the chain";
        loadingPrevious = false;
        return;
      }

      // Step 2: Fetch previous transaction from Arweave to get its transactionId
      const previousArweaveData = await fetchArweaveTransaction(previousArweaveTxId);
      const previousTransactionId = previousArweaveData.transactionId;

      if (!previousTransactionId) {
        previousError = "Previous transaction does not have a transactionId";
        loadingPrevious = false;
        return;
      }

      // Step 3: Reset verification state for the new transaction
      verificationState = "idle";
      verificationModalOpen = false;
      verificationStep = "";
      verificationError = null;
      verificationChecks = [];

      // Step 4: Dispatch search event with the transactionId
      dispatch("search", { query: previousTransactionId, storeId: null });
    } catch (error) {
      // Provide user-friendly error messages
      let errorMessage = "Failed to fetch previous transaction";
      if (error instanceof Error) {
        const errorMsg = error.message;
        // Check for JSON parsing errors
        if (errorMsg.includes("JSON") || errorMsg.includes("parse") || errorMsg.includes("Unexpected token")) {
          errorMessage = "Unable to read previous transaction data. The transaction may still be processing on Arweave, or the data format is invalid.";
        } else if (errorMsg.includes("pending")) {
          errorMessage = "Previous transaction is still pending on Arweave. Please try again in a few moments.";
        } else {
          errorMessage = errorMsg;
        }
      }
      previousError = errorMessage;
      console.error("Error fetching previous transaction:", error);
    } finally {
      loadingPrevious = false;
    }
  }
</script>

{#if result}
  {#if result.kind === "part"}
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
        <div class="card-header">
          <h3>Summary</h3>
          {#if result.kind === "transaction"}
            <div class="button-group">
              <button
                class="verify-button"
                class:verified={verificationState === "verified"}
                class:failed={verificationState === "failed"}
                disabled={verificationState === "verifying"}
                on:click={handleVerify}
              >
                {#if verificationState === "verified"}
                  ✓ Transaction Verified
                {:else if verificationState === "failed"}
                  ✗ Verification Failed
                {:else if verificationState === "verifying"}
                  Verifying...
                {:else}
                  Verify
                {/if}
              </button>
              {#if verificationState === "verified" || verificationState === "failed"}
                <button
                  class="learn-more-button"
                  on:click={() => dispatch("navigateToVerification")}
                >
                  Learn More
                </button>
              {/if}
            </div>
          {/if}
        </div>
        <dl>
          <div>
            <dt>Transaction ID</dt>
            <dd>{result.transaction._id}</dd>
          </div>
          {#if result.transaction.transaction_number !== undefined}
            <div>
              <dt>Transaction Number</dt>
              <dd>{result.transaction.transaction_number}</dd>
            </div>
          {/if}
          <div>
            <dt>Type</dt>
            <dd>{result.transaction.type || "TRANSACTION"}</dd>
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
            <dt>Arweave Transaction</dt>
            <dd>
              {#if result.transaction.arweaveTxId}
                <a
                  href={getArweaveTxLink(result.transaction.arweaveTxId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="chain-tx-link"
                >
                  {formatAddress(result.transaction.arweaveTxId)}
                </a>
              {:else}
                <span class="text-muted">Not uploaded</span>
              {/if}
            </dd>
          </div>
          <div>
            <dt>Buyer</dt>
            <dd>{result.transaction.buyer ? formatAddress(result.transaction.buyer) : "—"}</dd>
          </div>
          <div>
            <dt>Seller</dt>
            <dd>{result.transaction.seller ? formatAddress(result.transaction.seller) : "—"}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{result.transaction.quantity}</dd>
          </div>
          {#if result.transaction.type === "LISTING_CREATE"}
            <div>
              <dt>Price</dt>
              <dd>{result.transaction.price ? formatAmount(result.transaction.price, "YRT") : "—"}</dd>
            </div>
            <div>
              <dt>Accepted Currencies</dt>
              <dd>
                {#if result.transaction.sellerWallets && Object.keys(result.transaction.sellerWallets).length > 0}
                  {Object.keys(result.transaction.sellerWallets).join(", ")}
                {:else}
                  —
                {/if}
              </dd>
            </div>
          {:else}
            <div>
              <dt>Amount</dt>
              <dd>{formatAmount(result.transaction.amount || "", result.transaction.currency || "")}</dd>
            </div>
            {#if result.transaction.currency}
              <div>
                <dt>Currency</dt>
                <dd>{result.transaction.currency.toUpperCase()}</dd>
              </div>
            {/if}
          {/if}
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
        {#if result.transaction.arweaveTxId}
          <div class="button-group">
            <button
              class="previous-button"
              disabled={loadingPrevious}
              on:click={handlePreviousTransaction}
            >
              {#if loadingPrevious}
                Loading...
              {:else}
                ← Previous Transaction
              {/if}
            </button>
            {#if previousError}
              <p class="error-text">{previousError}</p>
            {/if}
          </div>
        {/if}
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
{/if}

<VerificationModal
  isOpen={verificationModalOpen}
  currentStep={verificationStep}
  checks={verificationChecks}
  isVerifying={verificationState === "verifying"}
  on:close={() => {
    verificationModalOpen = false;
  }}
/>

<style>
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

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 0.75rem;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .card h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .verify-button {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    background: var(--accent);
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: opacity 0.2s ease, background 0.2s ease;
  }

  .verify-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .verify-button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .verify-button.verified {
    background: #10b981;
    border-color: #10b981;
  }

  .verify-button.failed {
    background: #ef4444;
    border-color: #ef4444;
  }

  .learn-more-button {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
    white-space: nowrap;
  }

  .learn-more-button:hover {
    background: var(--card-border);
    color: var(--text-primary);
  }

  .previous-button {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    background: var(--accent);
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: opacity 0.2s ease, background 0.2s ease;
    width: 100%;
    margin-top: 1rem;
  }

  .previous-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .previous-button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .error-text {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }

  @media (max-width: 640px) {
    .card-header {
      flex-direction: column;
      align-items: stretch;
    }

    .button-group {
      width: 100%;
      flex-direction: column;
    }

    .verify-button,
    .learn-more-button {
      width: 100%;
    }
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

