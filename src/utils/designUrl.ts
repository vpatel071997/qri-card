// Shareable editor state. Encodes the builder's content + design into query
// params so a link reopens the editor exactly as it was (sharing, templates,
// collaboration). Pure and unit-tested.
//
// The design fields are readable params; the many-field v-card is compressed
// into a single `vc` param with LZString (same lib as the printed-card share
// format). A center logo is intentionally NOT encoded — data URLs are far too
// large for a URL.
import LZString from "lz-string";
import { VCardProps } from "./props";

export interface DesignState {
  type: "link" | "vcard";
  url: string;
  vCard: VCardProps;
  frame: string;
  dotStyle: string;
  cornerStyle: string;
  qrColor: string;
  gradientEnabled: boolean;
  gradientType: string;
  gradientColor2: string;
  eyeColor: string;
  transparentBg: boolean;
  resolution: number;
  template: string;
}

// Short param keys keep the link compact.
const KEYS = {
  type: "ty",
  url: "u",
  vCard: "vc",
  frame: "fr",
  dotStyle: "dt",
  cornerStyle: "cn",
  qrColor: "c",
  gradientEnabled: "g",
  gradientType: "gt",
  gradientColor2: "g2",
  eyeColor: "ey",
  transparentBg: "tb",
  resolution: "rs",
  template: "tpl",
} as const;

// Colours are written without the leading '#' to save characters.
const stripHash = (c: string) => c.replace(/^#/, "");
const addHash = (c: string) => (c ? `#${c.replace(/^#/, "")}` : "");

export function encodeDesignParams(state: DesignState): string {
  const p = new URLSearchParams();
  p.set(KEYS.type, state.type === "vcard" ? "v" : "l");

  if (state.type === "link") {
    if (state.url) p.set(KEYS.url, state.url);
  } else {
    const nonEmpty: VCardProps = {};
    Object.keys(state.vCard || {}).forEach((k) => {
      const v = state.vCard[k];
      if (v) nonEmpty[k] = v;
    });
    if (Object.keys(nonEmpty).length) {
      p.set(
        KEYS.vCard,
        LZString.compressToEncodedURIComponent(JSON.stringify(nonEmpty)),
      );
    }
    if (state.template) p.set(KEYS.template, state.template);
  }

  if (state.frame && state.frame !== "none") p.set(KEYS.frame, state.frame);
  if (state.dotStyle && state.dotStyle !== "square")
    p.set(KEYS.dotStyle, state.dotStyle);
  if (state.cornerStyle && state.cornerStyle !== "square")
    p.set(KEYS.cornerStyle, state.cornerStyle);
  if (state.qrColor) p.set(KEYS.qrColor, stripHash(state.qrColor));
  if (state.gradientEnabled) {
    p.set(KEYS.gradientEnabled, "1");
    p.set(KEYS.gradientType, state.gradientType);
    p.set(KEYS.gradientColor2, stripHash(state.gradientColor2));
  }
  if (state.eyeColor) p.set(KEYS.eyeColor, stripHash(state.eyeColor));
  if (state.transparentBg) p.set(KEYS.transparentBg, "1");
  if (state.resolution) p.set(KEYS.resolution, String(state.resolution));

  return p.toString();
}

// Parse a query string (with or without a leading '?') back into a partial
// state. Returns null when there are no recognised design params, so callers
// can fall back to localStorage. Malformed input degrades gracefully.
export function decodeDesignParams(
  search: string,
): Partial<DesignState> | null {
  const p = new URLSearchParams(
    search && search.startsWith("?") ? search.slice(1) : search,
  );

  const hasAny = Object.values(KEYS).some((k) => p.has(k));
  if (!hasAny) return null;

  const out: Partial<DesignState> = {};

  out.type = p.get(KEYS.type) === "v" ? "vcard" : "link";

  const u = p.get(KEYS.url);
  if (u) out.url = u;

  const vc = p.get(KEYS.vCard);
  if (vc) {
    try {
      const json = LZString.decompressFromEncodedURIComponent(vc);
      const parsed = json ? JSON.parse(json) : null;
      if (parsed && typeof parsed === "object")
        out.vCard = parsed as VCardProps;
    } catch {
      /* ignore a corrupt v-card param */
    }
  }

  const fr = p.get(KEYS.frame);
  if (fr) out.frame = fr;
  const dt = p.get(KEYS.dotStyle);
  if (dt) out.dotStyle = dt;
  const cn = p.get(KEYS.cornerStyle);
  if (cn) out.cornerStyle = cn;
  const c = p.get(KEYS.qrColor);
  if (c) out.qrColor = addHash(c);
  if (p.get(KEYS.gradientEnabled) === "1") {
    out.gradientEnabled = true;
    const gt = p.get(KEYS.gradientType);
    if (gt) out.gradientType = gt;
    const g2 = p.get(KEYS.gradientColor2);
    if (g2) out.gradientColor2 = addHash(g2);
  }
  const ey = p.get(KEYS.eyeColor);
  if (ey) out.eyeColor = addHash(ey);
  if (p.get(KEYS.transparentBg) === "1") out.transparentBg = true;
  const rs = Number(p.get(KEYS.resolution));
  if (rs) out.resolution = rs;
  const tpl = p.get(KEYS.template);
  if (tpl) out.template = tpl;

  return out;
}
