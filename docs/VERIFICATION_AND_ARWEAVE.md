# Transaction Verification & Arweave Storage

## Trust Through Transparency: How We Guarantee Transaction Integrity

At SljivaStore, we believe that trust in a decentralized marketplace must be built on cryptographic proof, not promises. Every transaction on our platform is verifiable by anyone, at any time, using standard cryptographic tools. You don't need to trust us—you can verify everything yourself.

---

## 🔐 Hash-Based Transaction Verification

### What is Hash-Based Verification?

Every transaction in our system has a unique identifier (transaction ID) that is **cryptographically derived from the transaction data itself**. This means:

- **The transaction ID is not arbitrary**—it's mathematically computed from all the transaction fields
- **Any modification to transaction data** would produce a completely different ID
- **You can independently verify** that a transaction's ID matches its data

### How It Works

When a transaction is created, we:

1. **Collect all transaction fields** (type, buyer, seller, amount, timestamp, transaction number, etc.)
2. **Normalize the data** (sort fields, convert dates to ISO format, lowercase addresses)
3. **Compute a SHA-256 hash** of the normalized data
4. **Use that hash as the transaction ID**

This process ensures that:
- ✅ Same data always produces the same hash
- ✅ Different data always produces a different hash
- ✅ No central authority assigns IDs—they're mathematically determined

### Example: Verifying a Transaction

Let's say you want to verify transaction `7bac446323d968f034fbc35e01c35fa90efe8b34cf5ff9bb6f14308ae4f1a5c8`.

**Transaction Data:**
```json
{
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
}
```

**You can verify it yourself:**

1. **Normalize the data** (sort fields, convert timestamps, lowercase addresses)
2. **Serialize deterministically** to a string
3. **Compute SHA-256 hash** of that string
4. **Compare** the computed hash with the transaction ID

If they match, you can be 100% certain that:
- ✅ The transaction data has not been tampered with
- ✅ The transaction ID was correctly generated from the data
- ✅ The transaction is authentic

**Try it yourself:** Click the "Verify" button on any transaction to see our automatic verification process in action.

---

## 🔗 Permanent Storage on Arweave

### Why Arweave?

While our database stores transaction data for quick access, we also upload every transaction to **Arweave**, a permanent, decentralized storage network. Arweave provides:

- **Permanent storage** — Data stored on Arweave is designed to last for hundreds of years
- **Decentralization** — No single point of failure, data replicated across the network
- **Immutable** — Once stored, data cannot be altered
- **Publicly verifiable** — Anyone can fetch and verify transactions independently

### Transaction Chaining: Complete Audit Trail

Every transaction we upload to Arweave includes a link to the **previous transaction**. This creates an unbreakable chronological chain:

```
Transaction #10 → Previous: Transaction #9
Transaction #9  → Previous: Transaction #8
Transaction #8  → Previous: Transaction #7
...
Transaction #1  → Previous: null (first transaction)
```

This means:
- ✅ **Complete history** — You can trace every transaction from the latest back to the first
- ✅ **No gaps** — Every transaction links to the previous one
- ✅ **Independent verification** — You can reconstruct the entire transaction history from Arweave alone

### Sequential Transaction Numbers

Each transaction is assigned a **sequential number** starting from 1:

- Transaction #1: The first transaction on the platform
- Transaction #2: The second transaction
- Transaction #3: The third transaction
- And so on...

These numbers are:
- ✅ **Included in the hash** — So they cannot be altered without changing the transaction ID
- ✅ **Immutable** — Once assigned, they never change
- ✅ **Global** — Every transaction across all stores has a unique number

### What Gets Stored on Arweave?

Every transaction uploaded to Arweave includes:

1. **All transaction fields** (type, buyer, seller, amount, etc.)
2. **Transaction number** (sequential identifier)
3. **Local transaction ID** (the hash-based ID for verification)
4. **Previous Arweave transaction ID** (link to previous transaction)
5. **Blockchain transaction hash** (if applicable)
6. **Timestamp** (when the transaction occurred)

### Example: Complete Transaction Record

When you view a transaction on Arweave, you'll see:

```json
{
  "transactionId": "7bac446323d968f034fbc35e01c35fa90efe8b34cf5ff9bb6f14308ae4f1a5c8",
  "transaction_number": 10,
  "previous_arweave_tx": "xyz789...",
  "type": "TRANSACTION",
  "buyer": "0xc074dadc902ea5540aed7c5ca6634708bb4d9474",
  "seller": "0x3aa0dd7bc8b16825f3c14fc9b4bf745ac60c9de0",
  "nftId": "aa3b6c028ee5966d67195ba8906e46899b6f5557f3043fe08712991f9f4a898e",
  "quantity": 2,
  "chainTx": "0x3b59d1f89e55f590df7a1686b6d1b16aebd419776798266167351d547b6305fa",
  "currency": "ETH",
  "amount": "0.001",
  "timestamp": "2025-12-02T01:56:14.000Z"
}
```

