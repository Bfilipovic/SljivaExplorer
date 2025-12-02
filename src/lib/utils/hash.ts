/**
 * Client-side hash calculation utilities
 * Ported from backend/utils/hash.js for transaction verification
 */

/**
 * Deterministic stringify function for consistent hashing.
 * Handles object key sorting, Date serialization, null/undefined normalization
 */
function deterministicStringify(obj: any): string {
  if (obj === null) {
    return "null";
  }
  if (obj === undefined) {
    return "undefined";
  }
  
  // Handle primitives
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    const items = obj.map(item => deterministicStringify(item));
    return `[${items.join(",")}]`;
  }
  
  // Handle objects - sort keys for consistency
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    const value = obj[key];
    // Skip undefined values to maintain consistency
    if (value === undefined) {
      return null;
    }
    const serializedValue = deterministicStringify(value);
    return `${JSON.stringify(key)}:${serializedValue}`;
  }).filter((pair): pair is string => pair !== null);
  
  return `{${pairs.join(",")}}`;
}

/**
 * Hash an object deterministically using SHA-256
 */
async function hashObject(obj: any): Promise<string> {
  const serialized = deterministicStringify(obj);
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a hashable representation of a Transaction for hashing.
 * Handles different transaction types (TRANSACTION, GIFT, MINT).
 * Excludes _id and arweaveTxId (since _id will be the hash itself).
 */
function hashableTransaction(transaction: any): any {
  const { _id, arweaveTxId, ...rest } = transaction;
  const type = String(rest.type || "TRANSACTION");
  
  const base: any = {
    type,
    transaction_number: Number(rest.transaction_number || 0),
    nftId: String(rest.nftId || ""),
    quantity: Number(rest.quantity || 0),
    chainTx: rest.chainTx !== null && rest.chainTx !== undefined 
      ? String(rest.chainTx) 
      : null,
    currency: String(rest.currency || "ETH"),
    amount: String(rest.amount || "0"),
    timestamp: rest.timestamp instanceof Date 
      ? rest.timestamp 
      : (typeof rest.timestamp === "string" 
          ? new Date(rest.timestamp) 
          : new Date(rest.timestamp || Date.now())),
  };
  
  // Add type-specific fields
  if (type === "GIFT") {
    // For GIFT: explorer API maps giver->seller, receiver->buyer for display
    // Hash needs giver and receiver, so reconstruct from buyer/seller
    base.giver = String(rest.giver || rest.seller || "").toLowerCase();
    base.receiver = String(rest.receiver || rest.buyer || "").toLowerCase();
  } else if (type === "MINT") {
    const minter = String(rest.buyer || rest.seller || rest.creator || "").toLowerCase();
    base.buyer = minter;
    base.seller = minter;
  } else {
    // TRANSACTION type
    // Only include listingId/reservationId if they exist and are not empty
    if (rest.listingId !== null && rest.listingId !== undefined && String(rest.listingId).trim() !== "") {
      base.listingId = String(rest.listingId);
    } else {
      base.listingId = null;
    }
    if (rest.reservationId !== null && rest.reservationId !== undefined && String(rest.reservationId).trim() !== "") {
      base.reservationId = String(rest.reservationId);
    } else {
      base.reservationId = null;
    }
    base.buyer = String(rest.buyer || "").toLowerCase();
    base.seller = String(rest.seller || "").toLowerCase();
  }
  
  return base;
}

/**
 * Calculate the expected hash for a transaction
 */
export async function calculateTransactionHash(transaction: any): Promise<string> {
  const hashable = hashableTransaction(transaction);
  return await hashObject(hashable);
}

