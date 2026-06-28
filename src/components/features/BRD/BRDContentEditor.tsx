"use client";

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
  HorizontalLine,
  CodeBlock,
  Code,
  Essentials,
  Indent,
  IndentBlock,
  Markdown,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

interface Props {
  /** Raw Markdown string */
  content: string;
  /** Called with the updated Markdown string on every change */
  onChange: (markdown: string) => void;
  disabled?: boolean;
}

export function BRDContentEditor({ content, onChange, disabled = false }: Props) {
  return (
    <div className="brd-editor-wrap">
      <CKEditor
        editor={ClassicEditor}
        data={content}
        disabled={disabled}
        config={{
          licenseKey: "GPL",
          plugins: [
            // Markdown plugin replaces the HTML data processor —
            // CKEditor reads/writes Markdown instead of HTML
            Markdown,
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
          // editor.getData() returns Markdown because of the Markdown plugin
          onChange(editor.getData());
        }}
      />
    </div>
  );
}