**You can verify this independently:**
1. Extract all fields except `transactionId` and `previous_arweave_tx`
2. Compute the hash using the same algorithm
3. Compare with `transactionId` — they should match perfectly

---

## 🔍 Multi-Layer Verification

Our verification system performs multiple checks:

### 1. Hash Calculation Check ✅
- Verifies that the transaction ID matches the computed hash from transaction data
- If this fails, the transaction data has been tampered with

### 2. Transaction Structure Check ✅
- Validates that all required fields are present
- Ensures data integrity and completeness

### 3. Arweave Transaction Found ✅
- Confirms the transaction exists on Arweave's permanent storage
- Provides the Arweave transaction ID for independent verification

### 4. Arweave Transaction ID Match ✅
- Verifies that the `transactionId` stored on Arweave matches the local transaction ID
- Ensures consistency between local database and Arweave storage

### 5. Transaction Signature Check ✅
- Verifies that the transaction is cryptographically signed by the appropriate party
- Confirms that the signer matches the expected role (buyer, seller, giver, etc.)
- Ensures the signature is present and valid
- The signature proves authorization and prevents forgery

### 6. Arweave Data Integrity Check ✅
- Compares all transaction fields between local database and Arweave
- Verifies that every field matches exactly (buyer, seller, amount, timestamp, signature, etc.)
- Includes signature fields in the comparison to ensure they match on Arweave

---

## 🛡️ Why This Matters: Security & Trust

### Protection Against:
- ✅ **Data tampering** — Any modification would break the hash
- ✅ **Unauthorized changes** — Impossible without recalculating the hash
- ✅ **Database corruption** — Arweave serves as an immutable backup
- ✅ **Centralized control** — You can verify everything independently

### What You Can Verify:
1. **Transaction authenticity** — Hash matches the data
2. **Data integrity** — All fields are present and valid
3. **Permanent storage** — Transaction exists on Arweave
4. **Complete history** — Follow the chain back to transaction #1
5. **No tampering** — Local and Arweave data match perfectly

---

## 📊 Real-World Example: Tracing a Transaction

Let's trace a real transaction through the system:

**Step 1:** You find a transaction ID: `7bac446323d968f034fbc35e01c35fa90efe8b34cf5ff9bb6f14308ae4f1a5c8`

**Step 2:** View the transaction details:
- Transaction #10
- Buyer: `0xc074...`
- Seller: `0x3aa0...`
- Amount: 0.001 ETH
- Arweave ID: `xyz789...`

**Step 3:** Click "Verify" — Our system automatically:
- Calculates the hash from transaction data
- Fetches the transaction from Arweave
- Compares every field
- Shows you all verification checks

**Step 4:** Independently verify on Arweave:
- Visit the Arweave explorer
- Enter the Arweave transaction ID
- View the raw transaction data
- Verify the hash yourself

**Step 5:** Trace the history:
- Click the "← Previous Transaction" button on transaction #10
- The system automatically fetches transaction #9 from Arweave and displays it
- Click "← Previous Transaction" again to go to transaction #8
- Repeat back to transaction #1
- You now have the complete history

---

## 🔬 Technical Details

### Hash Algorithm
- **Algorithm**: SHA-256
- **Serialization**: Deterministic JSON (sorted keys, normalized values)
- **Included in hash**: All transaction fields + transaction_number + signer + signature
- **Excluded from hash**: `_id` (it IS the hash), `arweaveTxId` (set after upload), `previous_arweave_tx` (metadata)

### Verification Process
1. Normalize transaction data
2. Serialize deterministically
3. Compute SHA-256 hash (includes signature fields)
4. Compare with transaction ID
5. Verify signature is present and signer matches expected role
6. Fetch from Arweave (if available)
7. Compare all fields (including signature and signer)

### Transaction Types
- **MINT**: NFT creation and part minting (signed by minter)
- **LISTING_CREATE**: Creating a listing (signed by seller)
- **LISTING_CANCEL**: Cancelling a listing (signed by seller)
- **NFT_BUY**: Buying an NFT (signed by buyer)
- **GIFT_CREATE**: Creating a gift (signed by giver)
- **GIFT_CLAIM**: Claiming a gift (signed by receiver)
- **GIFT_REFUSE**: Refusing a gift (signed by receiver)
- **GIFT_CANCEL**: Cancelling a gift (signed by giver)

All types use the same verification process, include cryptographic signatures, and are stored on Arweave.

---

## ✍️ Transaction Signatures

### Why Signatures Matter

Every state-changing transaction in our system is cryptographically signed by the appropriate party. This ensures:

- ✅ **Authorization** — Only the owner of a wallet can authorize transactions
- ✅ **Non-repudiation** — The signer cannot later deny authorizing the transaction
- ✅ **Security** — Transactions cannot be forged or modified
- ✅ **Audit Trail** — Every transaction includes proof of who authorized it

### Who Signs What?

Different transaction types require signatures from different parties:

