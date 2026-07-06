import React from "react";
import { render, screen } from "@testing-library/react";
import LinkRedirect from "./LinkRedirect";

/**
 * The /link page is the redirect target baked into "link" QR codes shared via
 * Copy link. It reads the `url` param from window.location.
 */
function renderAt(search: string) {
  window.history.replaceState({}, "", `/link${search}`);
  return render(<LinkRedirect />);
}

describe("LinkRedirect (printed link QR target)", () => {
  it("shows the invalid state when no url is provided", () => {
    renderAt("");
    expect(screen.getByText(/Invalid link/i)).toBeInTheDocument();
  });

  it("rejects non-http(s) schemes", () => {
    renderAt(`?url=${encodeURIComponent("javascript:alert(1)")}`);
    expect(screen.getByText(/Invalid link/i)).toBeInTheDocument();
  });

  it("accepts a valid target and offers a manual fallback link", () => {
    // jsdom logs a benign "navigation not implemented" notice for the redirect.
    renderAt(`?url=${encodeURIComponent("https://example.com")}`);

    expect(screen.getByText(/Redirecting/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /tap here/i }),
    ).toHaveAttribute("href", "https://example.com");
  });
});
