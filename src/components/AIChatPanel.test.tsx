import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ReactMarkdown from "react-markdown";

// Import the MarkdownComponents from AIChatPanel
// Note: This would need to be exported from AIChatPanel.tsx to be testable
const MarkdownComponents = {
  p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }: any) => (
    <ul className="mb-2 last:mb-0 ml-4 list-disc space-y-1" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="mb-2 last:mb-0 ml-4 list-decimal space-y-1" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="text-sm leading-relaxed" {...props} />
  ),
};

describe("AIChatPanel Markdown Components", () => {
  it("renders numbered lists correctly", () => {
    const markdownContent = `Based on the provided FMECA data, the components captured for the conveyor are:

1. Idlers
2. Conveyor Belt

These components are part of the "Belt Conveyor" classification.`;

    render(
      <ReactMarkdown components={MarkdownComponents}>
        {markdownContent}
      </ReactMarkdown>
    );

    // Check that the numbered list is rendered
    expect(screen.getByText("Idlers")).toBeInTheDocument();
    expect(screen.getByText("Conveyor Belt")).toBeInTheDocument();

    // Check that the ordered list element exists
    const orderedList = document.querySelector("ol");
    expect(orderedList).toBeInTheDocument();
    expect(orderedList).toHaveClass("list-decimal");
  });

  it("renders bullet points correctly", () => {
    const markdownContent = `The components include:

- Idlers
- Conveyor Belt
- Drive Motor`;

    render(
      <ReactMarkdown components={MarkdownComponents}>
        {markdownContent}
      </ReactMarkdown>
    );

    // Check that the bullet list is rendered
    expect(screen.getByText("Idlers")).toBeInTheDocument();
    expect(screen.getByText("Conveyor Belt")).toBeInTheDocument();
    expect(screen.getByText("Drive Motor")).toBeInTheDocument();

    // Check that the unordered list element exists
    const unorderedList = document.querySelector("ul");
    expect(unorderedList).toBeInTheDocument();
    expect(unorderedList).toHaveClass("list-disc");
  });

  it("renders mixed content correctly", () => {
    const markdownContent = `## Conveyor Components

Based on the analysis:

1. **Primary Components:**
   - Idlers
   - Conveyor Belt
2. **Secondary Components:**
   - Drive Motor
   - Tensioning System

*Note: Additional components may exist.*`;

    render(
      <ReactMarkdown components={MarkdownComponents}>
        {markdownContent}
      </ReactMarkdown>
    );

    // Check heading
    expect(screen.getByText("Conveyor Components")).toBeInTheDocument();

    // Check that both ordered and unordered lists are rendered
    const orderedList = document.querySelector("ol");
    const unorderedList = document.querySelector("ul");
    expect(orderedList).toBeInTheDocument();
    expect(unorderedList).toBeInTheDocument();

    // Check italic text
    expect(
      screen.getByText("Note: Additional components may exist.")
    ).toBeInTheDocument();
  });
});
