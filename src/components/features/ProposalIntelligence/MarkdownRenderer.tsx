"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";

interface Props {
  content: string;
  className?: string;
}

/**
 * Joins multi-line table cell content into a single properly-closed row.
 *
 * AI agents often write table rows where a cell's content spans multiple
 * physical lines (e.g. numbered lists inside a cell). GFM requires every
 * row to be a single line that starts AND ends with `|`. This function:
 *  1. Detects continuation lines (non-empty, no leading `|`, after a table line)
 *  2. Appends them to the previous row using `<br>`
 *  3. Ensures every merged row ends with ` |` so the GFM parser can
 *     correctly identify the last column boundary.
 */
function fixTableCells(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const startsWithPipe = trimmed.startsWith("|");

    if (startsWithPipe) {
      inTable = true;
      out.push(line);
    } else if (inTable && trimmed) {
      // Continuation line — merge into the previous row
      let prev = out[out.length - 1].trimEnd();

      if (prev.endsWith("|")) {
        // Row had a closing pipe: insert `<br>` before it
        out[out.length - 1] =
          prev.slice(0, -1).trimEnd() + " <br> " + trimmed + " |";
      } else {
        // Row was not yet closed: append and add a closing pipe
        out[out.length - 1] = prev + " <br> " + trimmed + " |";
      }
    } else {
      // Blank line exits table context
      if (!trimmed) inTable = false;
      out.push(line);
    }
  }

  // Final pass: any table row still missing its closing `|` gets one added
  return out
    .map((line) => {
      const t = line.trim();
      if (t.startsWith("|") && !t.endsWith("|")) {
        return line.trimEnd() + " |";
      }
      return line;
    })
    .join("\n");
}

function Table(props: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto my-4 rounded-xl border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-sm" {...props} />
    </div>
  );
}

function Th(props: React.ComponentPropsWithoutRef<"th">) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50" {...props} />
  );
}

function Td(props: React.ComponentPropsWithoutRef<"td">) {
  return (
    <td className="px-4 py-3 text-zinc-700 border-t border-zinc-100 whitespace-pre-wrap" {...props} />
  );
}

function Tr(props: React.ComponentPropsWithoutRef<"tr">) {
  return <tr className="even:bg-zinc-50/50 hover:bg-zinc-50 transition-colors" {...props} />;
}

function BlockQuote(props: React.ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote className="border-l-4 border-zinc-300 bg-zinc-50 rounded-r-xl px-5 py-4 my-4 text-zinc-700 italic" {...props} />
  );
}

function CodeBlock(props: React.ComponentPropsWithoutRef<"code">) {
  const isInline = !props.className;
  if (isInline) {
    return (
      <code className="bg-zinc-100 text-rose-600 px-1.5 py-0.5 rounded-md text-sm font-mono" {...props} />
    );
  }
  return (
    <div className="relative group my-4">
      <pre className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 overflow-x-auto text-sm leading-relaxed font-mono">
        <code className="font-mono text-zinc-800" {...props} />
      </pre>
    </div>
  );
}

function H1(props: React.ComponentPropsWithoutRef<"h1">) {
  return <h1 className="text-2xl font-bold text-zinc-900 mt-8 mb-4 pb-3 border-b border-zinc-200" {...props} />;
}

function H2(props: React.ComponentPropsWithoutRef<"h2">) {
  return <h2 className="text-xl font-semibold text-zinc-900 mt-6 mb-3" {...props} />;
}

function H3(props: React.ComponentPropsWithoutRef<"h3">) {
  return <h3 className="text-lg font-semibold text-zinc-800 mt-5 mb-2" {...props} />;
}

function H4(props: React.ComponentPropsWithoutRef<"h4">) {
  return <h4 className="text-base font-semibold text-zinc-800 mt-4 mb-2" {...props} />;
}

function Ol(props: React.ComponentPropsWithoutRef<"ol">) {
  return <ol className="my-3 pl-6 space-y-1.5 list-decimal marker:text-zinc-400" {...props} />;
}

function Ul(props: React.ComponentPropsWithoutRef<"ul">) {
  return <ul className="my-3 pl-6 space-y-1.5 list-disc marker:text-zinc-400" {...props} />;
}

function Li(props: React.ComponentPropsWithoutRef<"li">) {
  return <li className="text-zinc-700 leading-relaxed pl-1" {...props} />;
}

function P(props: React.ComponentPropsWithoutRef<"p">) {
  return <p className="text-zinc-700 leading-relaxed my-3" {...props} />;
}

function Strong(props: React.ComponentPropsWithoutRef<"strong">) {
  return <strong className="font-semibold text-zinc-900" {...props} />;
}

function Hr(props: React.ComponentPropsWithoutRef<"hr">) {
  return <hr className="my-8 border-zinc-200" {...props} />;
}

const components: Components = {
  table: Table,
  th: Th,
  td: Td,
  tr: Tr,
  blockquote: BlockQuote,
  code: CodeBlock,
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  ol: Ol,
  ul: Ul,
  li: Li,
  p: P,
  strong: Strong,
  hr: Hr,
};

export function MarkdownRenderer({ content, className = "" }: Props) {
  const processed = fixTableCells(content);
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
