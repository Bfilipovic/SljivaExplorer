<script lang="ts">
  // This component displays the verification and Arweave documentation
</script>

<div class="verification-content">
  <section>
    <h3>🔐 Hash-Based Transaction Verification</h3>
    
    <h4>What is Hash-Based Verification?</h4>
    <p>
      Every transaction in our system has a unique identifier (transaction ID) that is <strong>cryptographically derived from the transaction data itself</strong>. This means:
    </p>
    <ul>
      <li><strong>The transaction ID is not arbitrary</strong>—it's mathematically computed from all the transaction fields</li>
      <li><strong>Any modification to transaction data</strong> would produce a completely different ID</li>
      <li><strong>You can independently verify</strong> that a transaction's ID matches its data</li>
    </ul>

    <h4>How It Works</h4>
    <p>When a transaction is created, we:</p>
    <ol>
      <li><strong>Collect all transaction fields</strong> (type, buyer, seller, amount, timestamp, transaction number, etc.)</li>
      <li><strong>Normalize the data</strong> (sort fields, convert dates to ISO format, lowercase addresses)</li>
      <li><strong>Compute a SHA-256 hash</strong> of the normalized data</li>
      <li><strong>Use that hash as the transaction ID</strong></li>
    </ol>
    <p>This process ensures that:</p>
    <ul>
      <li>✅ Same data always produces the same hash</li>
      <li>✅ Different data always produces a different hash</li>
      <li>✅ No central authority assigns IDs—they're mathematically determined</li>
    </ul>

    <h4>Example: Verifying a Transaction</h4>
    <p>Let's say you want to verify transaction <code>7bac446323d968f034fbc35e01c35fa90efe8b34cf5ff9bb6f14308ae4f1a5c8</code>.</p>
    
    <div class="code-block">
      <pre>{`{
  "type": "TRANSACTION",
  "transaction_number": 1,
  "nftId": "aa3b6c028ee5966d67195ba8906e46899b6f5557f3043fe08712991f9f4a898e",
  "buyer": "0xc074dadc902ea5540aed7c5ca6634708bb4d9474",
  "seller": "0x3aa0dd7bc8b16825f3c14fc9b4bf745ac60c9de0",
  "quantity": 2,
  "chainTx": "0x3b59d1f89e55f590df7a1686b6d1b16aebd419776798266167351d547b6305fa",
  "currency": "ETH",
  "amount": "0.001",
  "timestamp": "2025-12-02T01:56:14.000Z"
}`}</pre>
    </div>

    <p><strong>You can verify it yourself:</strong></p>
    <ol>
      <li><strong>Normalize the data</strong> (sort fields, convert timestamps, lowercase addresses)</li>
      <li><strong>Serialize deterministically</strong> to a string</li>
      <li><strong>Compute SHA-256 hash</strong> of that string</li>
      <li><strong>Compare</strong> the computed hash with the transaction ID</li>
    </ol>

    <p>If they match, you can be 100% certain that:</p>
    <ul>
      <li>✅ The transaction data has not been tampered with</li>
      <li>✅ The transaction ID was correctly generated from the data</li>
      <li>✅ The transaction is authentic</li>
    </ul>

    <p><strong>Try it yourself:</strong> Click the "Verify" button on any transaction to see our automatic verification process in action.</p>
  </section>

  <section>
    <h3>🔗 Permanent Storage on Arweave</h3>

    <h4>Why Arweave?</h4>
    <p>While our database stores transaction data for quick access, we also upload every transaction to <strong>Arweave</strong>, a permanent, decentralized storage network. Arweave provides:</p>
    <ul>
      <li><strong>Permanent storage</strong> — Data stored on Arweave is designed to last for hundreds of years</li>
      <li><strong>Decentralization</strong> — No single point of failure, data replicated across the network</li>
      <li><strong>Immutable</strong> — Once stored, data cannot be altered</li>
      <li><strong>Publicly verifiable</strong> — Anyone can fetch and verify transactions independently</li>
    </ul>

    <h4>Transaction Chaining: Complete Audit Trail</h4>
    <p>Every transaction we upload to Arweave includes a link to the <strong>previous transaction</strong>. This creates an unbreakable chronological chain:</p>
    
    <div class="code-block">
      <pre>{`Transaction #10 → Previous: Transaction #9
Transaction #9  → Previous: Transaction #8
Transaction #8  → Previous: Transaction #7
...
Transaction #1  → Previous: null (first transaction)`}</pre>
    </div>

    <p>This means:</p>
    <ul>
      <li>✅ <strong>Complete history</strong> — You can trace every transaction from the latest back to the first</li>
      <li>✅ <strong>No gaps</strong> — Every transaction links to the previous one</li>
      <li>✅ <strong>Independent verification</strong> — You can reconstruct the entire transaction history from Arweave alone</li>
    </ul>

    <h4>Sequential Transaction Numbers</h4>
    <p>Each transaction is assigned a <strong>sequential number</strong> starting from 1:</p>
    <ul>
      <li>Transaction #1: The first transaction on the platform</li>
      <li>Transaction #2: The second transaction</li>
      <li>Transaction #3: The third transaction</li>
      <li>And so on...</li>
    </ul>

    <p>These numbers are:</p>
    <ul>
      <li>✅ <strong>Included in the hash</strong> — So they cannot be altered without changing the transaction ID</li>
      <li>✅ <strong>Immutable</strong> — Once assigned, they never change</li>
      <li>✅ <strong>Global</strong> — Every transaction across all stores has a unique number</li>
    </ul>
  </section>

  <section>
    <h3>🔍 Multi-Layer Verification</h3>
    <p>Our verification system performs multiple checks:</p>
    
    <div class="check-list">
      <div class="check-item">
        <strong>1. Hash Calculation Check ✅</strong>
        <p>Verifies that the transaction ID matches the computed hash from transaction data. If this fails, the transaction data has been tampered with.</p>
      </div>
      <div class="check-item">
        <strong>2. Transaction Structure Check ✅</strong>
        <p>Validates that all required fields are present. Ensures data integrity and completeness.</p>
      </div>
      <div class="check-item">
        <strong>3. Arweave Transaction Found ✅</strong>
        <p>Confirms the transaction exists on Arweave's permanent storage. Provides the Arweave transaction ID for independent verification.</p>
      </div>
      <div class="check-item">
        <strong>4. Arweave Transaction ID Match ✅</strong>
        <p>Verifies that the transactionId stored on Arweave matches the local transaction ID. Ensures consistency between local database and Arweave storage.</p>
      </div>
      <div class="check-item">
        <strong>5. Arweave Data Integrity Check ✅</strong>
        <p>Compares all transaction fields between local database and Arweave. Verifies that every field matches exactly (buyer, seller, amount, timestamp, etc.).</p>
      </div>
    </div>
  </section>

  <section>
    <h3>🛡️ Why This Matters: Security & Trust</h3>

    <h4>Protection Against:</h4>
    <ul>
      <li>✅ <strong>Data tampering</strong> — Any modification would break the hash</li>
      <li>✅ <strong>Unauthorized changes</strong> — Impossible without recalculating the hash</li>
      <li>✅ <strong>Database corruption</strong> — Arweave serves as an immutable backup</li>
      <li>✅ <strong>Centralized control</strong> — You can verify everything independently</li>
    </ul>

    <h4>What You Can Verify:</h4>
    <ol>
      <li><strong>Transaction authenticity</strong> — Hash matches the data</li>
      <li><strong>Data integrity</strong> — All fields are present and valid</li>
      <li><strong>Permanent storage</strong> — Transaction exists on Arweave</li>
      <li><strong>Complete history</strong> — Follow the chain back to transaction #1</li>
      <li><strong>No tampering</strong> — Local and Arweave data match perfectly</li>
    </ol>
  </section>

  <section>
    <h3>💡 Why You Can Trust This System</h3>
    <ol>
      <li><strong>Mathematical Proof</strong> — Hashes are mathematically derived, not assigned</li>
      <li><strong>Open Source</strong> — All verification code is available for inspection</li>
      <li><strong>Independent Verification</strong> — You can verify without our servers</li>
      <li><strong>Permanent Storage</strong> — Arweave ensures data survives forever</li>
      <li><strong>Complete Transparency</strong> — Every transaction is publicly verifiable</li>
      <li><strong>No Single Point of Failure</strong> — Data exists in database AND Arweave</li>
      <li><strong>Chronological Chain</strong> — Complete history from transaction #1 to present</li>
    </ol>

    <div class="highlight-box">
      <p><strong>Built on cryptographic proof, not promises. Verify everything yourself.</strong></p>
    </div>
  </section>

  <section>
    <h3>🚀 Getting Started</h3>
    
    <h4>To find the latest transaction:</h4>
    <ol>
      <li>Navigate to the <strong>"Our Network"</strong> page</li>
      <li>Find the store card for the store you're interested in</li>
      <li>The <strong>Last Transaction</strong> section shows the most recent transaction ID</li>
      <li>Click the copy button (📋) next to the transaction ID to copy it to your clipboard</li>
      <li>You can then search for this transaction ID or verify it</li>
    </ol>

    <h4>To verify a transaction:</h4>
    <ol>
      <li>Search for a transaction on this explorer (or use the latest transaction ID from the store card)</li>
      <li>Click the <strong>"Verify"</strong> button</li>
      <li>Watch the automatic verification process</li>
      <li>Review all verification checks (all should show ✓)</li>
      <li>Click <strong>"Learn More"</strong> to understand the technical details</li>
    </ol>

    <h4>To view on Arweave:</h4>
    <ol>
      <li>Find the transaction's Arweave transaction ID</li>
      <li>Visit any Arweave explorer (e.g., viewblock.io)</li>
      <li>Enter the transaction ID</li>
      <li>View the raw transaction data</li>
      <li>Verify the hash yourself</li>
    </ol>
  </section>

  <section>
    <h3>📚 Additional Resources</h3>
    <ul>
      <li><strong>Hash Verification Documentation</strong>: See <code>backend/docs/HASH_VERIFICATION.md</code></li>
      <li><strong>Arweave Integration Details</strong>: See <code>backend/docs/ARWEAVE_INTEGRATION.md</code></li>
      <li><strong>Arweave Explorer</strong>: <a href="https://viewblock.io/arweave" target="_blank" rel="noopener noreferrer">https://viewblock.io/arweave</a></li>
      <li><strong>Arweave Gateway</strong>: <a href="https://arweave.net" target="_blank" rel="noopener noreferrer">https://arweave.net</a></li>
    </ul>
  </section>
