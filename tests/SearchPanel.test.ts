import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SearchPanel from "../src/lib/components/SearchPanel.svelte";

describe("SearchPanel", () => {
  it("calls onSearch with current query on submit", async () => {
    const onSearch = vi.fn();
    const { getByRole } = render(SearchPanel, {
      props: {
        query: "part-hash",
        stores: [],
        onSearch,
      },
    });

    const submit = getByRole("button", { name: "Search" });
    await fireEvent.click(submit);

    expect(onSearch).toHaveBeenCalledWith({ query: "part-hash", storeId: null });
  });

  it("hides store selector when only one store", () => {
    const { queryByLabelText } = render(SearchPanel, {
      props: {
        query: "",
        stores: [{ id: "local", name: "Local Store" }]
      }
    });

    expect(queryByLabelText("Store")).toBeNull();
  });

  it("shows store selector when multiple stores", () => {
    const { getByLabelText } = render(SearchPanel, {
      props: {
        query: "",
        stores: [
          { id: "local", name: "Local Store" },
          { id: "main", name: "Main Store" }
        ]
      }
    });

    const selector = getByLabelText("Store") as HTMLSelectElement;
    expect(selector).toBeDefined();
    expect(selector.options).toHaveLength(3); // "All stores" + 2 stores
  });

  it("calls onSearch with selected storeId", async () => {
    const onSearch = vi.fn();
    const { getByRole } = render(SearchPanel, {
      props: {
        query: "test",
        stores: [
          { id: "local", name: "Local Store" },
          { id: "main", name: "Main Store" }
        ],
        selectedStoreId: "main",
        onSearch,
      }
    });

    const submit = getByRole("button", { name: "Search" });
    await fireEvent.click(submit);

    expect(onSearch).toHaveBeenCalledWith({ query: "test", storeId: "main" });
  });

  it("disables controls while loading", () => {
    const { getByText } = render(SearchPanel, {
      props: {
        query: "",
        stores: [],
        loading: true
      }
    });

    const submit = getByText("Searching…") as HTMLButtonElement;
    expect(submit).toBeDisabled();
  });
});

