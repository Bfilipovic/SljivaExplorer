export type SearchMode = "part" | "transaction";

export interface StoreInfo {
  id: string;
  name: string;
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
  listingId: string;
  reservationId: string;
  buyer: string;
  seller: string;
  nftId: string;
  quantity: number;
  chainTx: string;
  currency: string;
  amount: string;
  timestamp: string;
  storeId?: string;
  storeName?: string;
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
      parts?: ExplorerPart[];
      nft?: ExplorerNFT | null;
      partialTransactions: PartialTransaction[];
      pagination: Pagination | null;
    };

