import { crc32, createZip, createZipBlob } from "./zip";

const enc = (s: string) => new TextEncoder().encode(s);

describe("crc32", () => {
  it("is 0 for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("matches the standard CRC-32 check value", () => {
    // The canonical CRC-32 check string "123456789" -> 0xCBF43926.
    expect(crc32(enc("123456789"))).toBe(0xcbf43926);
  });

  it("returns an unsigned 32-bit value", () => {
    const v = crc32(enc("hello world"));
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("createZip", () => {
  const fixedDate = new Date(2020, 0, 1, 0, 0, 0);

  it("starts with the local file header signature (PK\\x03\\x04)", () => {
    const zip = createZip([{ name: "a.txt", data: "hi" }], fixedDate);
    expect([zip[0], zip[1], zip[2], zip[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it("ends with the end-of-central-directory signature (PK\\x05\\x06)", () => {
    const zip = createZip([{ name: "a.txt", data: "hi" }], fixedDate);
    // EOCD is the last 22 bytes (no archive comment).
    const eocd = zip.length - 22;
    expect([zip[eocd], zip[eocd + 1], zip[eocd + 2], zip[eocd + 3]]).toEqual([
      0x50, 0x4b, 0x05, 0x06,
    ]);
  });

  it("records the correct entry count in the EOCD", () => {
    const zip = createZip(
      [
        { name: "a.txt", data: "1" },
        { name: "b.txt", data: "2" },
        { name: "c.txt", data: "3" },
      ],
      fixedDate,
    );
    const eocd = zip.length - 22;
    // total entries is a little-endian u16 at EOCD offset +10.
    const total = zip[eocd + 10] | (zip[eocd + 11] << 8);
    expect(total).toBe(3);
  });

  it("embeds the file name bytes in the archive", () => {
    const zip = createZip([{ name: "hello.txt", data: "x" }], fixedDate);
    const text = new TextDecoder().decode(zip);
    expect(text).toContain("hello.txt");
  });

  it("stores the payload uncompressed (STORE) so the data is present verbatim", () => {
    const zip = createZip([{ name: "a.txt", data: "PLAINTEXT" }], fixedDate);
    const text = new TextDecoder().decode(zip);
    expect(text).toContain("PLAINTEXT");
  });

  it("produces a stable byte length for identical input + date", () => {
    const a = createZip([{ name: "a.txt", data: "hi" }], fixedDate);
    const b = createZip([{ name: "a.txt", data: "hi" }], fixedDate);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("handles an empty archive", () => {
    const zip = createZip([], fixedDate);
    // Just the 22-byte EOCD record.
    expect(zip.length).toBe(22);
    expect([zip[0], zip[1], zip[2], zip[3]]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });
});

describe("createZipBlob", () => {
  it("returns an application/zip Blob", () => {
    const blob = createZipBlob(
      [{ name: "a.txt", data: "hi" }],
      new Date(2020, 0, 1),
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(0);
  });
});
