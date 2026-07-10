// Dependency-free ZIP writer (STORE / no compression). Matches the codebase's
// "write it ourselves rather than pull an optional-dep-laden library" rule that
// gave us utils/pdf.ts (see CLAUDE.md — jspdf/jszip-style dynamic imports break
// the `npm ci --omit=optional` install). PNG/SVG payloads are already
// compressed, so STORE costs us nothing meaningful and keeps the format simple.

export interface ZipEntry {
  name: string;
  // Raw file bytes. Strings are UTF-8 encoded.
  data: Uint8Array | string;
}

// Standard CRC-32 (IEEE 802.3), lazily-built lookup table.
let CRC_TABLE: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  CRC_TABLE = table;
  return table;
}

export function crc32(bytes: Uint8Array): number {
  const table = crcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(data: Uint8Array | string): Uint8Array {
  return typeof data === "string" ? new TextEncoder().encode(data) : data;
}

// DOS date/time encoding for the archive entries.
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f);
  const d =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time: time & 0xffff, date: d & 0xffff };
}

// Little-endian push helpers.
function pushU16(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff);
}
function pushU32(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}
function pushBytes(arr: number[], bytes: Uint8Array) {
  for (let i = 0; i < bytes.length; i++) arr.push(bytes[i]);
}

// Build a valid ZIP archive from the given entries.
export function createZip(
  entries: ZipEntry[],
  date: Date = new Date(),
): Uint8Array {
  const { time, date: dosDate } = dosDateTime(date);
  const encoder = new TextEncoder();

  const out: number[] = [];
  const central: number[] = [];

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = toBytes(entry.data);
    const crc = crc32(dataBytes);
    const offset = out.length;
    const FLAG_UTF8 = 0x0800;

    // ---- Local file header ----
    pushU32(out, 0x04034b50);
    pushU16(out, 20); // version needed
    pushU16(out, FLAG_UTF8);
    pushU16(out, 0); // compression: store
    pushU16(out, time);
    pushU16(out, dosDate);
    pushU32(out, crc);
    pushU32(out, dataBytes.length); // compressed size
    pushU32(out, dataBytes.length); // uncompressed size
    pushU16(out, nameBytes.length);
    pushU16(out, 0); // extra length
    pushBytes(out, nameBytes);
    pushBytes(out, dataBytes);

    // ---- Central directory header ----
    pushU32(central, 0x02014b50);
    pushU16(central, 20); // version made by
    pushU16(central, 20); // version needed
    pushU16(central, FLAG_UTF8);
    pushU16(central, 0); // compression: store
    pushU16(central, time);
    pushU16(central, dosDate);
    pushU32(central, crc);
    pushU32(central, dataBytes.length);
    pushU32(central, dataBytes.length);
    pushU16(central, nameBytes.length);
    pushU16(central, 0); // extra length
    pushU16(central, 0); // comment length
    pushU16(central, 0); // disk number start
    pushU16(central, 0); // internal attrs
    pushU32(central, 0); // external attrs
    pushU32(central, offset); // local header offset
    pushBytes(central, nameBytes);
  });

  const centralOffset = out.length;
  pushBytes(out, Uint8Array.from(central));

  // ---- End of central directory ----
  pushU32(out, 0x06054b50);
  pushU16(out, 0); // disk number
  pushU16(out, 0); // disk with central dir
  pushU16(out, entries.length); // entries on this disk
  pushU16(out, entries.length); // total entries
  pushU32(out, central.length); // central dir size
  pushU32(out, centralOffset); // central dir offset
  pushU16(out, 0); // comment length

  return Uint8Array.from(out);
}

export function createZipBlob(entries: ZipEntry[], date?: Date): Blob {
  const bytes = createZip(entries, date);
  // Copy into a fresh ArrayBuffer so the Blob is not backed by a typed-array view.
  return new Blob([bytes.slice().buffer], { type: "application/zip" });
}
