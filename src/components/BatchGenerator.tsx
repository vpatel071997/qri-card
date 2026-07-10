import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QRCodeStyling from "qr-code-styling";
import QRCode from "react-qr-code";
import { DotType } from "qr-code-styling";
import {
  Upload,
  FileEarmarkZip,
  FileEarmarkPdf,
  QrCode,
  ArrowCounterclockwise,
  ArrowLeft,
  ExclamationTriangleFill,
  Palette,
} from "react-bootstrap-icons";

import { parseBatchInput, BatchRow } from "../utils/csv";
import { buildQrOptions } from "../utils/qrOptions";
import { createZipBlob } from "../utils/zip";
import { labelSheetPdfBlob, LabelImage } from "../utils/pdf";
import PageInfoSections, { HelpStep } from "./PageInfoSections";

const QR_INK = "#1f2a44";
const PREVIEW_LIMIT = 24;

const SAMPLE = `Google,https://google.com
OpenAI,https://openai.com
Facebook,https://facebook.com`;

const DOT_STYLES: { id: DotType; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "dots", label: "Dots" },
  { id: "extra-rounded", label: "Extra" },
];

const BATCH_HELP_STEPS: HelpStep[] = [
  {
    icon: <Upload size={18} aria-hidden />,
    title: "1. Add your list",
    body: (
      <>
        Paste <strong>name,link</strong> rows (one per line) or upload a CSV. A
        header row is detected and skipped automatically.
      </>
    ),
  },
  {
    icon: <Palette size={18} aria-hidden />,
    title: "2. Style every code",
    body: "Pick a color, module shape and resolution — the same style is applied to every QR in the batch.",
  },
  {
    icon: <FileEarmarkZip size={18} aria-hidden />,
    title: "3. Download the ZIP",
    body: (
      <>
        Get one PNG per row, named after the first column (e.g.{" "}
        <code>Google.png</code>), bundled into <code>qrcodes.zip</code>.
      </>
    ),
  },
  {
    icon: <FileEarmarkPdf size={18} aria-hidden />,
    title: "4. Or a label sheet",
    body: "Download a print-ready PDF that lays every code out on an A4 grid with captions — perfect for sticker labels.",
  },
];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function renderRaster(
  value: string,
  ext: "png" | "jpeg",
  size: number,
  color: string,
  dotStyle: DotType,
  transparent: boolean,
): Promise<Uint8Array> {
  const options = {
    ...buildQrOptions({
      data: value,
      size,
      dotStyle,
      cornerStyle: "square",
      color,
      gradientEnabled: false,
      gradientType: "linear",
      gradientColor2: color,
      eyeColor: "",
      logo: "",
      // JPEG has no alpha, so a PDF sheet is always on white.
      transparentBg: ext === "png" ? transparent : false,
    }),
    type: "canvas" as const,
  };
  const qr = new QRCodeStyling(options as never);
  const blob = (await qr.getRawData(ext)) as Blob;
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

export default function BatchGenerator() {
  const [input, setInput] = useState<string>("");
  const [color, setColor] = useState<string>(QR_INK);
  const [dotStyle, setDotStyle] = useState<DotType>("square");
  const [resolution, setResolution] = useState<number>(512);
  const [transparent, setTransparent] = useState<boolean>(false);
  const [busy, setBusy] = useState<"" | "zip" | "pdf">("");
  const [error, setError] = useState<string>("");
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [showTermsWarning, setShowTermsWarning] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows: BatchRow[] = useMemo(() => parseBatchInput(input), [input]);
  const hasRows = rows.length > 0;

  // Terms are enforced on click (a prompt), not by disabling the button.
  const ensureTerms = (): boolean => {
    if (agreedToTerms) return true;
    setShowTermsWarning(true);
    return false;
  };

  // The export buttons stay enabled; requirements are checked on click and
  // surfaced as messages (same UX as the single-code page).
  const canGenerate = (): boolean => {
    if (!hasRows) {
      setError("Paste or upload a list of links first.");
      return false;
    }
    if (!ensureTerms()) return false;
    setError("");
    return true;
  };

  const handleFile = (file: File | undefined) => {
    setError("");
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInput(String(reader.result || ""));
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  };

  const handleZip = async () => {
    if (busy) return;
    if (!canGenerate()) return;
    setBusy("zip");
    setError("");
    try {
      const entries = [];
      for (const row of rows) {
        const bytes = await renderRaster(
          row.value,
          "png",
          resolution,
          color,
          dotStyle,
          transparent,
        );
        entries.push({ name: `${row.name}.png`, data: bytes });
      }
      download(createZipBlob(entries), "qrcodes.zip");
    } catch (err) {
      console.error("Batch ZIP failed:", err);
      setError("Something went wrong generating the ZIP. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const handlePdf = async () => {
    if (busy) return;
    if (!canGenerate()) return;
    setBusy("pdf");
    setError("");
    try {
      const images: LabelImage[] = [];
      for (const row of rows) {
        const jpeg = await renderRaster(
          row.value,
          "jpeg",
          resolution,
          color,
          dotStyle,
          false,
        );
        images.push({ jpeg, name: row.name });
      }
      download(labelSheetPdfBlob(images, resolution), "labels.pdf");
    } catch (err) {
      console.error("Batch PDF failed:", err);
      setError("Something went wrong generating the PDF. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="qr-app batch-app">
      <Link className="batch-back" to="/">
        <ArrowLeft size={16} aria-hidden />
        Back to single QR
      </Link>

      <header className="hero">
        <h1 className="hero-title">
          Generate QR Codes in{" "}
          <span className="hl">
            Bulk
            <i className="hl-node tl" />
            <i className="hl-node tr" />
            <i className="hl-node bl" />
            <i className="hl-node br" />
          </span>
        </h1>
        <p className="hero-sub">
          Paste or upload a list of links, generate every QR code at once, and
          download them as a ZIP or a printable label sheet.
        </p>
      </header>

      <div className="qr-grid">
        {/* ------------------------- Input ------------------------- */}
        <section className="panel qr-builder">
          <div className="batch-input-head">
            <p className="field-label">Your list (name, link — one per row)</p>
            <div className="batch-input-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setInput(SAMPLE)}
              >
                Use sample
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={15} aria-hidden />
                Upload CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
              />
            </div>
          </div>

          <textarea
            className="qr-input batch-textarea"
            rows={10}
            placeholder={"Google,https://google.com\nOpenAI,https://openai.com"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Batch list"
          />

          <div className="step-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setInput("")}
              disabled={!input}
            >
              <ArrowCounterclockwise size={16} aria-hidden />
              Clear
            </button>
            <span className="batch-count">
              {hasRows
                ? `${rows.length} code${rows.length === 1 ? "" : "s"} detected`
                : "No rows yet"}
            </span>
          </div>

          {/* Shared styling */}
          <div className="design-section">
            <h2 className="design-title">Style (applied to every code)</h2>

            <p className="sub-label">Color</p>
            <label className="color-custom" title="QR color">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Batch QR color"
              />
            </label>

            <p className="sub-label">Module style</p>
            <div className="batch-chips">
              {DOT_STYLES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`chip ${dotStyle === d.id ? "is-active" : ""}`}
                  onClick={() => setDotStyle(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="export-options">
              <div className="export-opt">
                <span className="export-opt-label">Resolution</span>
                <div className="seg">
                  {[256, 512, 1024].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`seg-btn ${resolution === r ? "is-active" : ""}`}
                      onClick={() => setResolution(r)}
                    >
                      {r}px
                    </button>
                  ))}
                </div>
              </div>
              <label className="switch-row switch-row--compact">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                />
                <span>Transparent background (PNG in ZIP)</span>
              </label>
            </div>
          </div>
        </section>

        {/* ------------------------- Preview + export ------------------------- */}
        <aside className="panel qr-preview batch-preview">
          <div className="step-head">
            <h2>Preview &amp; download</h2>
          </div>

          {hasRows ? (
            <>
              <div className="batch-grid">
                {rows.slice(0, PREVIEW_LIMIT).map((row, i) => (
                  <figure className="batch-cell" key={`${row.name}-${i}`}>
                    <div className="batch-cell-qr">
                      <QRCode
                        value={row.value}
                        size={72}
                        fgColor={color}
                        bgColor="#ffffff"
                        style={{ width: "100%", height: "auto" }}
                      />
                    </div>
                    <figcaption title={row.value}>{row.name}</figcaption>
                  </figure>
                ))}
              </div>
              {rows.length > PREVIEW_LIMIT && (
                <p className="batch-more">
                  + {rows.length - PREVIEW_LIMIT} more will be included in the
                  download.
                </p>
              )}
            </>
          ) : (
            <div className="qr-empty batch-empty" aria-hidden>
              <QrCode size={52} />
              <span>Paste a list to see your codes here</span>
            </div>
          )}

          {error && (
            <p className="terms-warning" role="alert">
              {error}
            </p>
          )}

          {/* Terms gate — enforced on click (see ensureTerms). */}
          <label className="terms-check">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                if (e.target.checked) setShowTermsWarning(false);
              }}
              aria-describedby="batch-terms-note"
            />
            <span id="batch-terms-note">
              I have read and agree to the{" "}
              <a href="#disclaimer">
                Terms &amp; Conditions and Privacy Policy
              </a>
              .
            </span>
          </label>

          {showTermsWarning && !agreedToTerms && (
            <p className="terms-warning" role="alert">
              <ExclamationTriangleFill size={14} aria-hidden />
              Please agree to the Terms &amp; Conditions and Privacy Policy
              first.
            </p>
          )}

          <button
            type="button"
            className="primary-btn download-btn"
            onClick={handleZip}
            disabled={!!busy}
          >
            <FileEarmarkZip size={16} aria-hidden />
            {busy === "zip" ? "Generating…" : "Download ZIP (PNG)"}
          </button>

          <button
            type="button"
            className="primary-btn download-btn batch-pdf-btn"
            onClick={handlePdf}
            disabled={!!busy}
          >
            <FileEarmarkPdf size={16} aria-hidden />
            {busy === "pdf" ? "Generating…" : "Download label sheet (PDF)"}
          </button>
        </aside>
      </div>

      {/* --------------------- Help / About / Disclaimer -------------------- */}
      <PageInfoSections helpSteps={BATCH_HELP_STEPS} />
    </div>
  );
}
