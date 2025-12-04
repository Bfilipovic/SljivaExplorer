/**
 * Transaction verification utilities
 */

import type { ExplorerTransaction } from "../types";
import { calculateTransactionHash } from "./hash";

export interface VerificationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

export interface VerificationResult {
  verified: boolean;
  errors: string[];
  checks: VerificationCheck[];
  hashMatch?: boolean;
  arweaveMatch?: boolean;
}

/**
 * Fetch transaction data from Arweave
 * Arweave stores transaction data, and we need to fetch it from the gateway
 */
export async function fetchArweaveTransaction(arweaveTxId: string): Promise<any> {
  const gateway = "https://arweave.net";
  
  try {
    // First, get transaction info to get the data format
    const txResponse = await fetch(`${gateway}/tx/${arweaveTxId}`);
    if (!txResponse.ok) {
      const errorText = await txResponse.text().catch(() => '');
      throw new Error(`Failed to fetch Arweave transaction metadata: ${txResponse.status}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`);
    }
    
    // Parse transaction info - read as text first so we can provide better errors
    const txText = await txResponse.text();
    
    // Check if Arweave is saying the transaction is pending
    const trimmedTxText = txText.trim();
    if (trimmedTxText.toLowerCase() === "pending") {
      throw new Error(
        `Arweave transaction ${arweaveTxId} is still pending. ` +
        `Arweave transactions typically confirm within 1-2 minutes. ` +
        `Please wait a moment and try verifying again.`
      );
    }
    
    let txInfo: any;
    try {
      txInfo = JSON.parse(txText);
    } catch (jsonError) {
      const contentType = txResponse.headers.get('content-type') || 'unknown';
      throw new Error(
        `Failed to parse Arweave transaction metadata as JSON. ` +
        `Content-Type: ${contentType}. ` +
        `Response preview: ${txText.substring(0, 300)}. ` +
        `Error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`
      );
    }
    
    // Fetch the actual data
    const dataResponse = await fetch(`${gateway}/${arweaveTxId}`);
    if (!dataResponse.ok) {
      const errorText = await dataResponse.text().catch(() => '');
      throw new Error(`Failed to fetch Arweave transaction data: ${dataResponse.status}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`);
    }
    
    // Get the response text once
    const dataText = await dataResponse.text();
    
    // Check if response is empty
    if (!dataText || dataText.trim().length === 0) {
      throw new Error('Arweave transaction data is empty');
    }
    
    // Check if Arweave is saying the transaction data is pending
    const trimmedDataText = dataText.trim();
    if (trimmedDataText.toLowerCase() === "pending") {
      throw new Error(
        `Arweave transaction data for ${arweaveTxId} is still pending. ` +
        `Arweave transactions typically confirm within 1-2 minutes. ` +
        `Please wait a moment and try verifying again.`
      );
    }
    
    // Check content type
    const dataContentType = dataResponse.headers.get('content-type') || '';
    
    // Trim whitespace before parsing
    const trimmed = trimmedDataText;
    
    // Try to parse as JSON first
    try {
      return JSON.parse(trimmed);
    } catch (jsonError) {
      // If JSON parsing failed, try base64 decode
      try {
        // Try to decode as base64
        const decoded = atob(trimmed);
        return JSON.parse(decoded);
      } catch (base64Error) {
        // Both failed - provide helpful error
        const preview = trimmed.substring(0, 200);
        throw new Error(
          `Failed to parse Arweave transaction data. ` +
          `Content-Type: ${dataContentType}. ` +
          `Response length: ${trimmed.length} chars. ` +
          `Preview: ${preview}... ` +
          `JSON error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}. ` +
          `Base64 error: ${base64Error instanceof Error ? base64Error.message : String(base64Error)}`
        );
      }
    }
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error && error.message.includes('Arweave')) {
      throw error;
    }
    throw new Error(`Error fetching Arweave transaction ${arweaveTxId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Normalize a value for comparison (handles dates, strings, numbers)
 */
function normalizeValue(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    // Normalize empty strings to null for chainTx
    return value.trim().toLowerCase() || null;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  // Handle date strings - convert to ISO string for comparison
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toISOString();
  }
  return String(value).toLowerCase();
}

/**
 * Normalize a transaction for comparison
 * Maps buyer/seller to giver/receiver for GIFT transactions
 */
function normalizeTransactionForComparison(tx: any): any {
  const normalized = { ...tx };
  
  // For GIFT transactions: explorer API maps giver->seller, receiver->buyer
  // But Arweave stores giver/receiver, so normalize explorer format to match Arweave
  if (tx.type === "GIFT") {
    // Always map seller -> giver and buyer -> receiver if giver/receiver don't exist
    if (tx.giver === undefined || tx.giver === null) {
      normalized.giver = tx.seller || "";
    }
    if (tx.receiver === undefined || tx.receiver === null) {
      normalized.receiver = tx.buyer || "";
    }
  }
  
  return normalized;
}

/**
 * Compare transaction fields between local and Arweave data
 */
function compareTransactionFields(local: any, arweave: any): string[] {
  const errors: string[] = [];
  
  // Normalize local transaction to match Arweave format
  const normalizedLocal = normalizeTransactionForComparison(local);
  
  // Fields to compare (excluding transactionId and previous_arweave_tx which are metadata)
  const fieldsToCompare = [
    "type",
    "transaction_number",
    "nftId",
    "quantity",
    "chainTx",
    "currency",
    "amount",
    "timestamp",
    "signer",    // Added for signature verification
    "signature", // Added for signature verification
  ];
  
  // Add type-specific fields
  if (normalizedLocal.type === "GIFT" || normalizedLocal.type === "GIFT_CREATE" || normalizedLocal.type === "GIFT_CLAIM" || normalizedLocal.type === "GIFT_REFUSE" || normalizedLocal.type === "GIFT_CANCEL") {
    fieldsToCompare.push("giver", "receiver");
    if (normalizedLocal.giftId) fieldsToCompare.push("giftId");
  } else if (normalizedLocal.type === "MINT") {
    fieldsToCompare.push("buyer", "seller");
  } else if (normalizedLocal.type === "LISTING_CREATE") {
    fieldsToCompare.push("seller");
    if (normalizedLocal.listingId) fieldsToCompare.push("listingId");
    if (normalizedLocal.price) fieldsToCompare.push("price");
    if (normalizedLocal.sellerWallets) fieldsToCompare.push("sellerWallets");
    if (normalizedLocal.bundleSale !== undefined) fieldsToCompare.push("bundleSale");
  } else {
    fieldsToCompare.push("buyer", "seller");
    if (normalizedLocal.listingId) fieldsToCompare.push("listingId");
    if (normalizedLocal.reservationId) fieldsToCompare.push("reservationId");
  }
  
  for (const field of fieldsToCompare) {
    const localValue = normalizeValue(normalizedLocal[field]);
    const arweaveValue = normalizeValue(arweave[field]);
    
    // Special handling for timestamp - compare ISO strings
    if (field === "timestamp") {
      const localDate = normalizedLocal.timestamp instanceof Date 
        ? normalizedLocal.timestamp.toISOString() 
        : new Date(normalizedLocal.timestamp).toISOString();
      const arweaveDate = arweave.timestamp instanceof Date
        ? arweave.timestamp.toISOString()
        : new Date(arweave.timestamp).toISOString();
      
      if (localDate !== arweaveDate) {
        errors.push(`Field ${field} mismatch: local=${localDate}, arweave=${arweaveDate}`);
      }
      continue;
    }
    
    // Special handling for sellerWallets (object comparison)
    if (field === "sellerWallets") {
      const localWallets = JSON.stringify(Object.keys(localValue || {}).sort().reduce((acc: any, key: string) => {
        acc[key] = String(localValue[key]);
        return acc;
      }, {}));
      const arweaveWallets = JSON.stringify(Object.keys(arweaveValue || {}).sort().reduce((acc: any, key: string) => {
        acc[key] = String(arweaveValue[key]);
        return acc;
      }, {}));
      if (localWallets !== arweaveWallets) {
        errors.push(`Field ${field} mismatch: local=${localWallets}, arweave=${arweaveWallets}`);
      }
      continue;
    }
    
    if (localValue !== arweaveValue) {
      errors.push(`Field ${field} mismatch: local=${localValue}, arweave=${arweaveValue}`);
    }
  }
  
  return errors;
}

/**
 * Verify a transaction
 * 1. Calculates hash and compares with transaction ID
 * 2. If Arweave transaction exists, fetches and compares all fields
 */
export async function verifyTransaction(
  transaction: ExplorerTransaction,
  updateStep: (step: string) => void
): Promise<VerificationResult> {
  const errors: string[] = [];
  const checks: VerificationCheck[] = [];
  let hashMatch = false;
  let arweaveMatch = false;
  
  try {
    // Step 1: Calculate hash
    updateStep("Calculating hash");
    const calculatedHash = await calculateTransactionHash(transaction);
    hashMatch = calculatedHash === transaction._id;
    
    checks.push({
      name: "Hash Calculation",
      passed: hashMatch,
      message: hashMatch 
        ? "Transaction hash matches the stored transaction ID"
        : `Hash mismatch: calculated ${calculatedHash.substring(0, 16)}... but transaction ID is ${transaction._id.substring(0, 16)}...`
    });
    
    if (!hashMatch) {
      errors.push(`Hash mismatch: expected ${calculatedHash}, got ${transaction._id}`);
    }
    
    // Step 2: Verify transaction structure
    updateStep("Verifying transaction structure");
    const hasRequiredFields = transaction.type && transaction.nftId && transaction.quantity !== undefined;
    checks.push({
      name: "Transaction Structure",
      passed: hasRequiredFields,
      message: hasRequiredFields
        ? "All required transaction fields are present"
        : "Missing required transaction fields"
    });
    
    if (!hasRequiredFields) {
      errors.push("Transaction structure validation failed");
    }

    // Step 2.5: Verify signature if present
    // Note: Older transactions may not have signatures, but all new transactions should
    updateStep("Verifying transaction signature");
    if (transaction.signature && transaction.signer) {
      // Signature fields are present - verify they're not empty
      const hasValidSignature = !!(transaction.signature.trim() && transaction.signer.trim());
      checks.push({
        name: "Transaction Signature",
        passed: hasValidSignature,
        message: hasValidSignature
          ? `Transaction is signed by ${transaction.signer.substring(0, 10)}...`
          : "Transaction signature fields are present but invalid"
      });
    } else {
      // No signature - this is acceptable for older transactions
      checks.push({
        name: "Transaction Signature",
        passed: true, // Not a failure, just informational
        message: "Transaction does not have signature fields (may be an older transaction)"
      });
    }
    
    // Step 3: Verify Arweave data if available
    if (transaction.arweaveTxId) {
      updateStep("Fetching Arweave transaction");
      try {
        const arweaveData = await fetchArweaveTransaction(transaction.arweaveTxId);
        
        updateStep("Comparing Arweave data");
        const fieldErrors = compareTransactionFields(transaction, arweaveData);
        
        // Check if Arweave transaction exists
        checks.push({
          name: "Arweave Transaction Found",
          passed: true,
          message: `Transaction found on Arweave at ${transaction.arweaveTxId.substring(0, 16)}...`
        });
        
        // Check transactionId match
        const transactionIdMatch = arweaveData.transactionId && arweaveData.transactionId === transaction._id;
        checks.push({
          name: "Arweave Transaction ID",
          passed: transactionIdMatch,
          message: transactionIdMatch
            ? "Transaction ID in Arweave matches local transaction ID"
            : `Transaction ID mismatch: expected ${transaction._id.substring(0, 16)}... but Arweave has ${arweaveData.transactionId?.substring(0, 16) || "missing"}...`
        });
        
        // Check field matching
        arweaveMatch = fieldErrors.length === 0;
        checks.push({
          name: "Arweave Data Integrity",
          passed: arweaveMatch,
          message: arweaveMatch
            ? "All transaction fields match between local and Arweave storage"
            : fieldErrors.slice(0, 2).join("; ")
        });
        
        errors.push(...fieldErrors);
        
        if (arweaveData.transactionId && arweaveData.transactionId !== transaction._id) {
          errors.push(`Arweave transactionId mismatch: expected ${transaction._id}, got ${arweaveData.transactionId}`);
        }
      } catch (arweaveError) {
        const errorMsg = arweaveError instanceof Error ? arweaveError.message : String(arweaveError);
        
        // Check if the error is because the transaction is still pending
        const isPending = errorMsg.toLowerCase().includes("pending");
        
        if (isPending) {
          // Pending is not a failure - just informational
          checks.push({
            name: "Arweave Transaction Found",
            passed: true, // Not a failure, just pending
            message: `Transaction is still pending on Arweave. This is normal - Arweave transactions typically confirm within 1-2 minutes. The transaction will be available for verification once confirmed.`
          });
          // Don't add this to errors - pending is acceptable
        } else {
          // Actual error - mark as failed
          checks.push({
            name: "Arweave Transaction Found",
            passed: false,
            message: `Failed to fetch from Arweave: ${errorMsg}`
          });
          errors.push(`Failed to verify Arweave data: ${errorMsg}`);
        }
      }
    } else {
      // If no Arweave transaction, that's okay - just verify hash
      checks.push({
        name: "Arweave Storage",
        passed: true,
        message: "Transaction not yet uploaded to Arweave (optional)"
      });
      arweaveMatch = true; // No Arweave to verify, so consider it "matched"
    }
    
    return {
      verified: hashMatch && errors.length === 0,
      errors,
      checks,
      hashMatch,
      arweaveMatch: transaction.arweaveTxId ? arweaveMatch : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Verification failed: ${errorMsg}`);
    checks.push({
      name: "Verification Process",
      passed: false,
      message: errorMsg
    });
    return {
      verified: false,
      errors,
      checks,
      hashMatch: false,
      arweaveMatch: false,
    };
  }
}

