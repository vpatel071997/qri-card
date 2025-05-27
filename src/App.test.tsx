import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

describe("QR Code Generator", () => {
  test("renders form and buttons", () => {
    render(<App />);
    expect(screen.getByText(/Generate Qr Code/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/https:\/\/example.com/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Gerenate/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear/i })).toBeInTheDocument();
  });

  test("shows QR code and download button after generating", () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/https:\/\/example.com/i);
    fireEvent.change(input, { target: { value: "https://test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerenate/i }));

    expect(screen.getByText(/Download/i)).toBeInTheDocument();
    // Optionally check for SVG element rendered by react-qr-code
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  test("clears input and QR code when Clear is clicked", () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/https:\/\/example.com/i);
    fireEvent.change(input, { target: { value: "https://test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerenate/i }));

    fireEvent.click(screen.getByRole("button", { name: /Clear/i }));
    expect(input).toHaveValue("");
    expect(screen.queryByText(/Download/i)).not.toBeInTheDocument();
  });
});
