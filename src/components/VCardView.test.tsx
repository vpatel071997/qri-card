import React from "react";
import { render, screen } from "@testing-library/react";
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
});
