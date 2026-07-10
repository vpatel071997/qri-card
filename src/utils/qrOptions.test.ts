import {
  buildQrOptions,
  colorFill,
  errorCorrectionLevel,
  QrDesign,
} from "./qrOptions";

const base: QrDesign = {
  data: "https://example.com",
  size: 210,
  dotStyle: "square",
  cornerStyle: "square",
  color: "#000000",
  gradientEnabled: false,
  gradientType: "linear",
  gradientColor2: "#4a0fb0",
  eyeColor: "",
  logo: "",
  transparentBg: true,
};

describe("errorCorrectionLevel", () => {
  it("uses M without a logo", () => {
    expect(errorCorrectionLevel({ logo: "" })).toBe("M");
  });
  it("bumps to H when a logo is present", () => {
    expect(errorCorrectionLevel({ logo: "data:image/png;base64,AAA" })).toBe(
      "H",
    );
  });
});

describe("colorFill", () => {
  it("returns a solid colour when gradient is off", () => {
    expect(colorFill("#111111", false, "linear", "#222222")).toEqual({
      color: "#111111",
    });
  });
  it("returns a two-stop gradient when enabled", () => {
    const fill = colorFill("#111111", true, "radial", "#222222") as {
      gradient: {
        type: string;
        colorStops: { offset: number; color: string }[];
      };
    };
    expect(fill.gradient.type).toBe("radial");
    expect(fill.gradient.colorStops).toEqual([
      { offset: 0, color: "#111111" },
      { offset: 1, color: "#222222" },
    ]);
  });
});

describe("buildQrOptions", () => {
  it("passes through data and size", () => {
    const o = buildQrOptions(base) as any;
    expect(o.data).toBe("https://example.com");
    expect(o.width).toBe(210);
    expect(o.height).toBe(210);
  });

  it("uses a solid dot colour by default", () => {
    const o = buildQrOptions(base) as any;
    expect(o.dotsOptions.color).toBe("#000000");
    expect(o.dotsOptions.gradient).toBeUndefined();
    expect(o.qrOptions.errorCorrectionLevel).toBe("M");
  });

  it("applies a gradient to the dots when enabled", () => {
    const o = buildQrOptions({ ...base, gradientEnabled: true }) as any;
    expect(o.dotsOptions.gradient.colorStops[1].color).toBe("#4a0fb0");
  });

  it("defaults the eye colour to the body colour", () => {
    const o = buildQrOptions(base) as any;
    expect(o.cornersSquareOptions.color).toBe("#000000");
  });

  it("uses a separate eye colour when provided", () => {
    const o = buildQrOptions({ ...base, eyeColor: "#ff0000" }) as any;
    expect(o.cornersSquareOptions.color).toBe("#ff0000");
    expect(o.cornersDotOptions.color).toBe("#ff0000");
  });

  it("maps non-square corners to a dot centre", () => {
    const o = buildQrOptions({
      ...base,
      cornerStyle: "extra-rounded",
    }) as any;
    expect(o.cornersDotOptions.type).toBe("dot");
  });

  it("sets a transparent or white background per the flag", () => {
    expect((buildQrOptions(base) as any).backgroundOptions.color).toBe(
      "transparent",
    );
    expect(
      (buildQrOptions({ ...base, transparentBg: false }) as any)
        .backgroundOptions.color,
    ).toBe("#ffffff");
  });

  it("embeds a logo and raises error correction to H", () => {
    const o = buildQrOptions({
      ...base,
      logo: "data:image/png;base64,AAAA",
    }) as any;
    expect(o.image).toBe("data:image/png;base64,AAAA");
    expect(o.imageOptions.imageSize).toBeGreaterThan(0);
    expect(o.qrOptions.errorCorrectionLevel).toBe("H");
  });

  it("omits the image key entirely with no logo", () => {
    const o = buildQrOptions(base) as any;
    expect("image" in o).toBe(false);
  });
});
