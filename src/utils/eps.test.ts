import { buildJpegEps, jpegDataUrlToEpsBlob } from "./eps";

const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const FAKE_JPEG_DATA_URL =
  "data:image/jpeg;base64," +
  btoa(
    Array.from(FAKE_JPEG)
      .map((c) => String.fromCharCode(c))
      .join(""),
  );
const decode = (b: Uint8Array) => new TextDecoder("latin1").decode(b);

describe("dependency-free EPS export", () => {
  it("emits a valid EPSF header with the right bounding box", () => {
    const text = decode(buildJpegEps(FAKE_JPEG, 200, 300));
    expect(text.startsWith("%!PS-Adobe-3.0 EPSF-3.0")).toBe(true);
    expect(text).toContain("%%BoundingBox: 0 0 200 300");
    expect(text).toContain("/DCTDecode filter");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("embeds the JPEG bytes verbatim between the image op and grestore", () => {
    const text = decode(buildJpegEps(FAKE_JPEG, 10, 10));
    expect(text).toContain("image\n\xff\xd8\xff\xd9\ngrestore");
  });

  it("sets a Y-flip image matrix for the given size", () => {
    const text = decode(buildJpegEps(FAKE_JPEG, 128, 128));
    expect(text).toContain("/ImageMatrix [128 0 0 -128 0 128]");
  });

  it("wraps into an application/postscript blob", () => {
    const blob = jpegDataUrlToEpsBlob(FAKE_JPEG_DATA_URL, 64, 64);
    expect(blob.type).toBe("application/postscript");
    expect(blob.size).toBeGreaterThan(0);
  });
});
