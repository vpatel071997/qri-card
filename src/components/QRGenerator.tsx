import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
  CursorFill,
  PencilSquare,
  Palette,
  Clipboard,
  ClipboardCheck,
  Trash,
  Download as DownloadIcon,
  Image as ImageIcon,
  XCircle,
  CheckCircleFill,
  ExclamationTriangleFill,
  Share,
  ClockHistory,
  Grid3x3Gap,
  ArrowRight,
} from "react-bootstrap-icons";

import { VCardProps } from "../utils/props";
import { vCardFields } from "../utils/vCardFields";
import { buildVCardShareUrl, buildLinkRedirectUrl } from "../utils/vcard";
import { jpegDataUrlToPdfBlob } from "../utils/pdf";
import { jpegDataUrlToEpsBlob } from "../utils/eps";
import { VCARD_TEMPLATES, DEFAULT_TEMPLATE_ID } from "../utils/vcardTemplates";
import { buildQrOptions, GradientType } from "../utils/qrOptions";
import { scannabilityVerdict } from "../utils/scannability";
import {
  encodeDesignParams,
  decodeDesignParams,
  DesignState,
} from "../utils/designUrl";
import {
  loadRecents,
  addRecent,
  clearRecents,
  RecentCode,
} from "../utils/recents";
import PageInfoSections, { HelpStep } from "./PageInfoSections";

type QRType = "link" | "vcard";
type DesignTab = "frame" | "shape" | "color" | "logo";
type FrameId = "none" | "rounded" | "scan-bottom" | "scan-top" | "brackets";
type DownloadFormat = "png" | "svg" | "pdf" | "eps";
type Resolution = 512 | 1024 | 2048;

const QR_INK = "#1f2a44";
const MAX_LOGO_BYTES = 512 * 1024; // 512 KB — keeps localStorage snapshots sane
// On-screen QR size. Intrinsic (qr-code-styling) size and the CSS display size
// are both driven off this so the download matches the preview exactly.
const QR_PREVIEW_SIZE = 176;

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
  // Advanced design
  gradientEnabled: boolean;
  gradientType: GradientType;
  gradientColor2: string;
  eyeColor: string;
  logo: string;
  transparentBg: boolean;
  resolution: Resolution;
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

