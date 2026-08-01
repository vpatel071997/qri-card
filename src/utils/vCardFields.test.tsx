import { vCardFields } from "./vCardFields";

/**
 * ⚠️  SCHEMA STABILITY — printed cards depend on this.
 *
 * Every QR code stores contact data keyed by the numeric `id` of each field.
 * The viewer maps those ids back to names to render the card. If an id is
 * renumbered, removed, or remapped to a different name, previously printed
 * cards will render the wrong data (or nothing). This test freezes the mapping.
 *
 * Adding a NEW field with a brand-new id is safe. Changing or removing an
 * existing id/name pairing is a breaking change — update this snapshot only
 * with a deliberate migration plan.
 */

// Frozen id → name contract. Never change existing rows; only append.
const FROZEN_ID_TO_NAME: Record<string, string> = {
  "1": "title",
  "2": "firstName",
  "3": "middleName",
  "4": "lastName",
  "5": "gender",
  "6": "email",
  "7": "phone",
  "8": "street",
  "9": "city",
  "10": "state",
  "11": "country",
  "12": "postalCode",
  "13": "birthday",
  "14": "org",
  "15": "photoUrl",
  "16": "website",
  "17": "instagram",
  "18": "linkedin",
  "19": "twitter",
  "20": "facebook",
  "21": "note",
};

describe("vCardFields schema stability", () => {
  it("preserves the frozen id → name mapping for every field", () => {
    const actual: Record<string, string> = {};
    vCardFields.forEach((f) => {
      actual[f.id] = f.name;
    });
    // Every frozen pair must still exist exactly as printed on old cards.
    Object.entries(FROZEN_ID_TO_NAME).forEach(([id, name]) => {
      expect(actual[id]).toBe(name);
    });
  });

  it("uses unique ids (no collisions that would corrupt stored data)", () => {
    const ids = vCardFields.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses unique names (no two fields decode to the same key)", () => {
    const names = vCardFields.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps First Name and Last Name marked as required", () => {
    const required = vCardFields
      .filter((f) => (f as { required?: boolean }).required)
      .map((f) => f.name);
    expect(required).toContain("firstName");
    expect(required).toContain("lastName");
  });

  it("gives every field a non-empty label for the UI", () => {
    vCardFields.forEach((f) => {
      expect(typeof f.label).toBe("string");
      expect(f.label.length).toBeGreaterThan(0);
    });
  });
});