- **MINT** — Signed by the minter/creator
- **LISTING_CREATE** — Signed by the seller
- **LISTING_CANCEL** — Signed by the seller
- **NFT_BUY** — Signed by the buyer
- **GIFT_CREATE** — Signed by the giver
- **GIFT_CLAIM** — Signed by the receiver
- **GIFT_REFUSE** — Signed by the receiver
- **GIFT_CANCEL** — Signed by the giver

### How Signatures Work

When you perform an action (like buying an NFT or creating a listing):

1. You provide your 12-word mnemonic phrase (this **never leaves your device**)
2. The system creates a cryptographic signature using your wallet's private key
3. The signature is included in the transaction data
4. The transaction hash includes the signature, making it part of the immutable record
5. The signature is stored both locally and on Arweave for permanent verification

**Your private keys never leave your device.** All signing happens locally in your browser, ensuring maximum security.

### Signature Verification

- **Included in hash**: The `signer` and `signature` fields are part of the transaction data that gets hashed
- **Verification**: Every transaction includes proof of who authorized it
- **Storage**: Signatures are stored both locally and on Arweave for permanent verification
- **Security**: Private keys never leave the user's device; all signing happens client-side

---

## ⏮️ Navigating Transaction History

### Previous Transaction Button

Every transaction stored on Arweave includes a link to the previous transaction. This creates a complete, unbreakable chain of all transactions from the first to the most recent.

When viewing a transaction in the explorer, you'll see a **"← Previous Transaction"** button at the bottom of the transaction summary box. This button:

1. Fetches the current transaction from Arweave
2. Extracts the `previous_arweave_tx` field
3. Fetches that previous transaction from Arweave
4. Gets its local transaction ID (the `transactionId` field stored in Arweave)
5. Automatically searches for and displays the previous transaction

This allows you to:

- ✅ **Trace history** — Follow transactions back to the very first one
- ✅ **Verify integrity** — Ensure the chain is unbroken
- ✅ **Audit independently** — Reconstruct the entire transaction history from Arweave

**Note:** When you navigate to a previous transaction, the verification button resets so you can verify the new transaction independently.

---

## 💡 Why You Can Trust This System

1. **Mathematical Proof** — Hashes are mathematically derived, not assigned
2. **Open Source** — All verification code is available for inspection
3. **Independent Verification** — You can verify without our servers
4. **Permanent Storage** — Arweave ensures data survives forever
5. **Complete Transparency** — Every transaction is publicly verifiable
6. **No Single Point of Failure** — Data exists in database AND Arweave
7. **Chronological Chain** — Complete history from transaction #1 to present

---

## 🚀 Getting Started

**To find the latest transaction:**

1. Navigate to the **"Our Network"** page
2. Find the store card for the store you're interested in
3. The **Last Transaction** section shows the most recent transaction ID
4. Click the copy button (📋) next to the transaction ID to copy it to your clipboard
5. You can then search for this transaction ID or verify it

**To verify a transaction:**

1. Search for a transaction on this explorer (or use the latest transaction ID from the store card)
2. Click the **"Verify"** button
3. Watch the automatic verification process
4. Review all verification checks (all should show ✓):
   - Hash Calculation Check
   - Transaction Structure Check
   - Transaction Signature Check
   - Arweave Transaction Found
   - Arweave Transaction ID Match
   - Arweave Data Integrity Check
5. Click **"Learn More"** to understand the technical details

**To navigate transaction history:**

1. When viewing any transaction, look for the **"← Previous Transaction"** button at the bottom of the transaction summary
2. Click the button to automatically fetch and display the previous transaction in the chain
3. The button fetches from Arweave to get the `previous_arweave_tx` field, then finds that transaction's local ID
4. Repeat to trace all the way back to the first transaction
5. Note: The verification button resets when navigating to a new transaction, so you can verify each one independently

**To view on Arweave:**

1. Find the transaction's Arweave transaction ID
2. Visit any Arweave explorer (e.g., viewblock.io)
3. Enter the transaction ID
4. View the raw transaction data
5. Verify the hash yourself

---

## ❓ Frequently Asked Questions

**Q: What if the hash doesn't match?**
A: This would indicate data tampering. Our verification system will immediately detect and report this.

**Q: Can transactions be deleted?**
A: Transactions stored on Arweave are permanent and cannot be deleted. The database transaction may be removed, but the Arweave copy remains forever.

**Q: How long does verification take?**
A: Usually less than 2 seconds. The process involves calculating a hash (instant) and fetching from Arweave (1-2 seconds).

**Q: Do I need to trust you?**
A: No. You can verify everything independently using standard cryptographic tools. Our system is transparent by design.

**Q: What happens if Arweave goes down?**
A: Our database maintains a copy of all transactions. Arweave serves as permanent backup, but we can still operate from our database.

---

## 📚 Additional Resources

- **Hash Verification Documentation**: See `backend/docs/HASH_VERIFICATION.md`
- **Arweave Integration Details**: See `backend/docs/ARWEAVE_INTEGRATION.md`
- **Arweave Explorer**: https://viewblock.io/arweave
- **Arweave Gateway**: https://arweave.net

---

**Built on cryptographic proof, not promises. Verify everything yourself.**

