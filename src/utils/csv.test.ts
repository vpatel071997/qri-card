import {
  parseCsvLine,
  sanitizeFilename,
  nameFromValue,
  parseBatchInput,
  dedupeNames,
} from "./csv";

describe("parseCsvLine", () => {
  it("splits a simple comma-separated line", () => {
    expect(parseCsvLine("Google,https://google.com")).toEqual([
      "Google",
      "https://google.com",
    ]);
  });

  it("respects quoted fields containing commas", () => {
    expect(parseCsvLine('"Acme, Inc.",https://acme.test')).toEqual([
      "Acme, Inc.",
      "https://acme.test",
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsvLine('"He said ""hi""",x')).toEqual(['He said "hi"', "x"]);
  });

  it("trims surrounding whitespace on each cell", () => {
    expect(parseCsvLine("  a  ,  b ")).toEqual(["a", "b"]);
  });
});

describe("sanitizeFilename", () => {
  it("strips illegal filesystem characters", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("abcdefghij");
  });
  it("replaces internal whitespace with dashes", () => {
    expect(sanitizeFilename("My Cool Name")).toBe("My-Cool-Name");
  });
  it("falls back to qr-code for empty input", () => {
    expect(sanitizeFilename("")).toBe("qr-code");
    expect(sanitizeFilename("///")).toBe("qr-code");
  });
});

describe("nameFromValue", () => {
  it("derives a hostname without www", () => {
    expect(nameFromValue("https://www.google.com/x")).toBe("google.com");
  });
  it("prepends https for bare domains", () => {
    expect(nameFromValue("openai.com")).toBe("openai.com");
  });
  it("returns the raw value when it is not a URL", () => {
    expect(nameFromValue("just some text")).toBe("just some text");
  });
});

describe("parseBatchInput", () => {
  it("parses two-column rows", () => {
    const rows = parseBatchInput(
      "Google,https://google.com\nOpenAI,https://openai.com",
    );
    expect(rows).toEqual([
      { name: "Google", value: "https://google.com" },
      { name: "OpenAI", value: "https://openai.com" },
    ]);
  });

  it("derives names from single-column URLs", () => {
    const rows = parseBatchInput("https://www.google.com\nopenai.com");
    expect(rows).toEqual([
      { name: "google.com", value: "https://www.google.com" },
      { name: "openai.com", value: "openai.com" },
    ]);
  });

  it("skips a detected header row", () => {
    const rows = parseBatchInput("name,url\nGoogle,https://google.com");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: "Google", value: "https://google.com" });
  });

  it("ignores blank lines", () => {
    const rows = parseBatchInput("\n\nA,https://a.test\n\n");
    expect(rows).toHaveLength(1);
  });

  it("de-duplicates colliding names", () => {
    const rows = parseBatchInput(
      "Site,https://a.test\nSite,https://b.test\nSite,https://c.test",
    );
    expect(rows.map((r) => r.name)).toEqual(["Site", "Site-2", "Site-3"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseBatchInput("")).toEqual([]);
    expect(parseBatchInput("   \n  ")).toEqual([]);
  });
});

describe("dedupeNames", () => {
  it("sanitizes and uniquifies names", () => {
    const out = dedupeNames([
      { name: "My Card", value: "1" },
      { name: "My Card", value: "2" },
    ]);
    expect(out).toEqual([
      { name: "My-Card", value: "1" },
      { name: "My-Card-2", value: "2" },
    ]);
  });
});
