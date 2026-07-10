import React from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import QRGenerator from "./QRGenerator";

// The builder persists to localStorage and can hydrate from the URL; isolate
// every test from the last one.
beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

describe("QRGenerator component", () => {
  it("renders the Link tab active with a website input", () => {
    render(<QRGenerator />);
    expect(screen.getByText("Enter your Website")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Link/i, selected: true }),
    ).toBeInTheDocument();
  });

  it("renders a live QR code once a URL is entered", () => {
    render(<QRGenerator />);
    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://example.com" },
    });
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("keeps download disabled with no content, but enabled (terms-gated on click) with content", () => {
    render(<QRGenerator />);
    const download = screen.getByRole("button", { name: /Download QR Code/i });
    expect(download).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://example.com" },
    });
    // Content is enough to enable the button; the Terms gate fires on click.
    expect(download).not.toBeDisabled();

    // Clicking without accepting terms shows a prompt and does NOT open the menu.
    fireEvent.click(download);
    expect(screen.getByText(/Please agree to the Terms/i)).toBeInTheDocument();
    expect(screen.queryByRole("menu")).toBeNull();

    // After accepting, clicking opens the format menu.
    fireEvent.click(
      screen.getByRole("checkbox", { name: /agree to the Terms/i }),
    );
    fireEvent.click(download);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("prompts for the terms when Copy link is clicked before accepting", () => {
    render(<QRGenerator />);
    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://example.com" },
    });
    const generate = screen.getByRole("button", { name: /Generate/i });
    const copy = screen.getByRole("button", { name: /Copy link/i });
    // Buttons are enabled with content — the gate is enforced on click.
    expect(generate).not.toBeDisabled();
    expect(copy).not.toBeDisabled();

    fireEvent.click(copy);
    expect(screen.getByText(/Please agree to the Terms/i)).toBeInTheDocument();

    // Ticking the box clears the warning.
    fireEvent.click(
      screen.getByRole("checkbox", { name: /agree to the Terms/i }),
    );
    expect(screen.queryByText(/Please agree to the Terms/i)).toBeNull();
  });

  it("renders the Disclaimer & Privacy section with terms and privacy", () => {
    render(<QRGenerator />);
    expect(
      screen.getByRole("heading", { name: /Disclaimer & Privacy/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Terms & limitations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Privacy policy/i }),
    ).toBeInTheDocument();
  });

  it("opens a format menu offering PNG, SVG and PDF", () => {
    render(<QRGenerator />);
    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /agree to the Terms/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Download QR Code/i }));

    const menu = screen.getByRole("menu");
    expect(
      within(menu).getByRole("menuitem", { name: /PNG/i }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /SVG/i }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /PDF/i }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /EPS/i }),
    ).toBeInTheDocument();
  });

  it("switches to the V-card tab and shows contact fields", () => {
    render(<QRGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /V-card/i }));
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
  });

  it("generates a QR code from V-card details", () => {
    render(<QRGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /V-card/i }));
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: "John" },
    });
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("shows a required-field error only after the field is touched", () => {
    render(<QRGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /V-card/i }));
    const firstName = screen.getByLabelText(/First Name/i);

    expect(screen.queryByText(/This field is required/i)).toBeNull();
    fireEvent.blur(firstName);
    expect(screen.getByText(/This field is required/i)).toBeInTheDocument();
  });

  it("validates email format", () => {
    render(<QRGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /V-card/i }));
    const email = screen.getByLabelText(/Email/i);
    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.blur(email);
    expect(
      screen.getByText(/Enter a valid email address/i),
    ).toBeInTheDocument();
  });

  it("restores previously entered data on reload", () => {
    const { unmount } = render(<QRGenerator />);
    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://persisted.example" },
    });
    unmount();

    render(<QRGenerator />);
    expect(screen.getByPlaceholderText("https://")).toHaveValue(
      "https://persisted.example",
    );
  });

  it("clears all data and saved state with Clear all", () => {
    render(<QRGenerator />);
    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Clear all/i }));
    expect(screen.getByPlaceholderText("https://")).toHaveValue("");
    expect(localStorage.getItem("qricard:builder:v1")).toBeNull();
  });

  it("shows the template picker only for V-cards and lets you pick one", () => {
    render(<QRGenerator />);
    // Not shown for links.
    expect(screen.queryByText(/Choose a card template/i)).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /V-card/i }));
    expect(screen.getByText(/Choose a card template/i)).toBeInTheDocument();

    const classic = screen.getByRole("radio", { name: /Classic/i });
    const dark = screen.getByRole("radio", { name: /Dark/i });
    expect(classic).toHaveAttribute("aria-checked", "true");

    fireEvent.click(dark);
    expect(dark).toHaveAttribute("aria-checked", "true");
    expect(classic).toHaveAttribute("aria-checked", "false");
  });

  it("reveals the Help steps only after clicking the toggle", () => {
    render(<QRGenerator />);
    const toggle = screen.getByRole("button", {
      name: /Help & How it works/i,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/1\. Pick a type/i)).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/1\. Pick a type/i)).toBeInTheDocument();
  });

  it("opens Help when the header dispatches the open-help event", () => {
    render(<QRGenerator />);
    expect(screen.queryByText(/1\. Pick a type/i)).toBeNull();

    // The header's Help button dispatches this to reveal + scroll to Help.
    act(() => {
      window.dispatchEvent(new CustomEvent("qricard:open-help"));
    });
    expect(screen.getByText(/1\. Pick a type/i)).toBeInTheDocument();
  });

  /* ------------------- Advanced design controls ------------------- */

  it("offers a Logo design tab with an upload prompt", () => {
    render(<QRGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /^Logo$/i }));
    expect(screen.getByText(/Upload a logo/i)).toBeInTheDocument();
    expect(
      screen.getByText(/raises error correction to the highest level/i),
    ).toBeInTheDocument();
  });

  it("reveals gradient direction controls when Gradient fill is toggled", () => {
    render(<QRGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /^Color$/i }));

    expect(screen.queryByRole("button", { name: /^Linear$/i })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Gradient fill/i }));
    expect(
      screen.getByRole("button", { name: /^Linear$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Radial$/i }),
    ).toBeInTheDocument();
  });

  it("shows a good-contrast scannability verdict for the default dark colour", () => {
    render(<QRGenerator />);
    fireEvent.click(screen.getByRole("tab", { name: /^Color$/i }));
    expect(screen.getByText(/should scan reliably/i)).toBeInTheDocument();
  });

  it("lets you pick an export resolution", () => {
    render(<QRGenerator />);
    const hi = screen.getByRole("button", { name: /2048px/i });
    expect(hi).toBeInTheDocument();
    fireEvent.click(hi);
    expect(hi).toHaveClass("is-active");
  });

  it("exposes transparent-background and copy-image controls", () => {
    render(<QRGenerator />);
    expect(
      screen.getByRole("checkbox", { name: /Transparent background/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy image/i }),
    ).toBeInTheDocument();
  });

  /* ------------------- Shareable URL + Recent codes ------------------- */

  it("restores the design from a shared editor link in the URL", () => {
    window.history.pushState(
      {},
      "",
      "/?ty=l&u=" +
        encodeURIComponent("https://shared.example") +
        "&c=ff0000&fr=brackets",
    );
    render(<QRGenerator />);
    expect(screen.getByPlaceholderText("https://")).toHaveValue(
      "https://shared.example",
    );
  });

  it("offers a Copy editor link button", () => {
    render(<QRGenerator />);
    expect(
      screen.getByRole("button", { name: /Copy editor link/i }),
    ).toBeInTheDocument();
  });

  it("renders exactly one Terms gate on mobile (next to Generate)", () => {
    const original = window.matchMedia;
    // Force the mobile branch.
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    render(<QRGenerator />);
    // No duplicate checkbox — the desktop copy is not rendered on mobile.
    expect(
      screen.getAllByRole("checkbox", { name: /agree to the Terms/i }),
    ).toHaveLength(1);

    window.matchMedia = original;
  });

  it("records a recent code after copying, shown as a clickable chip", () => {
    render(<QRGenerator />);
    // No history yet.
    expect(screen.queryByRole("heading", { name: /Recent codes/i })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://recent.example" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /agree to the Terms/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Copy link/i }));

    expect(
      screen.getByRole("heading", { name: /Recent codes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /recent\.example/i }),
    ).toBeInTheDocument();
  });
});
