/**
 * Client-side hash calculation utilities
 * Ported from backend/utils/hash.js for transaction verification
 * 
 * IMPORTANT: This must match backend/utils/hash.js exactly!
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
 * MUST MATCH backend/utils/hash.js hashableTransaction() exactly!
 * 
 * Handles all transaction types:
 * - MINT
 * - LISTING_CREATE
 * - LISTING_CANCEL
 * - NFT_BUY
 * - GIFT_CREATE
 * - GIFT_CLAIM
 * - GIFT_REFUSE
 * - GIFT_CANCEL
 * 
 * Excludes _id and arweaveTxId (since _id will be the hash itself).
 * Includes signer and signature fields if present.
 */
function hashableTransaction(transaction: any): any {
  // Exclude technical metadata that should not be in hash
  const { _id, arweaveTxId, previous_arweave_tx, ...rest } = transaction;
  const type = String(rest.type || "");
  
  // Base fields present in all transaction types
  const base: any = {
    type,
    transaction_number: Number(rest.transaction_number || 0),
    timestamp: rest.timestamp instanceof Date 
      ? rest.timestamp 
      : new Date(rest.timestamp || Date.now()),
  };
  
  // Type-specific field handling - MUST MATCH BACKEND EXACTLY
  switch (type) {
    case "MINT": {
      const minter = String(rest.buyer || rest.seller || rest.creator || "").toLowerCase();
      base.nftId = String(rest.nftId || "");
      base.quantity = Number(rest.quantity || 0);
      base.buyer = minter;
      base.seller = minter;
      base.chainTx = rest.chainTx !== null && rest.chainTx !== undefined 
        ? String(rest.chainTx) 
        : null;
      base.currency = String(rest.currency || "ETH");
      base.amount = String(rest.amount || "0");
      // Include signature fields
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    case "LISTING_CREATE": {
      base.listingId = rest.listingId !== null && rest.listingId !== undefined 
        ? String(rest.listingId) 
        : null;
      base.nftId = String(rest.nftId || "");
      base.seller = String(rest.seller || "").toLowerCase();
      base.quantity = Number(rest.quantity || 0);
      base.price = String(rest.price || "");
      base.currency = String(rest.currency || "");
      if (rest.sellerWallets && typeof rest.sellerWallets === 'object') {
        // Sort wallet keys for deterministic hashing
        base.sellerWallets = Object.keys(rest.sellerWallets).sort().reduce((acc: any, key: string) => {
          acc[key] = String(rest.sellerWallets[key]);
          return acc;
        }, {} as any);
      }
      base.bundleSale = rest.bundleSale === true || rest.bundleSale === "true";
      // Include signature fields
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    case "LISTING_CANCEL": {
      base.listingId = rest.listingId !== null && rest.listingId !== undefined 
        ? String(rest.listingId) 
        : null;
      base.seller = String(rest.seller || "").toLowerCase();
      // Include signature fields
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    case "NFT_BUY": {
      base.listingId = rest.listingId !== null && rest.listingId !== undefined 
        ? String(rest.listingId) 
        : null;
      base.reservationId = rest.reservationId !== null && rest.reservationId !== undefined 
        ? String(rest.reservationId) 
        : null;
      base.nftId = String(rest.nftId || "");
      base.buyer = String(rest.buyer || "").toLowerCase();
      base.seller = String(rest.seller || "").toLowerCase();
      base.quantity = Number(rest.quantity || 0);
      base.chainTx = rest.chainTx !== null && rest.chainTx !== undefined 
        ? String(rest.chainTx) 
        : null;
      base.currency = String(rest.currency || "ETH");
      base.amount = String(rest.amount || "0");
      // Include signature fields
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    case "GIFT_CREATE": {
      base.giftId = rest.giftId !== null && rest.giftId !== undefined 
        ? String(rest.giftId) 
        : null;
      base.nftId = String(rest.nftId || "");
      // Explorer API maps giver->seller, receiver->buyer - reconstruct original fields
      base.giver = String(rest.giver || rest.seller || "").toLowerCase();
      base.receiver = String(rest.receiver || rest.buyer || "").toLowerCase();
      base.quantity = Number(rest.quantity || 0);
      // Include signature fields
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    case "GIFT_CLAIM": {
      base.giftId = rest.giftId !== null && rest.giftId !== undefined 
        ? String(rest.giftId) 
        : null;
      base.nftId = String(rest.nftId || "");
      // Explorer API maps giver->seller, receiver->buyer - reconstruct original fields
      base.giver = String(rest.giver || rest.seller || "").toLowerCase();
      base.receiver = String(rest.receiver || rest.buyer || "").toLowerCase();
      base.quantity = Number(rest.quantity || 0);
      base.chainTx = rest.chainTx !== null && rest.chainTx !== undefined 
        ? String(rest.chainTx) 
        : null;
      base.currency = String(rest.currency || "ETH");
      base.amount = String(rest.amount || "0");
      // Include signature fields
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    case "GIFT_REFUSE": {
      base.giftId = rest.giftId !== null && rest.giftId !== undefined 
        ? String(rest.giftId) 
        : null;
      // Explorer API maps giver->seller, receiver->buyer - reconstruct original fields
      base.giver = String(rest.giver || rest.seller || "").toLowerCase();
      base.receiver = String(rest.receiver || rest.buyer || "").toLowerCase();
      // Include signature fields
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    case "GIFT_CANCEL": {
      base.giftId = rest.giftId !== null && rest.giftId !== undefined 
        ? String(rest.giftId) 
        : null;
      // Explorer API maps giver->seller, receiver->buyer - reconstruct original fields
      base.giver = String(rest.giver || rest.seller || "").toLowerCase();
      base.receiver = String(rest.receiver || rest.buyer || "").toLowerCase();
      // Include signature fields
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    // Legacy types for backward compatibility
    case "TRANSACTION": {
      // Legacy TRANSACTION type - map to NFT_BUY structure
      base.listingId = rest.listingId !== null && rest.listingId !== undefined 
        ? String(rest.listingId) 
        : null;
      base.reservationId = rest.reservationId !== null && rest.reservationId !== undefined 
        ? String(rest.reservationId) 
        : null;
      base.nftId = String(rest.nftId || "");
      base.buyer = String(rest.buyer || "").toLowerCase();
      base.seller = String(rest.seller || "").toLowerCase();
      base.quantity = Number(rest.quantity || 0);
      base.chainTx = rest.chainTx !== null && rest.chainTx !== undefined 
        ? String(rest.chainTx) 
        : null;
      base.currency = String(rest.currency || "ETH");
      base.amount = String(rest.amount || "0");
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    case "GIFT": {
      // Legacy GIFT type - map to GIFT_CLAIM structure
      base.nftId = String(rest.nftId || "");
      // Explorer API maps giver->seller, receiver->buyer - reconstruct original fields
      base.giver = String(rest.giver || rest.seller || "").toLowerCase();
      base.receiver = String(rest.receiver || rest.buyer || "").toLowerCase();
      base.quantity = Number(rest.quantity || 0);
      base.chainTx = rest.chainTx !== null && rest.chainTx !== undefined 
        ? String(rest.chainTx) 
        : null;
      base.currency = String(rest.currency || "ETH");
      base.amount = String(rest.amount || "0");
      if (rest.signer) base.signer = String(rest.signer).toLowerCase();
      if (rest.signature) base.signature = String(rest.signature);
      break;
    }
    
    default:
      throw new Error(`Unknown transaction type: ${type}`);
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
