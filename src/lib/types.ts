export type SearchMode = "part" | "transaction";

export type TransactionLookupMatchedBy = "_id" | "arweaveTxId" | "chainTx";

export interface StoreInfo {
  id: string;
  name: string;
  baseUrl: string;
  website?: string;
  icon?: string | null;
}

export interface ExplorerPart {
  _id: string;
  part_no: number;
  parent_hash: string;
  owner: string;
  listing: string | null;
  storeId?: string;
  storeName?: string;
}

export interface ExplorerNFT {
  _id: string;
  name: string;
  description: string;
  creator: string;
  imageurl?: string;
}

export interface Pagination {
  total: number;
  skip: number;
  limit: number;
}

export interface PartialTransaction {
  part: string;
  txId?: string;
  transaction?: string;
  from: string;
  to: string;
  nftId: string;
  chainTx: string;
  currency: string;
  amount: string;
  timestamp: string;
  storeId?: string;
  storeName?: string;
}

export interface ExplorerTransaction {
  _id: string;
  type: "TRANSACTION" | "GIFT" | "MINT" | "LISTING_CREATE" | "LISTING_CANCEL" | "NFT_BUY" | "GIFT_CREATE" | "GIFT_CLAIM" | "GIFT_REFUSE" | "GIFT_CANCEL";
  transaction_number?: number;
  listingId?: string;
  reservationId?: string;
  buyer?: string;
  seller?: string;
  nftId?: string;
  quantity?: number;
  chainTx?: string;
  currency?: string;
  amount?: string;
  arweaveTxId?: string;
  timestamp: string;
  storeId?: string;
  storeName?: string;
  // Signature fields (for verification)
  signer?: string;
  signature?: string;
  // Gift-specific fields
  giver?: string;
  receiver?: string;
  giftId?: string;
  // Listing-specific fields
  price?: string;
  sellerWallets?: Record<string, string>;
  bundleSale?: boolean;
}

export type ExplorerResult =
  | {
      kind: "part";
      part: ExplorerPart;
      nft: ExplorerNFT | null;
      partialTransactions: PartialTransaction[];
      pagination: Pagination;
    }
  | {
      kind: "transaction";
      transaction: ExplorerTransaction;
      matchedBy?: TransactionLookupMatchedBy;
      /** Populated after explicit “Load parts” + paging. */
      parts: ExplorerPart[];
      partsLoaded: boolean;
      partsNote?: string | null;
      nft?: ExplorerNFT | null;
      partialTransactions: PartialTransaction[];
      pagination: Pagination | null;
    };

