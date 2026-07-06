import { useEffect, useMemo, useRef, useState } from "react";
import QRCodeStyling, { DotType, CornerSquareType } from "qr-code-styling";
import { toPng, toSvg, toJpeg } from "html-to-image";
import {
  Link45deg,
  PersonVcard,
  Download,
  ArrowCounterclockwise,
  ChevronDown,
  Check,
  QrCode,
  QuestionCircle,
  InfoCircle,
  CursorFill,
  PencilSquare,
  Palette,
  Clipboard,
  ClipboardCheck,
  Trash,
  Download as DownloadIcon,
  ShieldLock,
} from "react-bootstrap-icons";

import { VCardProps } from "../utils/props";
import { vCardFields } from "../utils/vCardFields";
import { buildVCardShareUrl, buildLinkRedirectUrl } from "../utils/vcard";
import { jpegDataUrlToPdfBlob } from "../utils/pdf";
import { VCARD_TEMPLATES, DEFAULT_TEMPLATE_ID } from "../utils/vcardTemplates";

type QRType = "link" | "vcard";
type DesignTab = "frame" | "shape" | "color";
type FrameId = "none" | "rounded" | "scan-bottom" | "scan-top" | "brackets";
type DownloadFormat = "png" | "svg" | "pdf";

const QR_INK = "#1f2a44";

const STORAGE_KEY = "qricard:builder:v1";

