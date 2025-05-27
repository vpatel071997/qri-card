import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import URLToQR from "./URLToQR";

describe("URLToQR component", () => {
  it("renders input and button", () => {
    render(<URLToQR />);
    expect(screen.getByPlaceholderText("Enter URL")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate" }),
    ).toBeInTheDocument();
  });

  it("shows error for invalid URL", () => {
    render(<URLToQR />);
    fireEvent.change(screen.getByPlaceholderText("Enter URL"), {
      target: { value: "not-a-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
  });

  it("generates QR code for valid URL", () => {
    render(<URLToQR />);
    fireEvent.change(screen.getByPlaceholderText("Enter URL"), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(screen.getByText(/Download/i)).toBeInTheDocument();
    expect(document.querySelector("svg")).toBeInTheDocument();
  });
});
