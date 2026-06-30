"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import "ckeditor5/ckeditor5-content.css";

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
      let prev = out[out.length - 1].trimEnd();
      if (prev.endsWith("|")) {
        out[out.length - 1] = prev.slice(0, -1).trimEnd() + " <br> " + trimmed + " |";
      } else {
        out[out.length - 1] = prev + " <br> " + trimmed + " |";
      }
    } else {
      if (!trimmed) inTable = false;
      out.push(line);
    }
  }

  return out
    .map((line) => {
      const t = line.trim();
      if (t.startsWith("|") && !t.endsWith("|")) return line.trimEnd() + " |";
      return line;
    })
    .join("\n");
}
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

/** Extract headings from Markdown text. */
function extractHeadingsFromMarkdown(markdown: string): Heading[] {
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

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Extract H2/H3 headings from HTML and inject id attributes for TOC anchors. */
function extractHeadingsFromHtml(html: string): { headings: Heading[]; processedHtml: string } {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();

  // Replace <h2> and <h3> tags — inject id and collect for TOC
  const processedHtml = html.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/h[23]>/gi,
    (_match, tag, attrs, inner) => {
      const level = tag === "h2" ? 2 : 3;
      // Strip tags and decode HTML entities to get plain text
      const text = decodeEntities(inner.replace(/<[^>]+>/g, "").trim());
      const base = slugify(text);
      const n = seen.get(base) || 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      headings.push({ id, text, level });
      // Preserve any existing attributes but add/replace id
      const cleanAttrs = attrs.replace(/\s*id="[^"]*"/, "");
      return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`;
    }
  );

  return { headings, processedHtml };
}

/** Unified heading extractor — handles both Markdown and HTML. */
function extractHeadings(content: string): Heading[] {
  if (content.trim().startsWith("<")) {
    return extractHeadingsFromHtml(content).headings;
  }
  return extractHeadingsFromMarkdown(content);
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
    <h1 id={id} className="text-[1.6rem] font-bold text-zinc-900 mt-12 mb-5 leading-tight scroll-mt-20 tracking-tight">
      {props.children}
    </h1>
  );
};

const H2 = (props: React.ComponentPropsWithoutRef<"h2">) => {
  const id = slugify(
    React.Children.toArray(props.children).map(c => typeof c === "string" ? c : "").join("").replace(/[*`]/g, "").trim()
  );
  return (
    <h2 id={id} className="text-lg font-bold text-zinc-900 mt-14 mb-4 scroll-mt-20 pb-3 border-b border-zinc-100">
      {props.children}
    </h2>
  );
};

