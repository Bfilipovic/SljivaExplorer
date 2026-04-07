import { afterEach, describe, expect, it, vi } from "vitest";
import { searchExplorer, fetchStores, fetchTransactionParts } from "../src/lib/api";

function mockResponse(response: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(response),
    status: ok ? 200 : 500
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchStores", () => {
  it("fetches store list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse([
          { id: "local", name: "Local Store" },
          { id: "main", name: "Main Store" }
        ])
      )
    );

    const stores = await fetchStores();
    expect(stores).toHaveLength(2);
    expect(stores[0].id).toBe("local");
    expect(stores[0].name).toBe("Local Store");
  });

  it("throws on error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })
    );

    await expect(fetchStores()).rejects.toThrow();
  });
});

describe("searchExplorer", () => {
  it("fetches part data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse({
          part: { _id: "hash", part_no: 1, parent_hash: "nft", owner: "0x0", listing: null },
          nft: {
            _id: "nft",
            name: "Test NFT",
            description: "Desc",
            creator: "0xabc",
            imageurl: "https://example.com/img.png"
          },
          partialTransactions: [],
          pagination: { total: 1, skip: 0, limit: 50 }
        })
      )
    );

    const result = await searchExplorer("part", "hash");
    expect(result.kind).toBe("part");
    if (result.kind === "part") {
      expect(result.part._id).toBe("hash");
      expect(result.nft?.imageurl).toBe("https://example.com/img.png");
    }
  });

  it("includes storeId in query params when provided", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce(
      mockResponse({
        part: { _id: "hash", part_no: 1, parent_hash: "nft", owner: "0x0", listing: null },
        partialTransactions: [],
        pagination: { total: 1, skip: 0, limit: 50 }
      })
    );

    await searchExplorer("part", "hash", { storeId: "main" });

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall[0]).toContain("storeId=main");
  });

  it("throws on error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: "Not found" })
      })
    );

    await expect(searchExplorer("part", "missing")).rejects.toThrow("Not found");
  });

  it("transaction mode uses /transactions/lookup", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValue(
      mockResponse({
        transaction: {
          _id: "507f1f77bcf86cd799439011",
          type: "MINT",
          timestamp: "2020-01-01T00:00:00.000Z",
          quantity: 1
        },
        matchedBy: "_id"
      })
    );

    const result = await searchExplorer("transaction", "507f1f77bcf86cd799439011");
    expect(result.kind).toBe("transaction");
    if (result.kind === "transaction") {
      expect(result.transaction._id).toBe("507f1f77bcf86cd799439011");
      expect(result.matchedBy).toBe("_id");
      expect(result.partsLoaded).toBe(false);
      expect(result.parts).toEqual([]);
    }
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/transactions/lookup");
    expect(url).toContain("q=");
  });

  it("fetchTransactionParts requests paginated parts path", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      mockResponse({
        parts: [],
        pagination: { total: 0, skip: 0, limit: 50 }
      })
    );

    await fetchTransactionParts("507f1f77bcf86cd799439011", { page: 1, storeId: "main" });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/transactions/id/");
    expect(url).toContain("/parts");
    expect(url).toContain("skip=50");
    expect(url).toContain("storeId=main");
  });
});

