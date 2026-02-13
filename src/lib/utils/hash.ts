/**
 * Client-side hash calculation utilities
 * Ported from backend/utils/hash.js for transaction verification
 * 
 * IMPORTANT: This must match backend/utils/hash.js exactly!
 * 
 * UPDATED: Now uses unified structure for all transaction types (standardized)
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
 * All transactions now have the same structure with consistent fields.
 * Excludes technical metadata (_id, arweaveTxId, previous_arweave_tx).
 * Excludes imageUrl (for display only, not part of hash).
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
 * - UPLOAD
 */
function hashableTransaction(transaction: any): any {
  // Exclude technical metadata that should not be in hash
  const { _id, arweaveTxId, previous_arweave_tx, imageUrl, ...rest } = transaction;
  
  // Normalize all fields consistently - all transactions now have the same structure
  const base: any = {
    type: String(rest.type || ""),
    transaction_number: Number(rest.transaction_number || 0),
    timestamp: rest.timestamp instanceof Date 
      ? rest.timestamp 
      : new Date(rest.timestamp || Date.now()),
    // Entity references
    listingId: rest.listingId !== null && rest.listingId !== undefined 
      ? String(rest.listingId) 
      : null,
    reservationId: rest.reservationId !== null && rest.reservationId !== undefined 
      ? String(rest.reservationId) 
      : null,
    giftId: rest.giftId !== null && rest.giftId !== undefined 
      ? String(rest.giftId) 
      : null,
    // NFT/Part fields
    nftId: rest.nftId !== null && rest.nftId !== undefined 
      ? String(rest.nftId) 
      : null,
    quantity: Number(rest.quantity || 0),
    // Party fields
    buyer: rest.buyer !== null && rest.buyer !== undefined 
      ? String(rest.buyer).toLowerCase() 
      : null,
    seller: rest.seller !== null && rest.seller !== undefined 
      ? String(rest.seller).toLowerCase() 
      : null,
    giver: rest.giver !== null && rest.giver !== undefined 
      ? String(rest.giver).toLowerCase() 
      : null,
    receiver: rest.receiver !== null && rest.receiver !== undefined 
      ? String(rest.receiver).toLowerCase() 
      : null,
    // Chain transaction fields
    // Normalize empty strings to null for consistency
    chainTx: (rest.chainTx !== null && rest.chainTx !== undefined && String(rest.chainTx).trim() !== "") 
      ? String(rest.chainTx) 
      : null,
    currency: (rest.currency !== null && rest.currency !== undefined && String(rest.currency).trim() !== "") 
      ? String(rest.currency) 
      : null,
    amount: (rest.amount !== null && rest.amount !== undefined && String(rest.amount).trim() !== "") 
      ? String(rest.amount) 
      : null,
    // Listing-specific fields
    price: rest.price !== null && rest.price !== undefined 
      ? String(rest.price) 
      : null,
    sellerWallets: (rest.sellerWallets && typeof rest.sellerWallets === 'object' && Object.keys(rest.sellerWallets).length > 0) 
      ? Object.keys(rest.sellerWallets).sort().reduce((acc: any, key: string) => {
          acc[key] = String(rest.sellerWallets[key]);
          return acc;
        }, {})
      : null,
    bundleSale: rest.bundleSale !== null && rest.bundleSale !== undefined
      ? (rest.bundleSale === true || rest.bundleSale === "true")
      : null,
    // Upload-specific fields
    uploadId: rest.uploadId !== null && rest.uploadId !== undefined 
      ? String(rest.uploadId) 
      : null,
    uploadedimageurl: (rest.uploadedimageurl !== null && rest.uploadedimageurl !== undefined && String(rest.uploadedimageurl).trim() !== "") 
      ? String(rest.uploadedimageurl) 
      : null,
    uploadedimagedescription: (rest.uploadedimagedescription !== null && rest.uploadedimagedescription !== undefined && String(rest.uploadedimagedescription).trim() !== "") 
      ? String(rest.uploadedimagedescription) 
      : null,
    uploadedimagename: (rest.uploadedimagename !== null && rest.uploadedimagename !== undefined && String(rest.uploadedimagename).trim() !== "") 
      ? String(rest.uploadedimagename) 
      : null,
    // Verification fields (for first upload)
    isVerificationConfirmation: rest.isVerificationConfirmation !== null && rest.isVerificationConfirmation !== undefined
      ? (rest.isVerificationConfirmation === true || rest.isVerificationConfirmation === "true")
      : null,
    verifiedUserUsername: (rest.verifiedUserUsername !== null && rest.verifiedUserUsername !== undefined && String(rest.verifiedUserUsername).trim() !== "") 
      ? String(rest.verifiedUserUsername) 
      : null,
    verifiedUserBio: (rest.verifiedUserBio !== null && rest.verifiedUserBio !== undefined && String(rest.verifiedUserBio).trim() !== "") 
      ? String(rest.verifiedUserBio) 
      : null,
    verifiedUserEmail: (rest.verifiedUserEmail !== null && rest.verifiedUserEmail !== undefined && String(rest.verifiedUserEmail).trim() !== "") 
      ? String(rest.verifiedUserEmail) 
      : null,
    verifiedUserFullName: (rest.verifiedUserFullName !== null && rest.verifiedUserFullName !== undefined && String(rest.verifiedUserFullName).trim() !== "") 
      ? String(rest.verifiedUserFullName) 
      : null,
    verifiedUserCountry: (rest.verifiedUserCountry !== null && rest.verifiedUserCountry !== undefined && String(rest.verifiedUserCountry).trim() !== "") 
      ? String(rest.verifiedUserCountry) 
      : null,
    verifiedUserCity: (rest.verifiedUserCity !== null && rest.verifiedUserCity !== undefined && String(rest.verifiedUserCity).trim() !== "") 
      ? String(rest.verifiedUserCity) 
      : null,
    verifiedUserPhysicalAddress: (rest.verifiedUserPhysicalAddress !== null && rest.verifiedUserPhysicalAddress !== undefined && String(rest.verifiedUserPhysicalAddress).trim() !== "") 
      ? String(rest.verifiedUserPhysicalAddress) 
      : null,
    // Signature fields
    signer: rest.signer !== null && rest.signer !== undefined 
      ? String(rest.signer).toLowerCase() 
      : null,
    signature: rest.signature !== null && rest.signature !== undefined 
      ? String(rest.signature) 
      : null,
  };
  
  return base;
}

/**
 * Calculate the expected hash for a transaction
 */
export async function calculateTransactionHash(transaction: any): Promise<string> {
  const hashable = hashableTransaction(transaction);
  return await hashObject(hashable);
}

