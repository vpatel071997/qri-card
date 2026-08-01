import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  scannabilityVerdict,
} from "./scannability";

describe("hexToRgb", () => {
  it("parses 6-digit hex", () => {
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#4a0fb0")).toEqual([74, 15, 176]);
  });

  it("parses 3-digit shorthand and is case-insensitive", () => {
    expect(hexToRgb("#FFF")).toEqual([255, 255, 255]);
    expect(hexToRgb("#0a0")).toEqual([0, 170, 0]);
  });

  it("tolerates a missing leading hash and surrounding space", () => {
    expect(hexToRgb("  ff0000 ")).toEqual([255, 0, 0]);
  });

  it("returns null for unparseable colours", () => {
    expect(hexToRgb("transparent")).toBeNull();
    expect(hexToRgb("#12")).toBeNull();
    expect(hexToRgb("rgb(0,0,0)")).toBeNull();
    // @ts-expect-error intentional bad input
    expect(hexToRgb(undefined)).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("is 1 for identical colours", () => {
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#123456", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#123456"),
      5,
    );
  });

  it("returns 0 when a colour cannot be parsed", () => {
    expect(contrastRatio("transparent", "#ffffff")).toBe(0);
  });
});

describe("scannabilityVerdict", () => {
  it("flags good contrast", () => {
    const v = scannabilityVerdict("#000000", "#ffffff");
    expect(v.level).toBe("good");
    expect(v.ratio).toBeGreaterThan(4.5);
  });

  it("flags very low contrast as bad", () => {
    const v = scannabilityVerdict("#f5f5f5", "#ffffff");
    expect(v.level).toBe("bad");
  });

  it("flags borderline contrast as a warning", () => {
    // A mid grey on white sits in the risky 3–4.5 band.
    const v = scannabilityVerdict("#949494", "#ffffff");
    expect(v.level).toBe("warn");
  });

  it("warns (not throws) when contrast cannot be checked", () => {
    const v = scannabilityVerdict("transparent", "#ffffff");
    expect(v.level).toBe("warn");
    expect(v.ratio).toBe(0);
  });
});
