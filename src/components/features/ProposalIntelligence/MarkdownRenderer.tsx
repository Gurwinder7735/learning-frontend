"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";

interface Props {
  content: string;
  className?: string;
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
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
