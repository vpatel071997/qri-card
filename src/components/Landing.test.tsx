import React from "react";
import { render, screen } from "@testing-library/react";
import Landing from "./Landing";

describe("Landing", () => {
  it("renders the main heading", () => {
    render(<Landing />);
    expect(
      screen.getByRole("heading", { name: /Create and Share Your Digital/i }),
    ).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<Landing />);
    expect(
      screen.getByText(
        /Your one-stop solution for QR code generation and VCard management\./i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the Generate QR Code button with correct link", () => {
    render(<Landing />);
    const qrBtn = screen.getByRole("button", { name: /Generate QR Code/i });
    expect(qrBtn).toBeInTheDocument();
    expect(qrBtn).toHaveAttribute("href", "/url-to-qr");
  });

  it("renders the Create VCard button with correct link", () => {
    render(<Landing />);
    const vcardBtn = screen.getByRole("button", { name: /Create VCard/i });
    expect(vcardBtn).toBeInTheDocument();
    expect(vcardBtn).toHaveAttribute("href", "/vcard-gen");
  });
});