const H3 = (props: React.ComponentPropsWithoutRef<"h3">) => {
  const id = slugify(
    React.Children.toArray(props.children).map(c => typeof c === "string" ? c : "").join("").replace(/[*`]/g, "").trim()
  );
  return (
    <h3 id={id} className="text-[0.95rem] font-semibold text-zinc-800 mt-8 mb-3 scroll-mt-20">
      {props.children}
    </h3>
  );
};

const H4 = (props: React.ComponentPropsWithoutRef<"h4">) => (
  <h4 className="text-xs font-bold text-zinc-500 mt-6 mb-2 uppercase tracking-widest">
    {props.children}
  </h4>
);

function Table(props: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto my-6 rounded-xl border border-zinc-200/80">
      <table className="min-w-full text-[13px]" {...props} />
    </div>
  );
}

function Th(props: React.ComponentPropsWithoutRef<"th">) {
  return (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50 border-b border-zinc-200 whitespace-nowrap" {...props} />
  );
}

function Td(props: React.ComponentPropsWithoutRef<"td">) {
  return (
    <td className="px-4 py-3 text-zinc-700 border-t border-zinc-100 align-top leading-relaxed text-[13px]" {...props} />
  );
}

function Tr(props: React.ComponentPropsWithoutRef<"tr">) {
  return <tr className="even:bg-zinc-50/40 hover:bg-sky-50/40 transition-colors" {...props} />;
}

function BlockQuote(props: React.ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote className="border-l-[3px] border-zinc-300 pl-5 pr-2 py-1 my-5 text-zinc-600 not-italic text-[14px] leading-relaxed" {...props} />
  );
}

function CodeBlock(props: React.ComponentPropsWithoutRef<"code">) {
  if (!props.className) {
    return <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-[0.82em] font-mono border border-zinc-200/80" {...props} />;
  }
  return (
    <div className="my-5 rounded-xl overflow-hidden">
      <pre className="bg-zinc-950 px-5 py-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-zinc-200 font-mono" {...props} />
      </pre>
    </div>
  );
}

const Ol = (props: React.ComponentPropsWithoutRef<"ol">) => (
  <ol className="my-3 pl-6 space-y-1.5 list-decimal marker:text-zinc-400 marker:text-[13px]" {...props} />
);
const Ul = (props: React.ComponentPropsWithoutRef<"ul">) => (
  <ul className="my-3 pl-6 space-y-1.5 list-disc marker:text-zinc-300" {...props} />
);
const Li = (props: React.ComponentPropsWithoutRef<"li">) => (
  <li className="text-zinc-700 leading-relaxed text-[14px]" {...props} />
);
const P = (props: React.ComponentPropsWithoutRef<"p">) => (
  <p className="text-zinc-700 leading-[1.85] my-3.5 text-[14px]" {...props} />
);
const Strong = (props: React.ComponentPropsWithoutRef<"strong">) => (
  <strong className="font-semibold text-zinc-900" {...props} />
);
function Hr() {
  return <div className="my-12 h-px bg-zinc-100" />;
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
  const navRef = React.useRef<HTMLElement>(null);

  // Scroll the active TOC item into the sidebar's visible area
  useEffect(() => {
    if (!navRef.current || !activeId) return;
    const el = navRef.current.querySelector(`[data-toc-id="${activeId}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  if (headings.length === 0) return null;

  // Assign sequential numbers to H2 headings only
  let h2Counter = 0;
  const numbered = headings.map((h) => ({
    ...h,
    num: h.level === 2 ? ++h2Counter : null,
  }));

  return (
    <nav ref={navRef} aria-label="Table of contents">
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="flex-1 h-px bg-zinc-200" />
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Contents
        </p>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>
      <ul className="space-y-px">
        {numbered.map((h) => {
          const isActive = activeId === h.id;
          return (
            <li key={h.id}>
              <button
                data-toc-id={h.id}
                onClick={() => onItemClick(h.id)}
                className={`group w-full text-left flex items-start gap-2 rounded-lg py-2 pr-2 transition-all duration-150 cursor-pointer relative ${
                  h.level === 3 ? "pl-6" : "pl-2"
                } ${
                  isActive
                    ? "text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                {/* Active accent bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-zinc-900 rounded-r-full" />
                )}
                <span className={`text-[11px] leading-snug ${isActive ? "font-semibold" : ""}`}>
                  {h.text}
                </span>
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

  // Track active section on scroll — finds the heading closest to (but above)
  // the top of the viewport. Works for both Markdown and HTML content.
  useEffect(() => {
    if (headings.length === 0) return;

    const headerH = 80; // approximate sticky header height

    const getActiveId = (): string => {
      // Walk headings from bottom to top; first one whose top <= headerH + 8 wins
      for (let i = headings.length - 1; i >= 0; i--) {
        const el = document.getElementById(headings[i].id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= headerH + 8) return headings[i].id;
        }
      }
      return headings[0]?.id ?? "";
    };

    const onScroll = () => {
      if (scrollingRef.current) return; // suppress during click-scroll
      const id = getActiveId();
      if (id) setActiveId(id);
    };

    // Small delay on mount so DOM is settled before first read
    const init = setTimeout(() => {
      const id = getActiveId();
      if (id) setActiveId(id);
    }, 150);

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(init);
      window.removeEventListener("scroll", onScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [content, headings.length]); // eslint-disable-line

  return (
    <>
      <div className="flex gap-10 items-start">
        {/* Sidebar TOC — desktop only (lg+). sticky must be on the flex child itself. */}
        <aside data-no-comment="true" className="hidden lg:block w-52 shrink-0 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto brd-toc-sidebar">
          <TableOfContents headings={headings} activeId={activeId} onItemClick={handleTocClick} />
        </aside>

        {/* Document body — HTML (post-edit) or Markdown (AI-generated) */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {content.trim().startsWith("<") ? (
            <div
              className="ck-content prose prose-zinc max-w-none"
              dangerouslySetInnerHTML={{
                __html: extractHeadingsFromHtml(content).processedHtml,
              }}
            />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]} components={components}>
              {fixTableCells(content)}
            </ReactMarkdown>
          )}
        </div>
      </div>

      {/* Mobile TOC — floating button + slide-up panel */}
      <MobileTOC headings={headings} activeId={activeId} onItemClick={handleTocClick} />
    </>
  );
}
