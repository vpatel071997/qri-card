import { render, screen, fireEvent } from "@testing-library/react";
import BatchGenerator from "./BatchGenerator";

const render_ = () => render(<BatchGenerator />);

describe("BatchGenerator", () => {
  it("renders the bulk heading and an empty state", () => {
    render_();
    expect(
      screen.getByRole("heading", { name: /in Bulk/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No rows yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Paste a list to see your codes/i),
    ).toBeInTheDocument();
  });

  it("shows an error when downloading with no list", () => {
    render_();
    const zip = screen.getByRole("button", { name: /Download ZIP/i });
    // Enabled even with no rows — the requirement is surfaced on click.
    expect(zip).not.toBeDisabled();
    fireEvent.click(zip);
    expect(
      screen.getByText(/Paste or upload a list of links first/i),
    ).toBeInTheDocument();
  });

  it("prompts for the terms before generating once a list exists", () => {
    render_();
    fireEvent.change(screen.getByLabelText(/Batch list/i), {
      target: { value: "Google,https://google.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Download ZIP/i }));
    expect(screen.getByText(/Please agree to the Terms/i)).toBeInTheDocument();

    // Ticking the box clears the warning.
    fireEvent.click(
      screen.getByRole("checkbox", { name: /agree to the Terms/i }),
    );
    expect(screen.queryByText(/Please agree to the Terms/i)).toBeNull();
  });

  it("parses pasted CSV into a live preview and a count", () => {
    render_();
    fireEvent.change(screen.getByLabelText(/Batch list/i), {
      target: {
        value: "Google,https://google.com\nOpenAI,https://openai.com",
      },
    });
    expect(screen.getByText(/2 codes detected/i)).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    // Preview renders one QR SVG per row.
    const grid = document.querySelector(".batch-grid") as HTMLElement;
    expect(grid.querySelectorAll("svg").length).toBe(2);
  });

  it("enables the export buttons once rows exist", () => {
    render_();
    fireEvent.change(screen.getByLabelText(/Batch list/i), {
      target: { value: "https://a.test\nhttps://b.test" },
    });
    expect(
      screen.getByRole("button", { name: /Download ZIP/i }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /label sheet/i }),
    ).not.toBeDisabled();
  });

  it("fills the textarea from the sample button", () => {
    render_();
    fireEvent.click(screen.getByRole("button", { name: /Use sample/i }));
    const ta = screen.getByLabelText(/Batch list/i) as HTMLTextAreaElement;
    expect(ta.value).toContain("Google");
    expect(screen.getByText(/3 codes detected/i)).toBeInTheDocument();
  });

  it("caps the preview but still counts every row for download", () => {
    render_();
    const many = Array.from(
      { length: 30 },
      (_, i) => `Item${i},https://x${i}.test`,
    ).join("\n");
    fireEvent.change(screen.getByLabelText(/Batch list/i), {
      target: { value: many },
    });
    expect(screen.getByText(/30 codes detected/i)).toBeInTheDocument();
    expect(screen.getByText(/6 more will be included/i)).toBeInTheDocument();
  });

  it("clears the list", () => {
    render_();
    const ta = screen.getByLabelText(/Batch list/i);
    fireEvent.change(ta, { target: { value: "A,https://a.test" } });
    fireEvent.click(screen.getByRole("button", { name: /^Clear$/i }));
    expect(ta).toHaveValue("");
    expect(screen.getByText(/No rows yet/i)).toBeInTheDocument();
  });
});