/* ----------------------------- Validation ----------------------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
const TEL_RE = /^[+]?[\d\s().-]{6,}$/;

type FieldLike = { type: string; required?: boolean };

// Returns an error message for a single field value, or "" when it's valid.
function validateField(field: FieldLike, value: string | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return field.required ? "This field is required" : "";

  switch (field.type) {
    case "email":
      return EMAIL_RE.test(v) ? "" : "Enter a valid email address";
    case "url":
      return URL_RE.test(v) ? "" : "Enter a valid URL";
    case "tel":
      return TEL_RE.test(v) ? "" : "Enter a valid phone number";
    case "number":
      return /^\d+$/.test(v) ? "" : "Enter numbers only";
    default:
      return "";
  }
}

type PersistedState = {
  type: QRType;
  url: string;
  vCard: VCardProps;
  frame: FrameId;
  dotStyle: DotType;
  cornerStyle: CornerSquareType;
  qrColor: string;
  template: string;
};

function loadPersisted(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedState>) : null;
  } catch {
    return null;
  }
}

const QR_COLORS: string[] = [
  "#1f2a44",
  "#000000",
  "#4a0fb0",
  "#2563eb",
  "#0891b2",
  "#16a34a",
  "#ea580c",
  "#dc2626",
  "#db2777",
];

const QR_TYPES: { id: QRType; label: string; Icon: typeof Link45deg }[] = [
  { id: "link", label: "Link", Icon: Link45deg },
  { id: "vcard", label: "V-card", Icon: PersonVcard },
];

const VCARD_GROUPS: { title: string; ids: string[] }[] = [
  { title: "Personal Details", ids: ["1", "2", "3", "4", "5", "13"] },
  { title: "Contact Information", ids: ["6", "7", "16"] },
  { title: "Address", ids: ["8", "9", "10", "11", "12"] },
  { title: "Work & Profile", ids: ["14", "15"] },
  { title: "Social Media", ids: ["17", "18", "19", "20"] },
  { title: "Notes", ids: ["21"] },
];

const FRAMES: { id: FrameId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "rounded", label: "Border" },
  { id: "scan-bottom", label: "Scan Me" },
  { id: "scan-top", label: "Scan Top" },
  { id: "brackets", label: "Brackets" },
];

const DOT_STYLES: { id: DotType; label: string; radius: string }[] = [
  { id: "square", label: "Square", radius: "1px" },
  { id: "rounded", label: "Rounded", radius: "3px" },
  { id: "dots", label: "Dots", radius: "50%" },
  { id: "classy", label: "Classy", radius: "0 40% 0 40%" },
  { id: "extra-rounded", label: "Extra", radius: "45%" },
];

const CORNER_STYLES: { id: CornerSquareType; label: string; radius: string }[] =
  [
    { id: "square", label: "Square", radius: "2px" },
    { id: "extra-rounded", label: "Rounded", radius: "8px" },
    { id: "dot", label: "Dot", radius: "50%" },
  ];

/* ----------------------------- Custom select ----------------------------- */
function CustomSelect({
  id,
  value,
  placeholder,
  options,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className={`c-select ${open ? "is-open" : ""}`} ref={ref}>
      <button
        id={id}
        type="button"
        className={`c-select-trigger ${value ? "" : "is-placeholder"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value || placeholder}</span>
        <ChevronDown className="c-caret" size={15} aria-hidden />
      </button>

      {open && (
        <ul className="c-select-menu" role="listbox">
          <li
            role="option"
            aria-selected={!value}
            className={`c-option is-muted ${!value ? "is-sel" : ""}`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {placeholder}
          </li>
          {options.map((option) => (
            <li
              key={option}
              role="option"
              aria-selected={value === option}
              className={`c-option ${value === option ? "is-sel" : ""}`}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span>{option}</span>
              {value === option && <Check size={16} aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- Generator ------------------------------- */
export default function QRGenerator() {
  // Restore any previously entered data from localStorage (once).
  const [persisted] = useState<Partial<PersistedState> | null>(loadPersisted);

  const [type, setType] = useState<QRType>(persisted?.type ?? "link");
  const [url, setUrl] = useState<string>(persisted?.url ?? "");
  const [vCard, setVCard] = useState<VCardProps>(persisted?.vCard ?? {});

  // design state
  const [designTab, setDesignTab] = useState<DesignTab>("frame");
  const [frame, setFrame] = useState<FrameId>(persisted?.frame ?? "none");
  const [dotStyle, setDotStyle] = useState<DotType>(
    persisted?.dotStyle ?? "square",
  );
  const [cornerStyle, setCornerStyle] = useState<CornerSquareType>(
    persisted?.cornerStyle ?? "square",
  );
  const [qrColor, setQrColor] = useState<string>(persisted?.qrColor ?? QR_INK);
  // Which standard template the shared v-card page renders in.
  const [template, setTemplate] = useState<string>(
    persisted?.template ?? DEFAULT_TEMPLATE_ID,
  );
  const [copied, setCopied] = useState<boolean>(false);
  // On mobile the preview stays hidden until the user taps "Generate".
  const [generated, setGenerated] = useState<boolean>(false);
  // User must accept the Terms & Conditions before generating/downloading.
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  // Which fields the user has interacted with — errors only show after blur.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Whether saved data exists (controls the "Clear all" button).
  const [hasStored, setHasStored] = useState<boolean>(persisted !== null);
  // Download format menu open/closed.
  const [dlOpen, setDlOpen] = useState<boolean>(false);
  // Collapsible Help section (collapsed by default).
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  const captureRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const dlRef = useRef<HTMLDivElement>(null);
  const qrNodeRef = useRef<HTMLDivElement>(null);
  const qrStyling = useRef<QRCodeStyling | null>(null);

  // Both the QR image and the Copy-link button point at a shareable page URL
  // rather than raw contact text, so a scan opens the hosted v-card preview
  // (with the selected template) instead of dumping plain text into Notes:
  //  - v-card -> /vcard-view?data=...&t=... (renders the contact + Add to Contacts)
  //  - link   -> /link?url=...              (redirects the visitor to the target)
  // Both formats are the printed-card contract — see utils/vcard.ts.
  const vCardShareUrl = useMemo(
    () => buildVCardShareUrl(window.location.origin, vCard, template),
    [vCard, template],
  );

  const linkRedirectUrl = useMemo(
    () => buildLinkRedirectUrl(window.location.origin, url),
    [url],
  );

  const qrValue = type === "link" ? url.trim() : vCardShareUrl;
  const copyValue = type === "link" ? linkRedirectUrl : vCardShareUrl;
  const hasValue = qrValue.length > 0;
  // Generating and downloading are gated on accepting the terms.
  const canOutput = hasValue && agreedToTerms;

  /* render / update the styled QR */
  useEffect(() => {
    if (!hasValue || !qrNodeRef.current) return;

    const options = {
      width: 210,
      height: 210,
      type: "svg" as const,
      data: qrValue,
      margin: 4,
      qrOptions: { errorCorrectionLevel: "M" as const },
      backgroundOptions: { color: "transparent" },
      dotsOptions: { type: dotStyle, color: qrColor },
      cornersSquareOptions: { type: cornerStyle, color: qrColor },
      cornersDotOptions: {
        type: cornerStyle === "square" ? ("square" as const) : ("dot" as const),
        color: qrColor,
      },
    };

    try {
      if (!qrStyling.current) {
        qrStyling.current = new QRCodeStyling(options);
        qrNodeRef.current.innerHTML = "";
        qrStyling.current.append(qrNodeRef.current);
      } else {
        if (qrNodeRef.current.childElementCount === 0) {
          qrStyling.current.append(qrNodeRef.current);
        }
        qrStyling.current.update(options);
      }
    } catch (err) {
      console.error("Error rendering styled QR code:", err);
    }
  }, [hasValue, qrValue, dotStyle, cornerStyle, qrColor, frame]);

  /* persist the builder state to localStorage */
  useEffect(() => {
    const hasAnyData =
      hasValue ||
      frame !== "none" ||
      dotStyle !== "square" ||
      cornerStyle !== "square" ||
      qrColor !== QR_INK ||
      template !== DEFAULT_TEMPLATE_ID;

    try {
      if (hasAnyData) {
        const snapshot: PersistedState = {
          type,
          url,
          vCard,
          frame,
          dotStyle,
          cornerStyle,
          qrColor,
          template,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setHasStored(true);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setHasStored(false);
      }
    } catch {
      /* storage may be unavailable (private mode) — ignore */
    }
  }, [
    type,
    url,
    vCard,
    frame,
    dotStyle,
    cornerStyle,
    qrColor,
    template,
    hasValue,
  ]);

  /* close the download-format menu when clicking outside it */
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) {
        setDlOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  /* open + scroll to Help, from the header button or a #help deep link */
  useEffect(() => {
    const openHelp = () => {
      setHelpOpen(true);
      // Wait for the steps to expand before scrolling so we land on the
      // fully-rendered section.
      window.setTimeout(() => {
        document
          .getElementById("help")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    };
    const openFromHash = () => {
      if (window.location.hash === "#help") openHelp();
    };

    openFromHash();
    window.addEventListener("qricard:open-help", openHelp);
    window.addEventListener("hashchange", openFromHash);
    return () => {
      window.removeEventListener("qricard:open-help", openHelp);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  const triggerDownload = (dataUrl: string, ext: string) => {
    const link = document.createElement("a");
    link.download = `qri-card-export.${ext}`;
    link.href = dataUrl;
    link.click();
  };

  const handleDownload = (format: DownloadFormat) => {
    if (captureRef.current === null || !canOutput) return;
    setDlOpen(false);

    if (format === "svg") {
      toSvg(captureRef.current, { cacheBust: true })
        .then((dataUrl) => triggerDownload(dataUrl, "svg"))
        .catch((err) => console.error("Error generating QR code SVG:", err));
      return;
    }

    if (format === "png") {
      toPng(captureRef.current, {
        pixelRatio: 4,
        backgroundColor: "#ffffff",
        cacheBust: true,
      })
        .then((dataUrl) => triggerDownload(dataUrl, "png"))
        .catch((err) => console.error("Error generating QR code PNG:", err));
      return;
    }

    // PDF: embed a high-res JPEG raster onto a page sized to the image.
    toJpeg(captureRef.current, {
      pixelRatio: 4,
      backgroundColor: "#ffffff",
      quality: 0.95,
      cacheBust: true,
    })
      .then((dataUrl) => {
        const img = new Image();
        img.onload = () => {
          const blob = jpegDataUrlToPdfBlob(
            dataUrl,
            img.naturalWidth,
            img.naturalHeight,
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.download = "qri-card-export.pdf";
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
        };
        img.src = dataUrl;
      })
      .catch((err) => console.error("Error generating QR code PDF:", err));
  };

  const handleCopy = () => {
    if (!copyValue) return;
    navigator.clipboard?.writeText(copyValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleReset = () => {
    setUrl("");
    setVCard({});
    setTouched({});
    setGenerated(false);
  };

  // Wipe everything, including saved design + localStorage.
  const handleClearAll = () => {
    setUrl("");
    setVCard({});
    setTouched({});
    setFrame("none");
    setDotStyle("square");
    setCornerStyle("square");
    setQrColor(QR_INK);
    setTemplate(DEFAULT_TEMPLATE_ID);
    setGenerated(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setHasStored(false);
  };

  const handleTypeChange = (next: QRType) => {
    if (next === type) return;
    setType(next);
    setUrl("");
    setVCard({});
    setGenerated(false);
  };

  // Reveal the preview and scroll it into view (mobile "Generate" flow).
  const handleGenerate = () => {
    if (!canOutput) return;
    setGenerated(true);
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const contentTitle =
    type === "link" ? "Enter your Website" : "Enter your contact details";

  const linkError =
    touched.url && url.trim() && !URL_RE.test(url.trim())
      ? "Enter a valid URL"
      : "";

  /* preview with frame */
  const qrInner = (
    <div className="qr-stage-inner">
      {hasValue ? (
        <div key="qr-node" className="qr-node" ref={qrNodeRef} />
      ) : (
        <div key="qr-empty" className="qr-empty" aria-hidden>
          <QrCode size={52} />
          <span>Your QR code will appear here</span>
        </div>
      )}
    </div>
  );

  const framedQR = (() => {
    switch (frame) {
      case "rounded":
        return <div className="qr-frame frame-rounded">{qrInner}</div>;
      case "scan-bottom":
        return (
          <div className="qr-frame frame-scan">
            {qrInner}
            <div className="frame-label">SCAN ME</div>
          </div>
        );
      case "scan-top":
        return (
          <div className="qr-frame frame-scan">
            <div className="frame-label">SCAN ME</div>
            {qrInner}
          </div>
        );
      case "brackets":
        return (
          <div className="qr-frame frame-brackets">
            <span className="bkt tl" />
            <span className="bkt tr" />
            <span className="bkt bl" />
            <span className="bkt br" />
            {qrInner}
          </div>
        );
      default:
        return <div className="qr-frame frame-none">{qrInner}</div>;
    }
  })();

  return (
    <div className="qr-app">
      {/* ------------------------------- Hero ------------------------------- */}
      <header className="hero">
        <h1 className="hero-title">
          Generate and Share{" "}
          <span className="hl">
            QR Codes
            <i className="hl-node tl" />
            <i className="hl-node tr" />
            <i className="hl-node bl" />
            <i className="hl-node br" />
          </span>{" "}
          in Seconds.
        </h1>
        <p className="hero-sub">
          Create a QR code for any link or a shareable digital business card —
          instantly, free, and with no sign-up.
        </p>
      </header>

      <div className="qr-grid">
        {/* --------------------- Left: type + content --------------------- */}
        <section className="panel qr-builder">
          <div className="type-tabs" role="tablist" aria-label="QR code type">
            {QR_TYPES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={type === id}
                className={`type-tab ${type === id ? "is-active" : ""}`}
                onClick={() => handleTypeChange(id)}
              >
                <Icon size={18} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="step">
            {type === "link" && <p className="field-label">{contentTitle}</p>}

            {type === "link" ? (
              <>
                <input
                  type="url"
                  inputMode="url"
                  className={`qr-input ${linkError ? "is-invalid" : ""}`}
                  placeholder="https://"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, url: true }))}
                  aria-label="Website URL"
                  aria-invalid={!!linkError}
                />
                {linkError && (
                  <span className="field-error" role="alert">
                    {linkError}
                  </span>
                )}
              </>
            ) : (
              <div className="vcard-groups">
                {VCARD_GROUPS.map((group) => (
                  <fieldset className="vcard-group" key={group.title}>
                    <legend className="vcard-group-title">{group.title}</legend>
                    <div className="vcard-grid">
                      {group.ids.map((id) => {
                        const field = vCardFields.find((f) => f.id === id);
                        if (!field) return null;

                        const error = touched[field.id]
                          ? validateField(field, vCard[field.id])
                          : "";
                        const markTouched = () =>
                          setTouched((t) => ({ ...t, [field.id]: true }));

                        return (
                          <div
                            className={`vcard-field ${
                              field.type === "textarea"
                                ? "vcard-field--wide"
                                : ""
                            }`}
                            key={field.id}
                          >
                            <label htmlFor={`vcard-${field.id}`}>
                              {field.label}
                              {field.required && (
                                <span className="req"> *</span>
                              )}
                            </label>

                            {field.options ? (
                              <CustomSelect
                                id={`vcard-${field.id}`}
                                value={vCard[field.id] ?? ""}
                                placeholder={`Select ${field.label}`}
                                options={field.options}
                                onChange={(v) => {
                                  setVCard({ ...vCard, [field.id]: v });
                                  markTouched();
                                }}
                              />
                            ) : field.type === "textarea" ? (
                              <textarea
                                id={`vcard-${field.id}`}
                                className={`qr-input ${error ? "is-invalid" : ""}`}
                                rows={3}
                                value={vCard[field.id] ?? ""}
                                onChange={(e) =>
                                  setVCard({
                                    ...vCard,
                                    [field.id]: e.target.value,
                                  })
                                }
                                onBlur={markTouched}
                                aria-invalid={!!error}
                              />
                            ) : (
                              <input
                                id={`vcard-${field.id}`}
                                type={field.type}
                                className={`qr-input ${error ? "is-invalid" : ""}`}
                                value={vCard[field.id] ?? ""}
                                onChange={(e) =>
                                  setVCard({
                                    ...vCard,
                                    [field.id]: e.target.value,
                                  })
                                }
                                onBlur={markTouched}
                                aria-invalid={!!error}
                              />
                            )}

                            {error && (
                              <span className="field-error" role="alert">
                                {error}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}

            <div className="step-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={handleReset}
                disabled={!hasValue}
              >
                <ArrowCounterclockwise size={16} aria-hidden />
                Reset
              </button>

              {hasStored && (
                <button
                  type="button"
                  className="ghost-btn ghost-btn--danger"
                  onClick={handleClearAll}
                  title="Clear all entered data and saved design"
                >
                  <Trash size={16} aria-hidden />
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* --------------------- V-card template --------------------- */}
          {type === "vcard" && (
            <div className="design-section template-section">
              <h2 className="design-title">Choose a card template</h2>
              <p className="sub-label">
                Anyone who scans your QR code sees the card in this style.
              </p>
              <div
                className="template-row"
                role="radiogroup"
                aria-label="V-card template"
              >
                {VCARD_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    role="radio"
                    aria-checked={template === tpl.id}
                    className={`template-card ${
                      template === tpl.id ? "is-active" : ""
                    }`}
                    onClick={() => setTemplate(tpl.id)}
                    title={tpl.description}
                  >
                    <span className={`template-swatch tpl-${tpl.id}`}>
                      <span className="template-swatch-avatar" />
                      <span className="template-swatch-line" />
                      <span className="template-swatch-line short" />
                    </span>
                    <span className="template-name">{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --------------------- Design your QR Code --------------------- */}
          <div className="design-section">
            <h2 className="design-title">Design your QR Code</h2>

            <div className="design-tabs" role="tablist" aria-label="QR design">
              {(["frame", "shape", "color"] as DesignTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={designTab === t}
                  className={`design-tab ${designTab === t ? "is-active" : ""}`}
                  onClick={() => setDesignTab(t)}
                >
                  {t === "frame" ? "Frame" : t === "shape" ? "Shape" : "Color"}
                </button>
              ))}
            </div>

            {/* Frame */}
            {designTab === "frame" && (
              <div className="thumb-row">
                {FRAMES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`thumb ${frame === f.id ? "is-active" : ""}`}
                    onClick={() => setFrame(f.id)}
                  >
                    <span className={`thumb-frame tf-${f.id}`}>
                      {f.id === "brackets" && (
                        <>
                          <i className="tb tl" />
                          <i className="tb tr" />
                          <i className="tb bl" />
                          <i className="tb br" />
                        </>
                      )}
                      {f.id === "scan-top" && (
                        <em className="tf-label top">SCAN</em>
                      )}
                      <QrCode size={20} />
                      {f.id === "scan-bottom" && (
                        <em className="tf-label bottom">SCAN</em>
                      )}
                    </span>
                    <span className="thumb-label">{f.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Shape */}
            {designTab === "shape" && (
              <div className="shape-block">
                <p className="sub-label">Module style</p>
                <div className="thumb-row">
                  {DOT_STYLES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`thumb ${dotStyle === d.id ? "is-active" : ""}`}
                      onClick={() => setDotStyle(d.id)}
                    >
                      <span className="swatch">
                        {[0, 1, 2, 3].map((i) => (
                          <i key={i} style={{ borderRadius: d.radius }} />
                        ))}
                      </span>
                      <span className="thumb-label">{d.label}</span>
                    </button>
                  ))}
                </div>

                <p className="sub-label">Corner style</p>
                <div className="thumb-row">
                  {CORNER_STYLES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`thumb ${
                        cornerStyle === c.id ? "is-active" : ""
                      }`}
                      onClick={() => setCornerStyle(c.id)}
                    >
                      <span className="swatch corner">
                        <i style={{ borderRadius: c.radius }} />
                      </span>
                      <span className="thumb-label">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color */}
            {designTab === "color" && (
              <div className="color-block">
                <p className="sub-label">QR color</p>
                <div className="color-row">
                  {QR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch ${
                        qrColor.toLowerCase() === c.toLowerCase()
                          ? "is-active"
                          : ""
                      }`}
                      style={{ background: c }}
                      onClick={() => setQrColor(c)}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                  <label className="color-custom" title="Custom color">
                    <input
                      type="color"
                      value={qrColor}
                      onChange={(e) => setQrColor(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Terms gate — must be accepted before generating/downloading */}
            <label className="terms-check">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                aria-describedby="terms-note"
              />
              <span id="terms-note">
                I have read and agree to the{" "}
                <a href="#disclaimer">
                  Terms &amp; Conditions and Privacy Policy
                </a>
                .
              </span>
            </label>

            {/* Mobile-only: reveal the preview below on demand */}
            <button
              type="button"
              className="primary-btn generate-btn"
              onClick={handleGenerate}
              disabled={!canOutput}
            >
              <QrCode size={18} aria-hidden />
              Generate
            </button>
          </div>
        </section>

        {/* ------------------- Right: live preview + download ------------------- */}
        <aside
          ref={previewRef}
          className={`panel qr-preview ${generated ? "is-generated" : ""}`}
        >
          <div className="step-head">
            <h2>Your QR Code</h2>
          </div>

          <div className={`qr-canvas ${hasValue ? "" : "is-empty"}`}>
            <div
              ref={captureRef}
              className="qr-capture"
              style={
                { ["--qr-color" as string]: qrColor } as React.CSSProperties
              }
            >
              {framedQR}
            </div>
          </div>

          <div
            className={`download-menu ${dlOpen ? "is-open" : ""}`}
            ref={dlRef}
          >
            <button
              type="button"
              className="primary-btn"
              onClick={() => setDlOpen((o) => !o)}
              disabled={!canOutput}
              aria-haspopup="menu"
              aria-expanded={dlOpen}
            >
              <Download size={18} aria-hidden />
              Download QR Code
              <ChevronDown size={16} aria-hidden />
            </button>

            {dlOpen && (
              <ul className="download-options" role="menu">
                {(["png", "svg", "pdf"] as DownloadFormat[]).map((fmt) => (
                  <li key={fmt} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="download-option"
                      onClick={() => handleDownload(fmt)}
                    >
                      Download as {fmt.toUpperCase()}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="link-copy"
            onClick={handleCopy}
            disabled={!hasValue}
          >
            {copied ? (
              <>
                <ClipboardCheck size={15} aria-hidden />
                Link copied
              </>
            ) : (
              <>
                <Clipboard size={15} aria-hidden />
                Copy link
              </>
            )}
          </button>
        </aside>
      </div>

      {/* ------------------------------- Help ------------------------------- */}
      <section className="panel help-card" id="help">
        <button
          type="button"
          className="section-head help-toggle"
          aria-expanded={helpOpen}
          aria-controls="help-steps"
          onClick={() => setHelpOpen((o) => !o)}
        >
          <span className="section-icon">
            <QuestionCircle size={20} aria-hidden />
          </span>
          <h2>Help &amp; How it works</h2>
          <ChevronDown
            className={`help-caret ${helpOpen ? "is-open" : ""}`}
            size={20}
            aria-hidden
          />
        </button>

        {helpOpen && (
          <div className="help-steps" id="help-steps">
            <div className="help-step">
              <span className="help-step-icon">
                <CursorFill size={18} aria-hidden />
              </span>
              <h3>1. Pick a type</h3>
              <p>
                Choose <strong>Link</strong> for a website, or{" "}
                <strong>V-card</strong> to share your contact details.
              </p>
            </div>
            <div className="help-step">
              <span className="help-step-icon">
                <PencilSquare size={18} aria-hidden />
              </span>
              <h3>2. Add the content</h3>
              <p>
                Fill in the fields — the QR code updates live in the preview on
                the right as you type.
              </p>
            </div>
            <div className="help-step">
              <span className="help-step-icon">
                <Palette size={18} aria-hidden />
              </span>
              <h3>3. Design it</h3>
              <p>
                Pick a frame, change the module &amp; corner shape, and choose
                any color you like.
              </p>
            </div>
            <div className="help-step">
              <span className="help-step-icon">
                <DownloadIcon size={18} aria-hidden />
              </span>
              <h3>4. Download</h3>
              <p>
                Save a high-resolution PNG, SVG, or PDF — exactly what you see
                in the preview — ready to share or print.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------- About ------------------------------ */}
      <section className="panel about-card">
        <div className="section-head">
          <span className="section-icon">
            <InfoCircle size={20} aria-hidden />
          </span>
          <h2>About QriCard</h2>
        </div>
        <p>
          QriCard is a free, no-sign-up tool to generate QR codes for links and
          shareable digital business cards. Everything runs right in your
          browser — your data never leaves your device. Customize the frame,
          shape, and color, then download a crisp PNG, SVG, or PDF in a single
          click.
        </p>
      </section>

      {/* --------------------- Disclaimer & Privacy ------------------------ */}
      <section className="panel disclaimer-card" id="disclaimer">
        <div className="section-head">
          <span className="section-icon">
            <ShieldLock size={20} aria-hidden />
          </span>
          <h2>Disclaimer &amp; Privacy</h2>
        </div>

        <div className="disclaimer-block">
          <h3>Terms &amp; limitations</h3>
          <ul>
            <li>
              QriCard is provided <strong>“as is”</strong>, free of charge and
              without any warranty. You are responsible for the accuracy of the
              details you enter and for how you use the QR codes you create.
            </li>
            <li>
              A QR code encodes your data at the moment it is generated. Once a
              code is <strong>printed or shared it cannot be changed</strong> —
              generate a new one if your details change.
            </li>
            <li>
              Saving a contact (the <em>.vcf</em> file) depends on the scanning
              phone. Support varies between iOS and Android, and some fields
              (such as photo-by-URL or certain social links) may not import on
              every device.
            </li>
          </ul>
        </div>

        <div className="disclaimer-block">
          <h3>Privacy policy</h3>
          <ul>
            <li>
              Everything runs in your browser. Your details are{" "}
              <strong>never sent to or stored on our servers</strong>.
            </li>
            <li>
              Your entries are saved only in this browser (local storage) so you
              can pick up where you left off. Use <strong>“Clear all”</strong>{" "}
              to remove them at any time.
            </li>
            <li>
              When you share a v-card or link, the data is encoded directly into
              the QR code / URL.{" "}
              <strong>Anyone who scans it can read it</strong>, so don’t include
              information you wouldn’t want shared publicly.
            </li>
            <li>No accounts, no ads, and no tracking cookies.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
