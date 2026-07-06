import {
  VCARD_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  isValidTemplateId,
  normalizeTemplateId,
} from "./vcardTemplates";

/**
 * ⚠️  Template ids are part of the printed-card contract (the `t` query param).
 * Existing ids must never change or a printed QR would render the wrong style.
 */
const FROZEN_TEMPLATE_IDS = ["classic", "modern", "minimal", "dark"];

describe("vcard templates", () => {
  it("keeps the frozen template ids available", () => {
    const ids = VCARD_TEMPLATES.map((t) => t.id);
    FROZEN_TEMPLATE_IDS.forEach((id) => expect(ids).toContain(id));
  });

  it("defaults to classic (the id omitted from URLs)", () => {
    expect(DEFAULT_TEMPLATE_ID).toBe("classic");
    expect(isValidTemplateId(DEFAULT_TEMPLATE_ID)).toBe(true);
  });

  it("validates known and unknown ids", () => {
    expect(isValidTemplateId("modern")).toBe(true);
    expect(isValidTemplateId("nope")).toBe(false);
    expect(isValidTemplateId("")).toBe(false);
    expect(isValidTemplateId(null)).toBe(false);
    expect(isValidTemplateId(undefined)).toBe(false);
  });

  it("normalizes unknown ids back to the default", () => {
    expect(normalizeTemplateId("dark")).toBe("dark");
    expect(normalizeTemplateId("bogus")).toBe("classic");
    expect(normalizeTemplateId(null)).toBe("classic");
  });

  it("gives every template a label and description", () => {
    VCARD_TEMPLATES.forEach((t) => {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    });
  });
});
