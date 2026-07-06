/**
 * Minimal, dependency-free PDF writer that embeds a single JPEG image on a
 * page sized to the image. This exists so the "Download as PDF" feature has no
 * heavyweight dependency (jspdf pulls optional canvg/html2canvas/dompurify that
 * break the CI build under `npm ci --omit=optional`).
 *
 * We embed the JPEG directly with the /DCTDecode filter — the PDF format stores
 * JPEG bytes verbatim, so there is no re-encoding.
 */

/** Decode a `data:...;base64,<payload>` URL to its raw bytes. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Build a one-page PDF (as bytes) that displays `jpegBytes` filling a page of
 * `width` × `height` points (we use 1pt per pixel). RGB, 8 bits/channel — which
 * is what a rasterized QR export on a white background always is.
 */
export function buildJpegPdf(
  jpegBytes: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (chunk: Uint8Array | string) => {
    const u = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    parts.push(u);
    length += u.length;
  };
  const startObj = () => offsets.push(length);

  push("%PDF-1.3\n");

  startObj();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObj();
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  startObj();
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  startObj();
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
      `/Length ${jpegBytes.length} >>\nstream\n`,
  );
  push(jpegBytes);
  push("\nendstream\nendobj\n");

  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
  startObj();
  push(
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
  );

  const xrefStart = length;
  const size = offsets.length + 1; // objects + the free entry
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  const out = new Uint8Array(length);
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

/** Convenience: JPEG data URL → PDF Blob sized to the given pixel dimensions. */
export function jpegDataUrlToPdfBlob(
  dataUrl: string,
  width: number,
  height: number,
): Blob {
  const pdf = buildJpegPdf(dataUrlToBytes(dataUrl), width, height);
  return new Blob([pdf], { type: "application/pdf" });
}
