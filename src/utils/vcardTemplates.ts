/**
 * Standard v-card view templates.
 *
 * The chosen template id is stored in the share URL as the `t` query param
 * (e.g. /vcard-view?data=…&t=modern) so anyone who scans the QR sees the card
 * in the pre-selected style. The id is part of the printed-card contract —
 * ids here must stay stable. `classic` is the default and is intentionally
 * omitted from the URL so existing cards (no `t` param) keep working.
 */
export type VCardTemplate = {
  id: string;
  label: string;
  description: string;
};

export const VCARD_TEMPLATES: VCardTemplate[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Clean white card with teal accents.",
  },
  {
    id: "modern",
    label: "Modern",
    description: "Bold gradient header, rounded and vivid.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Understated monochrome, no color accents.",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Dark background with high-contrast text.",
  },
];

export const DEFAULT_TEMPLATE_ID = "classic";

export function isValidTemplateId(id: string | null | undefined): boolean {
  return !!id && VCARD_TEMPLATES.some((t) => t.id === id);
}

/** Coerce any incoming id to a known template, falling back to the default. */
export function normalizeTemplateId(id: string | null | undefined): string {
  return isValidTemplateId(id) ? (id as string) : DEFAULT_TEMPLATE_ID;
}