</div>

<style>
  .verification-content {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    max-width: 900px;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    border-bottom: 2px solid var(--card-border);
    padding-bottom: 0.5rem;
  }

  h4 {
    margin: 0.5rem 0 0.25rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    line-height: 1.7;
    color: var(--text-secondary);
  }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  li {
    margin: 0.5rem 0;
  }

  code {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 4px;
    padding: 0.125rem 0.375rem;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    color: var(--text-primary);
  }

  .code-block {
    margin: 1rem 0;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
  }

  .code-block pre {
    margin: 0;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-primary);
  }

  .check-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin: 1rem 0;
  }

  .check-item {
    padding: 1rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    border-left: 4px solid var(--accent);
  }

  .check-item strong {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  .check-item p {
    margin: 0;
    color: var(--text-secondary);
  }

  .highlight-box {
    margin: 1.5rem 0;
    padding: 1.5rem;
    background: var(--card-bg);
    border: 2px solid var(--accent);
    border-radius: 8px;
    text-align: center;
  }

  .highlight-box p {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  a {
    color: var(--accent);
    text-decoration: none;
  }

  a {
    word-break: break-word;
  }

  a:hover {
    text-decoration: underline;
  }

  /* Mobile responsive styles */
  @media (max-width: 768px) {
    .verification-content {
      gap: 2rem;
      max-width: 100%;
      width: 100%;
      overflow-x: hidden;
    }

    h3 {
      font-size: 1.5rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    h4 {
      font-size: 1.1rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    p {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    ul, ol {
      padding-left: 1.25rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    li {
      word-wrap: break-word;
      overflow-wrap: break-word;
      margin: 0.75rem 0;
    }

    code {
      word-break: break-all;
      overflow-wrap: break-word;
      font-size: 0.85em;
      display: inline-block;
      max-width: 100%;
    }

    .code-block {
      padding: 0.75rem;
      margin: 0.75rem 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      max-width: 100%;
      box-sizing: border-box;
    }

    .code-block pre {
      font-size: 0.75rem;
      white-space: pre;
      overflow-x: auto;
      word-break: normal;
      overflow-wrap: normal;
    }

    .check-item {
      padding: 0.75rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .check-item strong {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .check-item p {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .highlight-box {
      padding: 1rem;
      margin: 1rem 0;
    }

    .highlight-box p {
      font-size: 1rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
  }
</style>

