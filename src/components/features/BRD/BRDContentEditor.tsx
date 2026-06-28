"use client";

import { useEffect, useState } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Autoformat,
  Bold,
  Italic,
  Strikethrough,
  BlockQuote,
  Heading,
  Link,
  List,
  ListProperties,
  Paragraph,
  Table,
  TableToolbar,
  TableColumnResize,
  HorizontalLine,
  CodeBlock,
  Code,
  Essentials,
  Indent,
  IndentBlock,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

interface Props {
  content: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

/** Returns true when content looks like Markdown rather than HTML. */
function isMarkdown(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && !t.startsWith("<");
}

/** Convert Markdown → HTML using marked (lazy-loaded). */
async function toHtml(content: string): Promise<string> {
  if (!isMarkdown(content)) return content;
  const { marked } = await import("marked");
  return marked(content) as string;
}

export function BRDContentEditor({ content, onChange, disabled = false }: Props) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  useEffect(() => {
    // Only convert on initial mount — subsequent edits are already HTML
    toHtml(content).then(setHtmlContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (htmlContent === null) {
    return (
      <div className="flex items-center justify-center py-12 border border-zinc-200 rounded-xl bg-white">
        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="brd-editor-wrap">
      <CKEditor
        editor={ClassicEditor}
        data={htmlContent}
        disabled={disabled}
        config={{
          licenseKey: "GPL",
          plugins: [
            // No Markdown plugin — editor works natively in HTML.
            // getData() returns HTML which is saved directly.
            Essentials,
            Autoformat,
            Bold,
            Italic,
            Strikethrough,
            BlockQuote,
            Heading,
            Link,
            List,
            ListProperties,
            Paragraph,
            Table,
            TableToolbar,
            TableColumnResize,
            HorizontalLine,
            CodeBlock,
            Code,
            Indent,
            IndentBlock,
          ],
          toolbar: {
            items: [
              "heading",
              "|",
              "bold",
              "italic",
              "strikethrough",
              "|",
              "bulletedList",
              "numberedList",
              "outdent",
              "indent",
              "|",
              "blockQuote",
              "link",
              "|",
              "insertTable",
              "horizontalLine",
              "codeBlock",
            ],
          },
          heading: {
            options: [
              { model: "paragraph" as const, title: "Paragraph", class: "ck-heading_paragraph" },
              { model: "heading1" as const, view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
              { model: "heading2" as const, view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
              { model: "heading3" as const, view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
              { model: "heading4" as const, view: "h4", title: "Heading 4", class: "ck-heading_heading4" },
            ],
          },
          table: {
            contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
          },
          codeBlock: {
            languages: [
              { language: "plaintext", label: "Plain text" },
              { language: "javascript", label: "JavaScript" },
              { language: "python", label: "Python" },
              { language: "typescript", label: "TypeScript" },
            ],
          },
        }}
        onChange={(_event, editor) => {
          // Save raw HTML — preserves column widths, styles, everything
          onChange(editor.getData());
        }}
      />
    </div>
  );
}
