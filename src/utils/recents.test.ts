import {
  loadRecents,
  addRecent,
  clearRecents,
  RECENTS_STORAGE_KEY,
  MAX_RECENTS,
} from "./recents";

// Minimal in-memory Storage-like double.
function fakeStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  };
}

describe("recents", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(loadRecents(fakeStore())).toEqual([]);
  });

  it("adds an entry to the top with a timestamp", () => {
    const s = fakeStore();
    const list = addRecent(
      { type: "link", label: "Google", value: "https://google.com" },
      1000,
      s,
    );
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      type: "link",
      label: "Google",
      value: "https://google.com",
      ts: 1000,
    });
    // Persisted under the versioned key.
    expect(s.getItem(RECENTS_STORAGE_KEY)).toContain("Google");
  });

  it("orders newest first", () => {
    const s = fakeStore();
    addRecent({ type: "link", label: "A", value: "a" }, 1, s);
    const list = addRecent({ type: "link", label: "B", value: "b" }, 2, s);
    expect(list.map((r) => r.label)).toEqual(["B", "A"]);
  });

  it("de-duplicates by value, moving the repeat to the top", () => {
    const s = fakeStore();
    addRecent({ type: "link", label: "A", value: "x" }, 1, s);
    addRecent({ type: "link", label: "B", value: "y" }, 2, s);
    const list = addRecent({ type: "link", label: "A2", value: "x" }, 3, s);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ label: "A2", value: "x", ts: 3 });
  });

  it(`caps the list at ${MAX_RECENTS}`, () => {
    const s = fakeStore();
    let list: ReturnType<typeof addRecent> = [];
    for (let i = 0; i < MAX_RECENTS + 5; i++) {
      list = addRecent({ type: "link", label: `L${i}`, value: `v${i}` }, i, s);
    }
    expect(list).toHaveLength(MAX_RECENTS);
    // Newest kept, oldest dropped.
    expect(list[0].value).toBe(`v${MAX_RECENTS + 4}`);
  });

  it("clears the history", () => {
    const s = fakeStore();
    addRecent({ type: "link", label: "A", value: "a" }, 1, s);
    clearRecents(s);
    expect(loadRecents(s)).toEqual([]);
  });

  it("survives corrupt stored JSON", () => {
    const s = fakeStore();
    s.setItem(RECENTS_STORAGE_KEY, "{not json");
    expect(loadRecents(s)).toEqual([]);
  });
});
