import {
  dataUrlToBytes,
  buildJpegPdf,
  jpegDataUrlToPdfBlob,
  buildLabelSheetPdf,
  labelSheetPdfBlob,
  LabelImage,
} from "./pdf";

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

describe("label-sheet (Avery) PDF export", () => {
  const mkLabels = (n: number): LabelImage[] =>
    Array.from({ length: n }, (_, i) => ({
      jpeg: FAKE_JPEG,
      name: `Item ${i + 1}`,
    }));

  it("produces a structurally valid multi-image PDF", () => {
    const pdf = buildLabelSheetPdf(mkLabels(3), 200);
    const text = decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/BaseFont /Helvetica");
    expect(text).toContain("/Filter /DCTDecode");
    // One image XObject per label.
    expect((text.match(/\/Subtype \/Image/g) || []).length).toBe(3);
    // Each caption is drawn.
    expect(text).toContain("(Item 1)");
    expect(text).toContain("(Item 3)");
  });

  it("paginates: 3x6 grid => 18 per page, so 20 labels span 2 pages", () => {
    const pdf = buildLabelSheetPdf(mkLabels(20), 128);
    const text = decode(pdf);
    expect(text).toContain("/Count 2");
    expect((text.match(/\/Type \/Page[^s]/g) || []).length).toBe(2);
  });

  it("honours a custom grid size", () => {
    const pdf = buildLabelSheetPdf(mkLabels(5), 128, { cols: 2, rows: 2 });
    const text = decode(pdf);
    // 4 per page => 5 labels span 2 pages.
    expect(text).toContain("/Count 2");
  });

  it("escapes parentheses in captions so the content stream stays valid", () => {
    const pdf = buildLabelSheetPdf(
      [{ jpeg: FAKE_JPEG, name: "Acme (US)" }],
      64,
    );
    const text = decode(pdf);
    expect(text).toContain("(Acme \\(US\\))");
  });

  it("declares startxref at the real xref offset", () => {
    const pdf = buildLabelSheetPdf(mkLabels(2), 64);
    const text = decode(pdf);
    const xrefPos = text.lastIndexOf("xref\n0 ");
    const declared = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(declared).toBe(xrefPos);
  });

  it("wraps into an application/pdf blob", () => {
    const blob = labelSheetPdfBlob(mkLabels(2), 64);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});
