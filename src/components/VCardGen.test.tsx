import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import VCardGen from "./VCardGen";

describe("VCardGen component", () => {
  it("renders form fields and buttons", () => {
    render(<VCardGen />);
    expect(screen.getByText(/Create your VCard/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Gerenate/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear/i })).toBeInTheDocument();
  });

  it("updates form fields on input", () => {
    render(<VCardGen />);
    const firstNameInput = screen.getByLabelText(/First Name/i);
    fireEvent.change(firstNameInput, { target: { value: "John" } });
    expect(firstNameInput).toHaveValue("John");
  });

  it("generates QR code after submit", () => {
    render(<VCardGen />);
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    fireEvent.change(firstNameInput, { target: { value: "John" } });
    fireEvent.change(lastNameInput, { target: { value: "Doe" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerenate/i }));
    expect(screen.getByText(/Your VCard Qr Code/i)).toBeInTheDocument();
    expect(document.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText(/Download/i)).toBeInTheDocument();
  });

  it("clears form and QR code when Clear is clicked", () => {
    render(<VCardGen />);
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    fireEvent.change(firstNameInput, { target: { value: "John" } });
    fireEvent.change(lastNameInput, { target: { value: "Doe" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerenate/i }));
    fireEvent.click(screen.getByRole("button", { name: /Clear/i }));
    expect(firstNameInput).toHaveValue("");
    expect(lastNameInput).toHaveValue("");
    expect(screen.queryByText(/Your VCard Qr Code/i)).not.toBeInTheDocument();
  });
});
