import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import QRGenerator from "./QRGenerator";

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

  it("keeps the download button disabled until there is content", () => {
    render(<QRGenerator />);
    const download = screen.getByRole("button", { name: /Download QR Code/i });
    expect(download).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("https://"), {
      target: { value: "https://example.com" },
    });
    expect(download).not.toBeDisabled();
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
});
