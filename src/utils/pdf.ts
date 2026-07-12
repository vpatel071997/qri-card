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
  push(
    `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
  );

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

/* ----------------------- Print-sheet (Avery) PDF ----------------------- */

export interface LabelImage {
  // JPEG bytes of one QR (all labels share the same source pixel size).
  jpeg: Uint8Array;
  name: string;
}

export interface LabelSheetOptions {
  cols?: number;
  rows?: number;
  pageW?: number; // points (default A4 portrait)
  pageH?: number;
  margin?: number;
}

// Escape a string for a PDF literal `(...)` text object.
function pdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Lay QR images out on a grid across one or more A4 pages (Avery-style label
 * sheet), each with its name caption beneath it, and return the PDF bytes.
 * Dependency-free — same DCTDecode JPEG embedding as buildJpegPdf, plus the
 * built-in Helvetica base font (no embedding) for captions.
 *
 * `imgPx` is the source pixel size of every (square) QR JPEG.
 */
export function buildLabelSheetPdf(
  images: LabelImage[],
  imgPx: number,
  options: LabelSheetOptions = {},
): Uint8Array {
  const cols = options.cols ?? 3;
  const rows = options.rows ?? 6;
  const pageW = options.pageW ?? 595;
  const pageH = options.pageH ?? 842;
  const margin = options.margin ?? 36;

  const perPage = cols * rows;
  const pageCount = Math.max(1, Math.ceil(images.length / perPage));
  const cellW = (pageW - 2 * margin) / cols;
  const cellH = (pageH - 2 * margin) / rows;
  const captionH = 12;
  const qrSize = Math.max(24, Math.min(cellW, cellH - captionH) - 12);

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

  const M = images.length;
  // Object numbering: 1 Catalog, 2 Pages, 3..(2+M) image XObjects,
  // then per page a Page obj + a Content obj.
  const imageObjNum = (i: number) => 3 + i;
  const pageObjNum = (p: number) => 3 + M + p * 2;
  const contentObjNum = (p: number) => pageObjNum(p) + 1;

  push("%PDF-1.4\n");

  startObj();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObj();
  const kids = Array.from(
    { length: pageCount },
    (_, p) => `${pageObjNum(p)} 0 R`,
  ).join(" ");
  push(
    `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`,
  );

  // Image XObjects.
  images.forEach((img, i) => {
    startObj();
    push(
      `${imageObjNum(i)} 0 obj\n<< /Type /XObject /Subtype /Image ` +
        `/Width ${imgPx} /Height ${imgPx} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`,
    );
    push(img.jpeg);
    push("\nendstream\nendobj\n");
  });

  // Pages + their content streams.
  for (let p = 0; p < pageCount; p++) {
    const start = p * perPage;
    const onPage = images.slice(start, start + perPage);

    // Resources: font + the image XObjects used on this page.
    const xobjRefs = onPage
      .map((_img, slot) => {
        const gi = start + slot;
        return `/Im${gi} ${imageObjNum(gi)} 0 R`;
      })
      .join(" ");

    let content = "";
    onPage.forEach((img, slot) => {
      const gi = start + slot;
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const cellX = margin + col * cellW;
      const cellTop = pageH - margin - row * cellH;
      const qrX = cellX + (cellW - qrSize) / 2;
      const qrY = cellTop - captionH - qrSize;
      content += `q ${qrSize} 0 0 ${qrSize} ${qrX.toFixed(2)} ${qrY.toFixed(2)} cm /Im${gi} Do Q\n`;

      // Caption centred under the QR (Helvetica 8pt ≈ 0.5em avg width).
      const fontSize = 8;
      const text = pdfText(img.name.slice(0, 24));
      const textW = text.length * fontSize * 0.5;
      const tx = cellX + (cellW - textW) / 2;
      const ty = qrY - 10;
      content += `BT /F1 ${fontSize} Tf ${tx.toFixed(2)} ${ty.toFixed(2)} Td (${text}) Tj ET\n`;
    });

    startObj();
    push(
      `${pageObjNum(p)} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
        `/Resources << /XObject << ${xobjRefs} >> ` +
        `/Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> ` +
        `/Contents ${contentObjNum(p)} 0 R >>\nendobj\n`,
    );

    startObj();
    push(
      `${contentObjNum(p)} 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`,
    );
  }

  const xrefStart = length;
  const size = offsets.length + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
  );

  const out = new Uint8Array(length);
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

export function labelSheetPdfBlob(
  images: LabelImage[],
  imgPx: number,
  options?: LabelSheetOptions,
): Blob {
  return new Blob([buildLabelSheetPdf(images, imgPx, options)], {
    type: "application/pdf",
  });
}
