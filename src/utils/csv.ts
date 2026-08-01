// CSV / list parsing for the batch QR generator. Accepts three shapes:
//   1. "Name,https://url"            (two columns)
//   2. "https://url"                 (one column — name derived from the URL)
//   3. a header row (name,url / label,link) which is detected and skipped
// Pure, DOM-free, and unit-tested.

// RFC 4180-ish field parser: handles quoted fields, escaped "" quotes, and
// commas inside quotes. Splits a single line into cells.
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

// Make a string safe to use as a file name inside the ZIP.
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*]/g, "") // illegal on Windows/most FS
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "") // no leading dots
    .slice(0, 80)
    .trim();
  return cleaned || "qr-code";
}

// Derive a readable label from a URL when no name column is given.
export function nameFromValue(value: string): string {
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    const host = url.hostname.replace(/^www\./, "");
    return host || value;
  } catch {
    return value;
  }
}

export interface BatchRow {
  name: string;
  value: string;
}

const HEADER_WORDS = new Set([
  "name",
  "label",
  "title",
  "url",
  "link",
  "value",
  "website",
  "data",
]);

// A row is a header if every non-empty cell is a known header word.
function looksLikeHeader(cells: string[]): boolean {
  const nonEmpty = cells.filter(Boolean);
  if (nonEmpty.length === 0) return false;
  return nonEmpty.every((c) => HEADER_WORDS.has(c.toLowerCase()));
}

// Parse the pasted/uploaded text into de-duplicated, named rows ready to render.
export function parseBatchInput(text: string): BatchRow[] {
  const lines = (text ?? "")
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: BatchRow[] = [];
  lines.forEach((line, idx) => {
    const cells = parseCsvLine(line);
    if (idx === 0 && looksLikeHeader(cells)) return;

    let name: string;
    let value: string;
    if (cells.length >= 2 && cells[1]) {
      name = cells[0] || nameFromValue(cells[1]);
      value = cells[1];
    } else {
      value = cells[0];
      name = nameFromValue(value);
    }
    if (!value) return;
    rows.push({ name, value });
  });

  return dedupeNames(rows);
}

// Ensure every row has a unique file-safe name (append -2, -3 … on collision).
export function dedupeNames(rows: BatchRow[]): BatchRow[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const base = sanitizeFilename(row.name);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return {
      value: row.value,
      name: count === 0 ? base : `${base}-${count + 1}`,
    };
  });
}
