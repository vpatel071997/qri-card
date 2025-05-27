import React from "react";
import { render, screen } from "@testing-library/react";
import Landing from "./Landing";

describe("Landing component", () => {
  it("renders heading, description, and buttons", () => {
    render(<Landing />);
    expect(
      screen.getByText(/Create and Share Your Digital/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your one-stop solution for QR code generation and VCard management./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Generate QR Code/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create VCard/i }),
    ).toBeInTheDocument();
  });

  it("has correct links for buttons", () => {
    render(<Landing />);
    expect(
      screen.getByRole("link", { name: /Generate QR Code/i }),
    ).toHaveAttribute("href", "/url-to-qr");
    expect(screen.getByRole("link", { name: /Create VCard/i })).toHaveAttribute(
      "href",
      "/vcard-gen",
    );
  });
});
