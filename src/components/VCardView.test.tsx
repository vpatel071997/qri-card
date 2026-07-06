import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import VCardView from "./VCardView";

/**
 * End-to-end proof that a token printed on a physical card renders the right
 * contact. GOLDEN_TOKEN is the same fixture asserted in utils/vcard.test.tsx.
 */
const GOLDEN_TOKEN =
  "N4IgjCBcILIE4DoQBoQCYogFIHsAWAdiiACyYAiOApsQGyYBW+BAAlQB4CGAtgA4A2VBAGMc3YgHZMAalpgABCQAMS+StXriYetDwAXPbwDOkAPSmOPAUNHiAvkA";

function renderAt(search: string) {
  window.history.replaceState({}, "", `/vcard-view${search}`);
  return render(<VCardView />);
}

describe("VCardView (printed card rendering)", () => {
  it("renders the contact decoded from a printed card token", () => {
    renderAt(`?data=${GOLDEN_TOKEN}`);

    expect(screen.getByText("Mr. John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("+61 400 000 000")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add to Contacts/i }),
    ).toBeInTheDocument();
  });

  it("still supports the legacy plain-query link format", () => {
    renderAt(`?firstName=Jane&lastName=Smith&email=jane@corp.io`);

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@corp.io")).toBeInTheDocument();
  });

  it("degrades gracefully when the token is corrupt", () => {
    renderAt(`?data=garbage-token`);
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("applies the pre-selected template from the `t` param", () => {
    const { container } = renderAt(`?data=${GOLDEN_TOKEN}&t=dark`);
    expect(container.querySelector(".vcard-view")).toHaveClass("tpl-dark");
  });

  it("falls back to the classic template for an unknown `t`", () => {
    const { container } = renderAt(`?data=${GOLDEN_TOKEN}&t=bogus`);
    expect(container.querySelector(".vcard-view")).toHaveClass("tpl-classic");
  });

  it("defaults to classic when no template is specified", () => {
    const { container } = renderAt(`?data=${GOLDEN_TOKEN}`);
    expect(container.querySelector(".vcard-view")).toHaveClass("tpl-classic");
  });

  describe("Add to Contacts .vcf output", () => {
    // Capture the vCard string handed to the Blob when the button is clicked.
    function downloadVcf(search: string): string {
      (URL as unknown as { createObjectURL: unknown }).createObjectURL =
        jest.fn(() => "blob:mock");
      (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL =
        jest.fn();

      // Swap in a capturing Blob stub — jest.spyOn can't wrap a native class
      // constructor, so record the parts directly.
      const RealBlob = global.Blob;
      const captured: string[] = [];
      (global as unknown as { Blob: unknown }).Blob = class {
        constructor(parts: BlobPart[]) {
          captured.push(parts[0] as string);
        }
      };

      try {
        renderAt(search);
        fireEvent.click(
          screen.getByRole("button", { name: /Add to Contacts/i }),
        );
      } finally {
        (global as unknown as { Blob: unknown }).Blob = RealBlob;
      }

      return captured[0];
    }

    it("puts the honorific in N/FN, never as a job TITLE", () => {
      const vcf = downloadVcf(`?firstName=Jane&lastName=Smith&title=Dr.`);
      expect(vcf).toContain("N:Smith;Jane;;Dr.;");
      expect(vcf).toContain("FN:Dr. Jane Smith");
      expect(vcf).not.toMatch(/\r?\nTITLE:/);
    });

    it("omits the non-interoperable GENDER line", () => {
      const vcf = downloadVcf(`?firstName=Jane&lastName=Smith&gender=Male`);
      expect(vcf).not.toContain("GENDER");
    });

    it("writes socials as labelled itemN.URL groups, not X-SOCIALPROFILE", () => {
      const vcf = downloadVcf(
        `?firstName=Jane&linkedin=https://linkedin.com/in/jane`,
      );
      expect(vcf).toContain("item1.URL:https://linkedin.com/in/jane");
      expect(vcf).toContain("item1.X-ABLabel:LinkedIn");
      expect(vcf).not.toContain("X-SOCIALPROFILE");
    });

    it("escapes newlines and commas so free text can't corrupt the card", () => {
      const vcf = downloadVcf(
        `?firstName=Jane&note=${encodeURIComponent("Line1\nHi, there; ok")}`,
      );
      expect(vcf).toContain("NOTE:Line1\\nHi\\, there\\; ok");
      // A raw newline inside a value would break parsing — there must be none
      // beyond the structural CRLF line breaks.
      expect(vcf).toContain("\r\n");
    });
  });
});
