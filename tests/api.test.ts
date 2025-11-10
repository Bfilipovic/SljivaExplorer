import { afterEach, describe, expect, it, vi } from "vitest";
import { searchExplorer } from "../src/lib/api";

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

describe("searchExplorer", () => {
  it("fetches part data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          mockResponse({
            part: { _id: "hash", part_no: 1, parent_hash: "nft", owner: "0x0", listing: null },
            partialTransactions: [],
            pagination: { total: 1, skip: 0, limit: 50 }
          })
        )
        .mockResolvedValueOnce(
          mockResponse({
            _id: "nft",
            name: "Test NFT",
            description: "Desc",
            creator: "0xabc",
            imageurl: "https://example.com/img.png"
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
});

