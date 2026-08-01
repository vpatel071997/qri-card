import {
  buildVCardPayload,
  encodeVCardData,
  decodeVCardData,
  buildVCardShareUrl,
  normalizeUrl,
  buildLinkRedirectUrl,
} from "./vcard";
import { VCardProps } from "./props";

/**
 * ⚠️  CONTRACT TESTS — printed cards depend on these.
 *
 * These lock the exact wire format encoded into QR codes on physical cards.
 * A failure here means a code change would break cards already handed to
 * customers. Do NOT "fix" a failure by editing the fixture unless you are
 * deliberately migrating the format and have a plan for cards in the wild.
 */

// A card printed with these details must always decode back to the same person.
const GOLDEN_INPUT: VCardProps = {
  "1": "Mr.",
  "2": "John",
  "4": "Doe",
  "6": "john@example.com",
  "7": "+61 400 000 000",
  "16": "https://example.com",
};

// The exact `data` token produced by the shipping encoder for GOLDEN_INPUT.
const GOLDEN_TOKEN =
  "N4IgjCBcILIE4DoQBoQCYogFIHsAWAdiiACyYAiOApsQGyYBW+BAAlQB4CGAtgA4A2VBAGMc3YgHZMAalpgABCQAMS+StXriYetDwAXPbwDOkAPSmOPAUNHiAvkA";

// What the viewer must render — keyed by field NAME after id→name mapping.
const GOLDEN_DECODED = {
  title: "Mr.",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "+61 400 000 000",
  website: "https://example.com",
};

describe("v-card encoding contract (printed-card safety)", () => {
  it("encodes a card to the exact golden token", () => {
    // Guards the compression algorithm + JSON shape used on physical cards.
    expect(encodeVCardData(GOLDEN_INPUT as Record<string, string>)).toBe(
      GOLDEN_TOKEN,
    );
  });

  it("decodes the golden token back to the expected contact", () => {
    // Guards the id→name mapping every already-printed card relies on.
    expect(decodeVCardData(GOLDEN_TOKEN)).toEqual(GOLDEN_DECODED);
  });

  it("round-trips arbitrary contact data losslessly", () => {
    const input: VCardProps = {
      "2": "Jane",
      "4": "Smith",
      "6": "jane@corp.io",
      "9": "Sydney",
      "11": "Australia",
      "21": "Line one\r\nLine two",
    };
    const token = encodeVCardData(buildVCardPayload(input));
    expect(decodeVCardData(token)).toEqual({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@corp.io",
      city: "Sydney",
      country: "Australia",
      note: "Line one\r\nLine two",
    });
  });

  it("drops empty / whitespace-only fields from the payload", () => {
    const payload = buildVCardPayload({
      "2": "John",
      "3": "",
      "4": "   ",
      "6": "a@b.co",
    });
    expect(payload).toEqual({ "2": "John", "6": "a@b.co" });
  });

  it("builds a share URL only when there is data", () => {
    expect(buildVCardShareUrl("https://qr.synivo.com.au", {})).toBe("");
    expect(
      buildVCardShareUrl("https://qr.synivo.com.au", { "2": "John" }),
    ).toBe(
      `https://qr.synivo.com.au/vcard-view?data=${encodeVCardData({ "2": "John" })}`,
    );
  });

  it("degrades gracefully on a corrupt token", () => {
    expect(decodeVCardData("not-a-real-token")).toEqual({});
    expect(decodeVCardData("")).toEqual({});
  });
});

describe("v-card template in share URL (printed-card safety)", () => {
  const base = "https://qr.synivo.com.au";
  const vCard: VCardProps = { "2": "John" };
  const token = encodeVCardData({ "2": "John" });

  it("omits the default template so old cards keep working", () => {
    expect(buildVCardShareUrl(base, vCard)).toBe(
      `${base}/vcard-view?data=${token}`,
    );
    expect(buildVCardShareUrl(base, vCard, "classic")).toBe(
      `${base}/vcard-view?data=${token}`,
    );
  });

  it("appends a non-default template as the `t` param", () => {
    expect(buildVCardShareUrl(base, vCard, "dark")).toBe(
      `${base}/vcard-view?data=${token}&t=dark`,
    );
  });

  it("ignores an unknown template id", () => {
    expect(buildVCardShareUrl(base, vCard, "bogus")).toBe(
      `${base}/vcard-view?data=${token}`,
    );
  });
});

describe("link redirect contract (printed-card safety)", () => {
  it("prefixes a bare host with https://", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeUrl("   ")).toBe("");
  });

  it("builds the exact /link redirect URL", () => {
    expect(
      buildLinkRedirectUrl("https://qr.synivo.com.au", "example.com/path?a=b"),
    ).toBe(
      "https://qr.synivo.com.au/link?url=" +
        encodeURIComponent("https://example.com/path?a=b"),
    );
    expect(buildLinkRedirectUrl("https://qr.synivo.com.au", "")).toBe("");
  });
});
