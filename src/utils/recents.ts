// "Recent codes" — a small localStorage-backed history so users can jump back
// to something they generated earlier. No backend. Pure helpers around a
// storage-like object so they can be unit-tested with a fake store.

export interface RecentCode {
  type: "link" | "vcard";
  label: string;
  value: string; // the content (URL or share URL) used to regenerate
  ts: number; // epoch ms, for ordering
}

const STORAGE_KEY = "qricard:recents:v1";
const MAX_RECENTS = 8;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStore(store?: StorageLike): StorageLike | null {
  if (store) return store;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadRecents(store?: StorageLike): RecentCode[] {
  const s = safeStore(store);
  if (!s) return [];
  try {
    const raw = s.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentCode[]) : [];
  } catch {
    return [];
  }
}

// Add a code to the top, de-duplicating by value, capping the list length.
// `now` is injectable so tests are deterministic.
export function addRecent(
  entry: Omit<RecentCode, "ts">,
  now: number,
  store?: StorageLike,
): RecentCode[] {
  const s = safeStore(store);
  const existing = loadRecents(store).filter((r) => r.value !== entry.value);
  const next: RecentCode[] = [{ ...entry, ts: now }, ...existing].slice(
    0,
    MAX_RECENTS,
  );
  if (s) {
    try {
      s.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full / unavailable — ignore */
    }
  }
  return next;
}

export function clearRecents(store?: StorageLike): void {
  const s = safeStore(store);
  if (!s) return;
  try {
    s.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export { STORAGE_KEY as RECENTS_STORAGE_KEY, MAX_RECENTS };
