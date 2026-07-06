import React from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import QRGenerator from "./QRGenerator";

// The builder persists to localStorage; isolate every test from the last one.
beforeEach(() => {
  localStorage.clear();
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

  it("keeps download disabled until there is content AND terms are accepted", () => {
    render(<QRGenerator />);
    const download = screen.getByRole("button", { name: /Download QR Code/i });
    expect(download).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://example.com" },
    });
    // Content alone is not enough — the Terms checkbox gates output.
    expect(download).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(download).not.toBeDisabled();

    // Un-checking re-disables it.
    fireEvent.click(screen.getByRole("checkbox"));
    expect(download).toBeDisabled();
  });

  it("gates the Generate and Copy-link buttons behind the Terms checkbox", () => {
    render(<QRGenerator />);
    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://example.com" },
    });
    const generate = screen.getByRole("button", { name: /Generate/i });
    const copy = screen.getByRole("button", { name: /Copy link/i });
    expect(generate).toBeDisabled();
    expect(copy).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(generate).not.toBeDisabled();
    expect(copy).not.toBeDisabled();
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
    fireEvent.click(screen.getByRole("checkbox"));
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
});
