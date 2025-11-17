import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SearchPanel from "../src/lib/components/SearchPanel.svelte";

describe("SearchPanel", () => {
  it("emits search event with current mode and query", async () => {
    const onSearch = vi.fn();
    const { getByLabelText, getByText } = render(SearchPanel, {
      props: {
        mode: "part",
        query: "",
        stores: [],
        onSearch
      }
    });

    const input = getByLabelText("Value") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "part-hash" } });

    const submit = getByText("Search");
    await fireEvent.click(submit);

    expect(onSearch).toHaveBeenCalledWith({ mode: "part", query: "part-hash", storeId: null });
  });

  it("hides store selector when only one store", () => {
    const { queryByLabelText } = render(SearchPanel, {
      props: {
        mode: "part",
        query: "",
        stores: [{ id: "local", name: "Local Store" }]
      }
    });

    expect(queryByLabelText("Store")).toBeNull();
  });

  it("shows store selector when multiple stores", () => {
    const { getByLabelText } = render(SearchPanel, {
      props: {
        mode: "part",
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

  it("emits search event with selected storeId", async () => {
    const onSearch = vi.fn();
    const { getByLabelText, getByText } = render(SearchPanel, {
      props: {
        mode: "part",
        query: "test",
        stores: [
          { id: "local", name: "Local Store" },
          { id: "main", name: "Main Store" }
        ],
        selectedStoreId: "main",
        onSearch
      }
    });

    const submit = getByText("Search");
    await fireEvent.click(submit);

    expect(onSearch).toHaveBeenCalledWith({ mode: "part", query: "test", storeId: "main" });
  });

  it("disables controls while loading", () => {
    const { getByText } = render(SearchPanel, {
      props: {
        mode: "part",
        query: "",
        stores: [],
        loading: true
      }
    });

    const submit = getByText("Searching…") as HTMLButtonElement;
    expect(submit).toBeDisabled();
  });
});

