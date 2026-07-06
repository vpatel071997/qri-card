import { useEffect, useMemo, useRef, useState } from "react";
import QRCodeStyling, {
  DotType,
  CornerSquareType,
} from "qr-code-styling";
import { toPng } from "html-to-image";
import LZString from "lz-string";
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
  Download as DownloadIcon,
} from "react-bootstrap-icons";

import { VCardProps } from "../utils/props";
import { vCardFields } from "../utils/vCardFields";

type QRType = "link" | "vcard";
type DesignTab = "frame" | "shape" | "color";
type FrameId = "none" | "rounded" | "scan-bottom" | "scan-top" | "brackets";

const QR_INK = "#1f2a44";

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
  const [type, setType] = useState<QRType>("link");
  const [url, setUrl] = useState<string>("");
  const [vCard, setVCard] = useState<VCardProps>({});

  // design state
  const [designTab, setDesignTab] = useState<DesignTab>("frame");
  const [frame, setFrame] = useState<FrameId>("none");
  const [dotStyle, setDotStyle] = useState<DotType>("square");
  const [cornerStyle, setCornerStyle] = useState<CornerSquareType>("square");
  const [qrColor, setQrColor] = useState<string>(QR_INK);
  const [copied, setCopied] = useState<boolean>(false);

  const captureRef = useRef<HTMLDivElement>(null);
  const qrNodeRef = useRef<HTMLDivElement>(null);
  const qrStyling = useRef<QRCodeStyling | null>(null);

  // The QR itself carries the raw payload — readable plain-text contact details
  // grouped by category (what shows when someone scans it).
  const vCardText = useMemo(() => {
    const g = (id: string) => (vCard[id] ?? "").trim();
    const hasAny = Object.values(vCard).some((v) => v && v.trim() !== "");
    if (!hasAny) return "";

    const nameIds = ["1", "2", "3", "4"];
    const blocks: string[] = [];

    VCARD_GROUPS.forEach((group) => {
      const lines: string[] = [];

      if (group.ids.some((id) => nameIds.includes(id))) {
        const name = nameIds
          .map((id) => g(id))
          .filter(Boolean)
          .join(" ");
        if (name) lines.push(`Name :- ${name}`);
      }

      group.ids.forEach((id) => {
        if (nameIds.includes(id)) return;
        const field = vCardFields.find((f) => f.id === id);
        const value = g(id);
        if (field && value) lines.push(`${field.label} :- ${value}`);
      });

      if (lines.length) {
        blocks.push(`${group.title}\r\n${lines.join("\r\n")}`);
      }
    });

    return blocks.join("\r\n\r\n");
  }, [vCard]);

  // The Copy-link button copies a shareable page URL instead of the raw payload:
  //  - v-card -> /vcard-view?data=... (renders the contact + Add to Contacts)
  const vCardShareUrl = useMemo(() => {
    const filtered = Object.fromEntries(
      Object.entries(vCard).filter(([, v]) => v && v.trim() !== ""),
    );
    if (Object.keys(filtered).length === 0) return "";

    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify(filtered),
    );
    return `${window.location.origin}/vcard-view?data=${compressed}`;
  }, [vCard]);

  //  - link -> /link?url=... (redirects the visitor to the target)
  const linkRedirectUrl = useMemo(() => {
    const target = url.trim();
    if (!target) return "";
    const normalized = /^https?:\/\//i.test(target) ? target : `https://${target}`;
    return `${window.location.origin}/link?url=${encodeURIComponent(normalized)}`;
  }, [url]);

  const qrValue = type === "link" ? url.trim() : vCardText;
  const copyValue = type === "link" ? linkRedirectUrl : vCardShareUrl;
  const hasValue = qrValue.length > 0;

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

  const handleDownload = () => {
    if (captureRef.current === null || !hasValue) return;

    toPng(captureRef.current, {
      pixelRatio: 4,
      backgroundColor: "#ffffff",
      cacheBust: true,
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = "qri-card-export.png";
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Error generating QR code PNG:", err);
      });
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
  };

  const handleTypeChange = (next: QRType) => {
    if (next === type) return;
    setType(next);
    setUrl("");
    setVCard({});
  };

  const contentTitle =
    type === "link" ? "Enter your Website" : "Enter your contact details";

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
              <input
                type="url"
                inputMode="url"
                className="qr-input"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-label="Website URL"
              />
            ) : (
              <div className="vcard-groups">
                {VCARD_GROUPS.map((group) => (
                  <fieldset className="vcard-group" key={group.title}>
                    <legend className="vcard-group-title">{group.title}</legend>
                    <div className="vcard-grid">
                      {group.ids.map((id) => {
                        const field = vCardFields.find((f) => f.id === id);
                        if (!field) return null;

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
                              {field.required && <span className="req"> *</span>}
                            </label>

                            {field.options ? (
                              <CustomSelect
                                id={`vcard-${field.id}`}
                                value={vCard[field.id] ?? ""}
                                placeholder={`Select ${field.label}`}
                                options={field.options}
                                onChange={(v) =>
                                  setVCard({ ...vCard, [field.id]: v })
                                }
                              />
                            ) : field.type === "textarea" ? (
                              <textarea
                                id={`vcard-${field.id}`}
                                className="qr-input"
                                rows={3}
                                value={vCard[field.id] ?? ""}
                                onChange={(e) =>
                                  setVCard({
                                    ...vCard,
                                    [field.id]: e.target.value,
                                  })
                                }
                              />
                            ) : (
                              <input
                                id={`vcard-${field.id}`}
                                type={field.type}
                                className="qr-input"
                                value={vCard[field.id] ?? ""}
                                onChange={(e) =>
                                  setVCard({
                                    ...vCard,
                                    [field.id]: e.target.value,
                                  })
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}

            <button
              type="button"
              className="ghost-btn"
              onClick={handleReset}
              disabled={!hasValue}
            >
              <ArrowCounterclockwise size={16} aria-hidden />
              Reset
            </button>
          </div>

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
          </div>
        </section>

        {/* ------------------- Right: live preview + download ------------------- */}
        <aside className="panel qr-preview">
          <div className="step-head">
            <h2>Your QR Code</h2>
          </div>

          <div className={`qr-canvas ${hasValue ? "" : "is-empty"}`}>
            <div
              ref={captureRef}
              className="qr-capture"
              style={{ ["--qr-color" as string]: qrColor } as React.CSSProperties}
            >
              {framedQR}
            </div>
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={handleDownload}
            disabled={!hasValue}
          >
            <Download size={18} aria-hidden />
            Download QR Code
          </button>

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
      <section className="panel help-card">
        <div className="section-head">
          <span className="section-icon">
            <QuestionCircle size={20} aria-hidden />
          </span>
          <h2>Help &amp; How it works</h2>
        </div>
        <div className="help-steps">
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
              Fill in the fields — the QR code updates live in the preview on the
              right as you type.
            </p>
          </div>
          <div className="help-step">
            <span className="help-step-icon">
              <Palette size={18} aria-hidden />
            </span>
            <h3>3. Design it</h3>
            <p>
              Pick a frame, change the module &amp; corner shape, and choose any
              color you like.
            </p>
          </div>
          <div className="help-step">
            <span className="help-step-icon">
              <DownloadIcon size={18} aria-hidden />
            </span>
            <h3>4. Download</h3>
            <p>
              Save a high-resolution PNG — exactly what you see in the preview —
              ready to share or print.
            </p>
          </div>
        </div>
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
          shareable digital business cards. Everything runs right in your browser
          — your data never leaves your device. Customize the frame, shape, and
          color, then download a crisp PNG in a single click.
        </p>
        <p className="about-credit">
          Created by{" "}
          <a
            href="https://synivo.tech/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Synivo
          </a>
          .
        </p>
      </section>
    </div>
  );
}
