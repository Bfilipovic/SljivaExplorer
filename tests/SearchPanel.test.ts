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
        onSearch
      }
    });

    const input = getByLabelText("Value") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "part-hash" } });

    const submit = getByText("Search");
    await fireEvent.click(submit);

    expect(onSearch).toHaveBeenCalledWith({ mode: "part", query: "part-hash" });
  });

  it("disables controls while loading", () => {
    const { getByText } = render(SearchPanel, {
      props: {
        mode: "part",
        query: "",
        loading: true
      }
    });

    const submit = getByText("Searching…") as HTMLButtonElement;
    expect(submit).toBeDisabled();
  });
});

