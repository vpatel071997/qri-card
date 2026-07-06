import { dataUrlToBytes, buildJpegPdf, jpegDataUrlToPdfBlob } from "./pdf";

// Minimal fake JPEG payload (SOI + EOI markers) — enough to exercise embedding.
const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const FAKE_JPEG_DATA_URL =
  "data:image/jpeg;base64," +
  btoa(
    Array.from(FAKE_JPEG)
      .map((c) => String.fromCharCode(c))
      .join(""),
  );

const decode = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("dependency-free PDF export", () => {
  it("decodes a base64 data URL to the exact bytes", () => {
    expect(Array.from(dataUrlToBytes(FAKE_JPEG_DATA_URL))).toEqual(
      Array.from(FAKE_JPEG),
    );
  });

  it("produces a structurally valid single-image PDF", () => {
    const pdf = buildJpegPdf(FAKE_JPEG, 200, 300);
    const text = decode(pdf);

    expect(text.startsWith("%PDF-1.3")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/MediaBox [0 0 200 300]");
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).toContain(`/Length ${FAKE_JPEG.length}`);
    // The raw JPEG bytes must be embedded verbatim between the stream markers.
    expect(text).toContain("stream\n\xff\xd8\xff\xd9\nendstream");
    // xref table + trailer must reference all 5 objects (+ free entry).
    expect(text).toContain("/Size 6");
    expect(text).toContain("/Root 1 0 R");
  });

  it("declares the startxref offset at the actual xref position", () => {
    const pdf = buildJpegPdf(FAKE_JPEG, 10, 10);
    const text = decode(pdf);
    const xrefPos = text.indexOf("xref\n0 6");
    const declared = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(declared).toBe(xrefPos);
  });

  it("wraps everything into an application/pdf blob", () => {
    const blob = jpegDataUrlToPdfBlob(FAKE_JPEG_DATA_URL, 50, 50);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});
