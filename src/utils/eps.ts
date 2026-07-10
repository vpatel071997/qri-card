// Dependency-free EPS (Encapsulated PostScript) writer. Print shops and
// Illustrator/CorelDraw often ask for EPS. Like the PDF writer we embed the
// JPEG raster verbatim through the PostScript Level-2 /DCTDecode filter, so
// there's no image re-encoding and no third-party dependency.
import { dataUrlToBytes } from "./pdf";

/**
 * Build an EPS document (as bytes) that paints `jpegBytes` filling a
 * `wPx` × `hPx` point box (1pt per source pixel). RGB, 8 bits/component —
 * which is what a rasterised QR on white always is.
 */
export function buildJpegEps(
  jpegBytes: Uint8Array,
  wPx: number,
  hPx: number,
): Uint8Array {
  const encoder = new TextEncoder();
  const header =
    `%!PS-Adobe-3.0 EPSF-3.0\n` +
    `%%Creator: QriCard\n` +
    `%%BoundingBox: 0 0 ${wPx} ${hPx}\n` +
    `%%LanguageLevel: 2\n` +
    `%%EndComments\n` +
    `gsave\n` +
    `${wPx} ${hPx} scale\n` +
    `/DeviceRGB setcolorspace\n` +
    `<<\n` +
    `  /ImageType 1\n` +
    `  /Width ${wPx}\n` +
    `  /Height ${hPx}\n` +
    `  /BitsPerComponent 8\n` +
    `  /Decode [0 1 0 1 0 1]\n` +
    // Flip Y: image space has the origin top-left, PostScript bottom-left.
    `  /ImageMatrix [${wPx} 0 0 -${hPx} 0 ${hPx}]\n` +
    `  /DataSource currentfile /DCTDecode filter\n` +
    `>>\n` +
    `image\n`;
  const footer = `\ngrestore\n%%EOF\n`;

  const headBytes = encoder.encode(header);
  const footBytes = encoder.encode(footer);
  const out = new Uint8Array(
    headBytes.length + jpegBytes.length + footBytes.length,
  );
  out.set(headBytes, 0);
  out.set(jpegBytes, headBytes.length);
  out.set(footBytes, headBytes.length + jpegBytes.length);
  return out;
}

/** Convenience: JPEG data URL → EPS Blob sized to the given pixel dimensions. */
export function jpegDataUrlToEpsBlob(
  dataUrl: string,
  wPx: number,
  hPx: number,
): Blob {
  const eps = buildJpegEps(dataUrlToBytes(dataUrl), wPx, hPx);
  return new Blob([eps], { type: "application/postscript" });
}
