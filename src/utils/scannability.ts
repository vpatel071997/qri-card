// Scannability guard — warns when a QR code's foreground/background colours are
// too low-contrast to reliably scan. Pure functions, no DOM, so they can be
// unit-tested and reused by the batch generator.

// Parse a #rgb / #rrggbb hex string into [r, g, b] (0-255). Returns null for
// anything we can't read (e.g. "transparent", a gradient, or a bad value).
export function hexToRgb(hex: string): [number, number, number] | null {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Relative luminance per WCAG 2.1.
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// WCAG contrast ratio between two hex colours (1–21). Returns 0 when either
// colour can't be parsed, which the caller treats as "can't verify".
export function contrastRatio(fg: string, bg: string): number {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!a || !b) return 0;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ScanLevel = "good" | "warn" | "bad";

export interface ScanVerdict {
  level: ScanLevel;
  ratio: number;
  message: string;
}

// A QR scanner needs a clear light/dark difference. Below ~3:1 most scanners
// fail; 3–4.5 is risky. We reuse WCAG thresholds as a practical proxy.
const GOOD_RATIO = 4.5;
const RISKY_RATIO = 3;

export function scannabilityVerdict(fg: string, bg: string): ScanVerdict {
  const ratio = contrastRatio(fg, bg);
  if (ratio === 0) {
    return {
      level: "warn",
      ratio: 0,
      message: "Contrast can't be checked for this colour — test before print.",
    };
  }
  if (ratio >= GOOD_RATIO) {
    return {
      level: "good",
      ratio,
      message: "Good contrast — this QR should scan reliably.",
    };
  }
  if (ratio >= RISKY_RATIO) {
    return {
      level: "warn",
      ratio,
      message: "Low contrast — this QR may not scan on every device.",
    };
  }
  return {
    level: "bad",
    ratio,
    message: "Very low contrast — this QR is unlikely to scan. Darken it.",
  };
}
