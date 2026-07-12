"use client";

import { BRDDocumentRenderer } from "@/components/features/BRD/BRDDocumentRenderer";

/**
 * Renders a published proposal document.
 *
 * Under the hood we delegate to :func:`BRDDocumentRenderer` — it already
 * handles both Markdown (AI-generated) and HTML (post-edit) content,
 * heading extraction, sticky TOC sidebar, and mobile TOC overlay. The
 * proposal share page just needs the same layout with different content,
 * so wrapping keeps the two documents visually consistent while making
 * it easy to fork later if proposals need a bespoke cover / layout.
 */
interface Props {
  content: string;
}

export function ProposalDocumentRenderer({ content }: Props) {
  return <BRDDocumentRenderer content={content} />;
}
