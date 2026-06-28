"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { List, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

/** Extract H2 / H3 headings from raw markdown text for the TOC. */
function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();

  for (const line of markdown.split("\n")) {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const match = h2 || h3;
    if (!match) continue;
    const level = h2 ? 2 : 3;
    const raw = match[1].replace(/\*\*/g, "").replace(/`/g, "").trim();
    const base = slugify(raw);
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    headings.push({ id: n === 0 ? base : `${base}-${n}`, text: raw, level });
  }
  return headings;
}

/** Smooth-scroll to an element by id, accounting for the sticky header. */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const headerH = document.querySelector("header")?.getBoundingClientRect().height ?? 64;
  const top = el.getBoundingClientRect().top + window.scrollY - headerH - 16;
  window.scrollTo({ top, behavior: "smooth" });
}

// ─── Heading factory ─────────────────────────────────────────────────────────
// Each page-level heading component needs its own dedup counter that resets
// on every full render pass. We use a module-level registry keyed by a
// per-render token stored in a React context so the counter starts fresh
// each time the component tree is re-mounted.

const RenderTokenCtx = React.createContext(0);

function useHeadingId(text: string): string {
  // We use a module-level WeakMap-like store per render token.
  // Simpler: since BRD section names are unique within a document,
  // plain slugify without dedup is reliable and avoids stale-closure bugs.
  return slugify(
    React.Children.toArray(text)
      .map((c) => (typeof c === "string" ? c : ""))
      .join("")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .trim()
  );
}

// ─── Markdown element components ──────────────────────────────────────────────

const H1 = (props: React.ComponentPropsWithoutRef<"h1">) => {
  const id = slugify(
    React.Children.toArray(props.children).map(c => typeof c === "string" ? c : "").join("").replace(/[*`]/g, "").trim()
  );
  return (
    <h1 id={id} className="text-2xl font-bold text-zinc-900 mt-10 mb-4 pb-3 border-b-2 border-zinc-900 scroll-mt-20">
      {props.children}
    </h1>
  );
};

const H2 = (props: React.ComponentPropsWithoutRef<"h2">) => {
  const id = slugify(
    React.Children.toArray(props.children).map(c => typeof c === "string" ? c : "").join("").replace(/[*`]/g, "").trim()
  );
  return (
    <h2 id={id} className="flex items-center gap-3 text-xl font-bold text-zinc-900 mt-12 mb-4 scroll-mt-20">
      <span className="w-1 h-6 rounded-full bg-zinc-800 shrink-0" />
      {props.children}
    </h2>
  );
};

const H3 = (props: React.ComponentPropsWithoutRef<"h3">) => {
  const id = slugify(
    React.Children.toArray(props.children).map(c => typeof c === "string" ? c : "").join("").replace(/[*`]/g, "").trim()
  );
  return (
    <h3 id={id} className="text-base font-semibold text-zinc-800 mt-8 mb-3 scroll-mt-20">
      {props.children}
    </h3>
  );
};

const H4 = (props: React.ComponentPropsWithoutRef<"h4">) => (
  <h4 className="text-sm font-semibold text-zinc-600 mt-6 mb-2 uppercase tracking-wide">
    {props.children}
  </h4>
);

function Table(props: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto my-6 rounded-xl border border-zinc-200 shadow-sm">
      <table className="min-w-full text-sm" {...props} />
    </div>
  );
}

function Th(props: React.ComponentPropsWithoutRef<"th">) {
  return (
    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 bg-zinc-900/5 border-b border-zinc-200 whitespace-nowrap" {...props} />
  );
}

function Td(props: React.ComponentPropsWithoutRef<"td">) {
  return (
    <td className="px-4 py-3 text-zinc-700 border-t border-zinc-100 align-top leading-relaxed" {...props} />
  );
}

function Tr(props: React.ComponentPropsWithoutRef<"tr">) {
  return <tr className="even:bg-zinc-50/60 hover:bg-blue-50/30 transition-colors" {...props} />;
}

function BlockQuote(props: React.ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote className="border-l-4 border-zinc-800 bg-zinc-50 rounded-r-xl px-5 py-4 my-5 text-zinc-700 not-italic" {...props} />
  );
}

function CodeBlock(props: React.ComponentPropsWithoutRef<"code">) {
  if (!props.className) {
    return <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-zinc-200" {...props} />;
  }
  return (
    <div className="my-5 rounded-xl overflow-hidden border border-zinc-200">
      <pre className="bg-zinc-950 p-5 overflow-x-auto text-sm leading-relaxed">
        <code className="text-zinc-100 font-mono" {...props} />
      </pre>
    </div>
  );
}

