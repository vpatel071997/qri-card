import LZString from "lz-string";

import { VCardProps } from "./props";
import { vCardFields } from "./vCardFields";
import { DEFAULT_TEMPLATE_ID, isValidTemplateId } from "./vcardTemplates";

/**
 * Encoding contract for shareable v-card links and link redirects.
 *
 * ⚠️  IMPORTANT — READ BEFORE CHANGING ANYTHING HERE
 * These functions define the exact format that is baked into QR codes printed
 * on physical cards handed to customers. Any change to the compression, the
 * `data`/`url` query params, or the vCardFields id↔name mapping will silently
 * break every card already in the wild.
 *
 * The golden-fixture tests in `vcard.test.tsx` lock this behaviour down. If you
 * genuinely intend to change the format, do it deliberately and update those
 * fixtures with a clear migration plan — never "fix the failing test" casually.
 */

/** Keep only non-empty fields, keyed by their stable numeric id ("1".."21"). */
export function buildVCardPayload(vCard: VCardProps): Record<string, string> {
  return Object.fromEntries(
    Object.entries(vCard).filter(
      ([, v]) => typeof v === "string" && v.trim() !== "",
    ),
  ) as Record<string, string>;
}

/** Compress an id→value payload into the URL-safe `data` token. */
export function encodeVCardData(payload: Record<string, string>): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

/**
 * Full shareable v-card view URL. Empty string when there is no data.
 * The template id is appended as `&t=<id>`; the default template is left out so
 * that already-printed cards (no `t` param) keep resolving to the same style.
 */
export function buildVCardShareUrl(
  origin: string,
  vCard: VCardProps,
  templateId?: string,
): string {
  const payload = buildVCardPayload(vCard);
  if (Object.keys(payload).length === 0) return "";
  let url = `${origin}/vcard-view?data=${encodeVCardData(payload)}`;
  if (
    templateId &&
    templateId !== DEFAULT_TEMPLATE_ID &&
    isValidTemplateId(templateId)
  ) {
    url += `&t=${templateId}`;
  }
  return url;
}

/**
 * Decode a `data` token back into a v-card keyed by field *name*
 * (firstName, email, …) — the shape the viewer renders. Returns {} when the
 * token is missing or corrupt so the viewer degrades gracefully.
 */
export function decodeVCardData(compressed: string): VCardProps {
  if (!compressed) return {};
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return {};
    const byId = JSON.parse(json) as Record<string, string>;
    const byName: VCardProps = {};
    vCardFields.forEach((field) => {
      if (byId[field.id]) byName[field.name] = byId[field.id];
    });
    return byName;
  } catch (e) {
    console.error("Failed to decode vCard data", e);
    return {};
  }
}

/** Prefix a bare host with https:// so links always resolve. */
export function normalizeUrl(raw: string): string {
  const target = raw.trim();
  if (!target) return "";
  return /^https?:\/\//i.test(target) ? target : `https://${target}`;
}

/** Build the /link redirect URL. Empty string when there is no target. */
export function buildLinkRedirectUrl(origin: string, raw: string): string {
  const normalized = normalizeUrl(raw);
  if (!normalized) return "";
  return `${origin}/link?url=${encodeURIComponent(normalized)}`;
}
