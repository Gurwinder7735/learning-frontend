"use client";

/**
 * SmartContentRenderer
 *
 * Handles two content formats transparently:
 *  - HTML (starts with `<`) → rendered via dangerouslySetInnerHTML with
 *    CKEditor's content stylesheet so column widths, table styles, etc. are
 *    preserved exactly as they appeared in the editor.
 *  - Markdown → passed to MarkdownRenderer as before.
 */

import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import "ckeditor5/ckeditor5-content.css";

interface Props {
  content: string;
  className?: string;
}

function isHtml(s: string): boolean {
  return s.trim().startsWith("<");
}

export function SmartContentRenderer({ content, className = "" }: Props) {
  if (isHtml(content)) {
    return (
      <div
        className={`ck-content prose prose-zinc max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <MarkdownRenderer content={content} className={className} />;
}
