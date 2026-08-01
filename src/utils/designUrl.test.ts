import {
  encodeDesignParams,
  decodeDesignParams,
  DesignState,
} from "./designUrl";

const base: DesignState = {
  type: "link",
  url: "",
  vCard: {},
  frame: "none",
  dotStyle: "square",
  cornerStyle: "square",
  qrColor: "#1f2a44",
  gradientEnabled: false,
  gradientType: "linear",
  gradientColor2: "#4a0fb0",
  eyeColor: "",
  transparentBg: false,
  resolution: 1024,
  template: "classic",
};

describe("encodeDesignParams", () => {
  it("omits default design values to keep the link short", () => {
    const qs = encodeDesignParams({ ...base, url: "https://a.test" });
    expect(qs).toContain("ty=l");
    expect(qs).toContain("u=https");
    // Defaults are not serialised.
    expect(qs).not.toContain("fr=");
    expect(qs).not.toContain("dt=");
    expect(qs).not.toContain("g=");
  });

  it("writes colours without a leading hash", () => {
    const qs = encodeDesignParams({ ...base, qrColor: "#ff0000" });
    const params = new URLSearchParams(qs);
    expect(params.get("c")).toBe("ff0000");
  });

  it("serialises gradient only when enabled", () => {
    const off = encodeDesignParams(base);
    expect(off).not.toContain("g=1");
    const on = encodeDesignParams({
      ...base,
      gradientEnabled: true,
      gradientType: "radial",
      gradientColor2: "#00ff00",
    });
    const p = new URLSearchParams(on);
    expect(p.get("g")).toBe("1");
    expect(p.get("gt")).toBe("radial");
    expect(p.get("g2")).toBe("00ff00");
  });

  it("compresses a v-card into a single param", () => {
    const qs = encodeDesignParams({
      ...base,
      type: "vcard",
      vCard: { "2": "John", "4": "Doe" },
      template: "dark",
    });
    const p = new URLSearchParams(qs);
    expect(p.get("ty")).toBe("v");
    expect(p.get("vc")).toBeTruthy();
    expect(p.get("tpl")).toBe("dark");
  });
});

describe("decodeDesignParams", () => {
  it("returns null when there are no recognised params", () => {
    expect(decodeDesignParams("")).toBeNull();
    expect(decodeDesignParams("?foo=bar")).toBeNull();
  });

  it("round-trips a link design", () => {
    const state: DesignState = {
      ...base,
      url: "https://example.com",
      frame: "brackets",
      dotStyle: "dots",
      cornerStyle: "extra-rounded",
      qrColor: "#123456",
      eyeColor: "#abcdef",
      transparentBg: true,
      resolution: 2048,
    };
    const decoded = decodeDesignParams("?" + encodeDesignParams(state))!;
    expect(decoded.type).toBe("link");
    expect(decoded.url).toBe("https://example.com");
    expect(decoded.frame).toBe("brackets");
    expect(decoded.dotStyle).toBe("dots");
    expect(decoded.cornerStyle).toBe("extra-rounded");
    expect(decoded.qrColor).toBe("#123456");
    expect(decoded.eyeColor).toBe("#abcdef");
    expect(decoded.transparentBg).toBe(true);
    expect(decoded.resolution).toBe(2048);
  });

  it("round-trips a v-card design", () => {
    const state: DesignState = {
      ...base,
      type: "vcard",
      vCard: { "2": "Jane", "4": "Roe", "6": "jane@x.test" },
      template: "dark",
      gradientEnabled: true,
      gradientType: "linear",
      gradientColor2: "#4a0fb0",
    };
    const decoded = decodeDesignParams(encodeDesignParams(state))!;
    expect(decoded.type).toBe("vcard");
    expect(decoded.vCard).toEqual({
      "2": "Jane",
      "4": "Roe",
      "6": "jane@x.test",
    });
    expect(decoded.template).toBe("dark");
    expect(decoded.gradientEnabled).toBe(true);
  });

  it("degrades gracefully on a corrupt v-card param", () => {
    const decoded = decodeDesignParams("?ty=v&vc=%%%not-lz%%%");
    expect(decoded).not.toBeNull();
    expect(decoded!.type).toBe("vcard");
    // No throw; vCard simply absent/undefined.
    expect(decoded!.vCard).toBeUndefined();
  });
});