const HELP_STEPS: HelpStep[] = [
  {
    icon: <CursorFill size={18} aria-hidden />,
    title: "1. Pick a type",
    body: (
      <>
        Choose <strong>Link</strong> for a website, or <strong>V-card</strong>{" "}
        to share your contact details.
      </>
    ),
  },
  {
    icon: <PencilSquare size={18} aria-hidden />,
    title: "2. Add the content",
    body: "Fill in the fields — the QR code updates live in the preview on the right as you type.",
  },
  {
    icon: <Palette size={18} aria-hidden />,
    title: "3. Design it",
    body: (
      <>
        Pick a frame, change the module &amp; corner shape, and choose any color
        you like.
      </>
    ),
  },
  {
    icon: <DownloadIcon size={18} aria-hidden />,
    title: "4. Download",
    body: "Save a high-resolution PNG, SVG, or PDF — exactly what you see in the preview — ready to share or print.",
  },
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
  // Advanced design: gradient fill, separate eye colour, center logo.
  const [gradientEnabled, setGradientEnabled] = useState<boolean>(
    persisted?.gradientEnabled ?? false,
  );
  const [gradientType, setGradientType] = useState<GradientType>(
    persisted?.gradientType ?? "linear",
  );
  const [gradientColor2, setGradientColor2] = useState<string>(
    persisted?.gradientColor2 ?? "#4a0fb0",
  );
  const [eyeColor, setEyeColor] = useState<string>(persisted?.eyeColor ?? "");
  const [logo, setLogo] = useState<string>(persisted?.logo ?? "");
  const [logoError, setLogoError] = useState<string>("");
  // Export options.
  const [transparentBg, setTransparentBg] = useState<boolean>(
    persisted?.transparentBg ?? false,
  );
  const [resolution, setResolution] = useState<Resolution>(
    persisted?.resolution ?? 1024,
  );
  // Which standard template the shared v-card page renders in.
  const [template, setTemplate] = useState<string>(
    persisted?.template ?? DEFAULT_TEMPLATE_ID,
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [imgCopied, setImgCopied] = useState<boolean>(false);
  const [editorCopied, setEditorCopied] = useState<boolean>(false);
  // Recent codes (localStorage-backed history).
  const [recents, setRecents] = useState<RecentCode[]>(() => loadRecents());
  // On mobile the preview (and its Terms gate) is hidden until "Generate", so
  // the Terms gate is shown next to the Generate button instead. matchMedia is
  // undefined under jsdom, which resolves to the desktop layout in tests.
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.matchMedia?.("(max-width: 900px)")?.matches ?? false,
  );
  // On mobile the preview stays hidden until the user taps "Generate".
  const [generated, setGenerated] = useState<boolean>(false);
  // User must accept the Terms & Conditions before generating/downloading.
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  // Shown when the user tries to output without ticking the Terms box.
  const [showTermsWarning, setShowTermsWarning] = useState<boolean>(false);

  // Which fields the user has interacted with — errors only show after blur.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Whether saved data exists (controls the "Clear all" button).
  const [hasStored, setHasStored] = useState<boolean>(persisted !== null);
  // Download format menu open/closed.
  const [dlOpen, setDlOpen] = useState<boolean>(false);

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
  // Output buttons are clickable as soon as there's content; the Terms gate is
  // enforced *on click* (showing a prompt) rather than by disabling the button,
  // so a user who forgets to tick the box gets told why nothing happened.
  const ensureTerms = (): boolean => {
    if (agreedToTerms) return true;
    setShowTermsWarning(true);
    return false;
  };

  /* render / update the styled QR */
  useEffect(() => {
    if (!hasValue || !qrNodeRef.current) return;

    // Preview keeps a transparent QR background — the frame element behind it
    // provides the white card, so frames render correctly. The transparent-bg
    // export toggle is applied at download time instead.
    const options = buildQrOptions({
      data: qrValue,
      size: QR_PREVIEW_SIZE,
      dotStyle,
      cornerStyle,
      color: qrColor,
      gradientEnabled,
      gradientType,
      gradientColor2,
      eyeColor,
      logo,
      transparentBg: true,
    });

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
  }, [
    hasValue,
    qrValue,
    dotStyle,
    cornerStyle,
    qrColor,
    frame,
    gradientEnabled,
    gradientType,
    gradientColor2,
    eyeColor,
    logo,
  ]);

  /* persist the builder state to localStorage */
  useEffect(() => {
    const hasAnyData =
      hasValue ||
      frame !== "none" ||
      dotStyle !== "square" ||
      cornerStyle !== "square" ||
      qrColor !== QR_INK ||
      template !== DEFAULT_TEMPLATE_ID ||
      gradientEnabled ||
      eyeColor !== "" ||
      logo !== "" ||
      transparentBg;

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
          gradientEnabled,
          gradientType,
          gradientColor2,
          eyeColor,
          logo,
          transparentBg,
          resolution,
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
    gradientEnabled,
    gradientType,
    gradientColor2,
    eyeColor,
    logo,
    transparentBg,
    resolution,
  ]);

  /* track the mobile breakpoint so the Terms gate can follow the layout */
  useEffect(() => {
    const mq = window.matchMedia?.("(max-width: 900px)");
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

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

  const triggerDownload = (dataUrl: string, ext: string) => {
    const link = document.createElement("a");
    link.download = `qri-card-export.${ext}`;
    link.href = dataUrl;
    link.click();
  };

  // Map the chosen output resolution onto html-to-image's pixelRatio. The
  // captured QR is QR_PREVIEW_SIZE px wide, so ratio = target / size yields
  // roughly the requested pixel dimensions.
  const pixelRatioFor = (target: number) =>
    Math.max(1, Math.round((target / QR_PREVIEW_SIZE) * 100) / 100);

  const handleDownload = (format: DownloadFormat) => {
    if (captureRef.current === null || !hasValue) return;
    if (!ensureTerms()) return;
    setDlOpen(false);
    rememberRecent();

    if (format === "svg") {
      toSvg(captureRef.current, { cacheBust: true })
        .then((dataUrl) => triggerDownload(dataUrl, "svg"))
        .catch((err) => console.error("Error generating QR code SVG:", err));
      return;
    }

    if (format === "png") {
      toPng(captureRef.current, {
        pixelRatio: pixelRatioFor(resolution),
        // Transparent PNG omits the white backdrop so the code can sit on any
        // surface; otherwise fill white for maximum scan contrast.
        backgroundColor: transparentBg ? undefined : "#ffffff",
        cacheBust: true,
      })
        .then((dataUrl) => triggerDownload(dataUrl, "png"))
        .catch((err) => console.error("Error generating QR code PNG:", err));
      return;
    }

    // PDF/EPS: embed a high-res JPEG raster (JPEG has no alpha, so these are
    // always on white regardless of the transparent toggle). Print shops ask
    // for EPS; both reuse the same verbatim-JPEG embedding.
    toJpeg(captureRef.current, {
      pixelRatio: pixelRatioFor(resolution),
      backgroundColor: "#ffffff",
      quality: 0.95,
      cacheBust: true,
    })
      .then((dataUrl) => {
        const img = new Image();
        img.onload = () => {
          const blob =
            format === "eps"
              ? jpegDataUrlToEpsBlob(
                  dataUrl,
                  img.naturalWidth,
                  img.naturalHeight,
                )
              : jpegDataUrlToPdfBlob(
                  dataUrl,
                  img.naturalWidth,
                  img.naturalHeight,
                );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.download = `qri-card-export.${format}`;
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
        };
        img.src = dataUrl;
      })
      .catch((err) =>
        console.error(`Error generating QR code ${format.toUpperCase()}:`, err),
      );
  };

  const handleCopy = () => {
    if (!copyValue) return;
    if (!ensureTerms()) return;
    rememberRecent();
    navigator.clipboard?.writeText(copyValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // Copy the rendered QR (with frame) to the clipboard as a PNG image.
  const handleCopyImage = () => {
    if (captureRef.current === null || !hasValue) return;
    if (!ensureTerms()) return;
    const clip = navigator.clipboard as Clipboard & {
      write?: (items: ClipboardItem[]) => Promise<void>;
    };
    if (!clip?.write || typeof ClipboardItem === "undefined") return;

    toPng(captureRef.current, {
      pixelRatio: pixelRatioFor(resolution),
      backgroundColor: transparentBg ? undefined : "#ffffff",
      cacheBust: true,
    })
      .then((dataUrl) => fetch(dataUrl))
      .then((res) => res.blob())
      .then((blob) => clip.write!([new ClipboardItem({ "image/png": blob })]))
      .then(() => {
        setImgCopied(true);
        setTimeout(() => setImgCopied(false), 1800);
      })
      .catch((err) => console.error("Error copying QR image:", err));
  };

  const handleLogoUpload = (file: File | undefined) => {
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be under 512 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ""));
    reader.onerror = () => setLogoError("Could not read that file.");
    reader.readAsDataURL(file);
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
    setGradientEnabled(false);
    setGradientType("linear");
    setGradientColor2("#4a0fb0");
    setEyeColor("");
    setLogo("");
    setLogoError("");
    setTransparentBg(false);
    setResolution(1024);
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

  // Snapshot of the current builder state, for share links + recents.
  const currentDesign = (): DesignState => ({
    type,
    url,
    vCard,
    frame,
    dotStyle,
    cornerStyle,
    qrColor,
    gradientEnabled,
    gradientType,
    gradientColor2,
    eyeColor,
    transparentBg,
    resolution,
    template,
  });

  // Apply a (partial) decoded design back onto the builder — used both when the
  // page loads from a shared ?…= link and when a Recent chip is clicked.
  const applyDesign = (d: Partial<DesignState>) => {
    if (d.type) setType(d.type);
    if (d.url !== undefined) setUrl(d.url);
    if (d.vCard) setVCard(d.vCard);
    if (d.frame) setFrame(d.frame as FrameId);
    if (d.dotStyle) setDotStyle(d.dotStyle as DotType);
    if (d.cornerStyle) setCornerStyle(d.cornerStyle as CornerSquareType);
    if (d.qrColor) setQrColor(d.qrColor);
    if (d.gradientEnabled !== undefined) setGradientEnabled(d.gradientEnabled);
    if (d.gradientType) setGradientType(d.gradientType as GradientType);
    if (d.gradientColor2) setGradientColor2(d.gradientColor2);
    if (d.eyeColor !== undefined) setEyeColor(d.eyeColor);
    if (d.transparentBg !== undefined) setTransparentBg(d.transparentBg);
    if (d.resolution) setResolution(d.resolution as Resolution);
    if (d.template) setTemplate(d.template);
  };

  // Load a shared editor link on mount (takes precedence over localStorage).
  useEffect(() => {
    const decoded = decodeDesignParams(window.location.search);
    if (decoded) applyDesign(decoded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Copy a link that reopens the editor with the exact current design.
  const handleCopyEditorLink = () => {
    const qs = encodeDesignParams(currentDesign());
    const link = `${window.location.origin}${window.location.pathname}?${qs}`;
    navigator.clipboard?.writeText(link).then(() => {
      setEditorCopied(true);
      setTimeout(() => setEditorCopied(false), 1800);
    });
  };

  // Push the current code onto the Recent list (called when the user acts on it).
  const rememberRecent = () => {
    if (!hasValue) return;
    const label =
      type === "link"
        ? url.trim()
        : [vCard["2"], vCard["4"]].filter(Boolean).join(" ") || "Contact";
    setRecents(
      addRecent(
        { type, label, value: encodeDesignParams(currentDesign()) },
        Date.now(),
      ),
    );
  };

  const handleRecentClick = (r: RecentCode) => {
    const decoded = decodeDesignParams(r.value);
    if (decoded) applyDesign(decoded);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearRecents = () => {
    clearRecents();
    setRecents([]);
  };

  // Reveal the preview and scroll it into view (mobile "Generate" flow).
  const handleGenerate = () => {
    if (!hasValue) return;
    if (!ensureTerms()) return;
    rememberRecent();
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

  // Contrast guard: warn when the QR colour is too light on white. A transparent
  // export can land on any surface, so we can only judge against white here.
  const scan = useMemo(
    () => scannabilityVerdict(qrColor, "#ffffff"),
    [qrColor],
  );

  // The Terms gate — rendered once, either next to Generate (mobile) or at the
  // end of the preview panel (desktop). Enforced on click (see ensureTerms).
  const termsGate = (
    <>
      <label className="terms-check">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => {
            setAgreedToTerms(e.target.checked);
            if (e.target.checked) setShowTermsWarning(false);
          }}
          aria-describedby="terms-note"
        />
        <span id="terms-note">
          I have read and agree to the{" "}
          <a href="#disclaimer">Terms &amp; Conditions and Privacy Policy</a>.
        </span>
      </label>

      {showTermsWarning && !agreedToTerms && (
        <p className="terms-warning" role="alert">
          <ExclamationTriangleFill size={14} aria-hidden />
          Please agree to the Terms &amp; Conditions and Privacy Policy first.
        </p>
      )}
    </>
  );

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

        <Link className="batch-cta" to="/batch">
          <Grid3x3Gap size={18} aria-hidden />
          <span>
            Need lots at once? <strong>Bulk generate from CSV</strong> —
            download a ZIP or printable label sheet
          </span>
          <ArrowRight size={16} aria-hidden />
        </Link>
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
              {(["frame", "shape", "color", "logo"] as DesignTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={designTab === t}
                  className={`design-tab ${designTab === t ? "is-active" : ""}`}
                  onClick={() => setDesignTab(t)}
                >
                  {t === "frame"
                    ? "Frame"
                    : t === "shape"
                      ? "Shape"
                      : t === "color"
                        ? "Color"
                        : "Logo"}
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

                {/* Scannability guard */}
                <div
                  className={`scan-guard scan-${scan.level}`}
                  role="status"
                  aria-live="polite"
                >
                  {scan.level === "good" ? (
                    <CheckCircleFill size={15} aria-hidden />
                  ) : (
                    <ExclamationTriangleFill size={15} aria-hidden />
                  )}
                  <span>{scan.message}</span>
                </div>

                {/* Gradient */}
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={gradientEnabled}
                    onChange={(e) => setGradientEnabled(e.target.checked)}
                  />
                  <span>Gradient fill</span>
                </label>

                {gradientEnabled && (
                  <div className="gradient-block">
                    <div className="gradient-dirs">
                      {(["linear", "radial"] as GradientType[]).map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={`chip ${gradientType === g ? "is-active" : ""}`}
                          onClick={() => setGradientType(g)}
                        >
                          {g === "linear" ? "Linear" : "Radial"}
                        </button>
                      ))}
                    </div>
                    <label className="color-custom" title="Second color">
                      <input
                        type="color"
                        value={gradientColor2}
                        onChange={(e) => setGradientColor2(e.target.value)}
                        aria-label="Gradient second color"
                      />
                    </label>
                  </div>
                )}

                {/* Separate eye colour */}
                <p className="sub-label">Corner (eye) color</p>
                <div className="color-row">
                  <button
                    type="button"
                    className={`color-swatch swatch-auto ${eyeColor === "" ? "is-active" : ""}`}
                    onClick={() => setEyeColor("")}
                    aria-label="Match body color"
                    title="Match body color"
                  >
                    Auto
                  </button>
                  <label className="color-custom" title="Custom eye color">
                    <input
                      type="color"
                      value={eyeColor || qrColor}
                      onChange={(e) => setEyeColor(e.target.value)}
                      aria-label="Eye color"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Logo */}
            {designTab === "logo" && (
              <div className="logo-block">
                <p className="sub-label">Center logo</p>
                {logo ? (
                  <div className="logo-preview">
                    <img src={logo} alt="Logo preview" />
                    <button
                      type="button"
                      className="ghost-btn ghost-btn--danger"
                      onClick={() => {
                        setLogo("");
                        setLogoError("");
                      }}
                    >
                      <XCircle size={16} aria-hidden />
                      Remove logo
                    </button>
                  </div>
                ) : (
                  <label className="logo-drop">
                    <ImageIcon size={26} aria-hidden />
                    <span>Upload a logo (PNG/JPG, under 512 KB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleLogoUpload(e.target.files?.[0] ?? undefined)
                      }
                    />
                  </label>
                )}
                {logoError && (
                  <span className="field-error" role="alert">
                    {logoError}
                  </span>
                )}
                <p className="logo-hint">
                  Adding a logo automatically raises error correction to the
                  highest level so the code still scans.
                </p>
              </div>
            )}

            {/* Mobile-only: the preview (with its Terms gate) is hidden until
                Generate, so show the Terms gate right here on mobile. */}
            {isMobile && <div className="mobile-terms">{termsGate}</div>}

            <button
              type="button"
              className="primary-btn generate-btn"
              onClick={handleGenerate}
              disabled={!hasValue}
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

          <div className="export-options">
            <div className="export-opt">
              <span className="export-opt-label">Resolution</span>
              <div className="seg">
                {([512, 1024, 2048] as Resolution[]).map((r) => (
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
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
              />
              <span>Transparent background (PNG)</span>
            </label>
          </div>

          <div
            className={`download-menu ${dlOpen ? "is-open" : ""}`}
            ref={dlRef}
          >
            <button
              type="button"
              className="primary-btn download-btn"
              onClick={() => {
                if (!ensureTerms()) return;
                setDlOpen((o) => !o);
              }}
              disabled={!hasValue}
              aria-haspopup="menu"
              aria-expanded={dlOpen}
            >
              <Download size={16} aria-hidden />
              Download QR Code
              <ChevronDown size={15} aria-hidden />
            </button>

            {dlOpen && (
              <ul className="download-options" role="menu">
                {(["png", "svg", "pdf", "eps"] as DownloadFormat[]).map(
                  (fmt) => (
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
                  ),
                )}
              </ul>
            )}
          </div>

          <div className="copy-row">
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

            <button
              type="button"
              className="link-copy"
              onClick={handleCopyImage}
              disabled={!hasValue}
            >
              {imgCopied ? (
                <>
                  <ClipboardCheck size={15} aria-hidden />
                  Image copied
                </>
              ) : (
                <>
                  <ImageIcon size={15} aria-hidden />
                  Copy image
                </>
              )}
            </button>
          </div>

          {/* Share the editor state — a link that reopens this exact design. */}
          <button
            type="button"
            className="editor-link-btn"
            onClick={handleCopyEditorLink}
            disabled={!hasValue}
          >
            {editorCopied ? (
              <>
                <ClipboardCheck size={14} aria-hidden />
                Editor link copied
              </>
            ) : (
              <>
                <Share size={14} aria-hidden />
                Copy editor link
              </>
            )}
          </button>

          {/* Terms gate — desktop shows it here at the end of the panel; on
              mobile it's rendered next to the Generate button instead. */}
          {!isMobile && termsGate}
        </aside>
      </div>

      {/* ----------------------------- Recent codes ----------------------------- */}
      {recents.length > 0 && (
        <section className="panel recents-card">
          <div className="section-head recents-head">
            <span className="section-icon">
              <ClockHistory size={20} aria-hidden />
            </span>
            <h2>Recent codes</h2>
            <button
              type="button"
              className="ghost-btn ghost-btn--danger recents-clear"
              onClick={handleClearRecents}
            >
              <Trash size={15} aria-hidden />
              Clear
            </button>
          </div>
          <div className="recents-row">
            {recents.map((r) => (
              <button
                key={`${r.value}-${r.ts}`}
                type="button"
                className="recent-chip"
                onClick={() => handleRecentClick(r)}
                title={r.label}
              >
                <span className="recent-chip-icon">
                  {r.type === "link" ? (
                    <Link45deg size={15} aria-hidden />
                  ) : (
                    <PersonVcard size={15} aria-hidden />
                  )}
                </span>
                <span className="recent-chip-label">{r.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* --------------------- Help / About / Disclaimer -------------------- */}
      <PageInfoSections helpSteps={HELP_STEPS} />
    </div>
  );
}