const Ol = (props: React.ComponentPropsWithoutRef<"ol">) => (
  <ol className="my-4 pl-6 space-y-2 list-decimal marker:text-zinc-500 marker:font-semibold" {...props} />
);
const Ul = (props: React.ComponentPropsWithoutRef<"ul">) => (
  <ul className="my-4 pl-6 space-y-2 list-disc marker:text-zinc-400" {...props} />
);
const Li = (props: React.ComponentPropsWithoutRef<"li">) => (
  <li className="text-zinc-700 leading-relaxed" {...props} />
);
const P = (props: React.ComponentPropsWithoutRef<"p">) => (
  <p className="text-zinc-700 leading-[1.8] my-4 text-[15px]" {...props} />
);
const Strong = (props: React.ComponentPropsWithoutRef<"strong">) => (
  <strong className="font-semibold text-zinc-900" {...props} />
);
function Hr() {
  return (
    <div className="my-10 flex items-center gap-4">
      <div className="flex-1 h-px bg-zinc-200" />
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
      <div className="flex-1 h-px bg-zinc-200" />
    </div>
  );
}

const components: Components = {
  h1: H1, h2: H2, h3: H3, h4: H4,
  table: Table, th: Th, td: Td, tr: Tr,
  blockquote: BlockQuote, code: CodeBlock,
  ol: Ol, ul: Ul, li: Li, p: P, strong: Strong, hr: Hr,
};

// ─── Table of Contents ────────────────────────────────────────────────────────

function TableOfContents({
  headings,
  activeId,
  onItemClick,
}: {
  headings: Heading[];
  activeId: string;
  onItemClick: (id: string) => void;
}) {
  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-3 px-2">
        Contents
      </p>
      <ul className="space-y-0.5">
        {headings.map((h) => {
          const isActive = activeId === h.id;
          return (
            <li key={h.id}>
              <button
                onClick={() => onItemClick(h.id)}
                className={`w-full text-left text-xs leading-snug rounded-lg px-2 py-1.5 transition-all cursor-pointer ${
                  h.level === 3 ? "pl-5" : ""
                } ${
                  isActive
                    ? "bg-zinc-900 text-white font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                {h.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── Mobile TOC overlay ──────────────────────────────────────────────────────

function MobileTOC({
  headings,
  activeId,
  onItemClick,
}: {
  headings: Heading[];
  activeId: string;
  onItemClick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (headings.length === 0) return null;

  const handleClick = (id: string) => {
    onItemClick(id);
    setOpen(false);
  };

  return (
    <>
      {/* Floating trigger — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900 text-white text-xs font-semibold rounded-full px-4 py-2.5 shadow-xl z-20 print:hidden"
      >
        <List className="w-3.5 h-3.5" />
        Contents
      </button>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 print:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-up panel */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 transition-transform duration-300 max-h-[70vh] flex flex-col print:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
          <p className="text-sm font-bold text-zinc-900">Table of Contents</p>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 flex-1">
          <ul className="space-y-0.5">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => handleClick(h.id)}
                  className={`w-full text-left text-sm rounded-xl px-3 py-2.5 transition-colors ${
                    h.level === 3 ? "pl-7" : ""
                  } ${
                    activeId === h.id
                      ? "bg-zinc-900 text-white font-semibold"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="h-safe-area-inset-bottom" />
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  content: string;
}

export function BRDDocumentRenderer({ content }: Props) {
  const headings = extractHeadings(content);
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
  // While this ref is true the observer will not update activeId —
  // prevents intermediate sections from flashing active during a
  // click-triggered scroll animation.
  const scrollingRef = React.useRef(false);
  const scrollTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTocClick = (id: string) => {
    // Immediately mark the clicked item active and suppress the observer.
    setActiveId(id);
    scrollingRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    // Re-enable the observer ~700 ms after the scroll starts — enough time
    // for the smooth-scroll animation to finish on most documents.
    scrollTimerRef.current = setTimeout(() => {
      scrollingRef.current = false;
    }, 700);
    scrollToId(id);
  };

  // Track which section is in view (only when the user is scrolling manually).
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return; // ignore during click-scroll
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-60px 0px -50% 0px", threshold: 0 }
    );

    const timer = setTimeout(() => {
      headings.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [content]); // eslint-disable-line

  return (
    <>
      <div className="flex gap-10 items-start">
        {/* Sidebar TOC — desktop only (lg+). sticky must be on the flex child itself. */}
        <aside className="hidden lg:block w-52 shrink-0 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto">
          <TableOfContents headings={headings} activeId={activeId} onItemClick={handleTocClick} />
        </aside>

        {/* Document body */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Mobile TOC — floating button + slide-up panel */}
      <MobileTOC headings={headings} activeId={activeId} onItemClick={handleTocClick} />
    </>
  );
}
