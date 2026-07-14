"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Typography } from "antd";
import { BookText, Building2, Calendar, Printer, User, ArrowUp, Lock } from "lucide-react";

import { BRDDocumentRenderer } from "@/components/features/BRD/BRDDocumentRenderer";
import { InlineCommentLayer } from "@/components/features/BRD/InlineCommentLayer";
import { CommentsSection } from "@/components/features/BRD/CommentsSection";
import { PasswordGate } from "@/components/features/BRD/PasswordGate";
import { ReadingProgress } from "@/components/features/BRD/ReadingProgress";
import { useBRDShare } from "@/hooks/useBRDShare";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SharedBRDPage() {
  const { token } = useParams() as { token: string };
  const [showScrollTop, setShowScrollTop] = useState(false);

  const {
    brd,
    branding,
    allComments,
    loading,
    notFound,
    isGated,
    logoUrl,
    companyName,
    setBrd,
    setIsGated,
    addComment,
    deleteComment,
    updateComment,
  } = useBRDShare(token);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (notFound || !brd) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-6">
          <BookText className="w-8 h-8 text-zinc-400" />
        </div>
        <Typography.Title level={3} className="!text-zinc-700 !mb-2 !font-semibold">
          Document not found
        </Typography.Title>
        <Typography.Text className="text-zinc-400 text-center max-w-xs">
          This document is not available or the link has expired.
        </Typography.Text>
      </div>
    );
  }

  // ── Password gate ───────────────────────────────────────────────────────────

  if (isGated && !brd.aiContent) {
    return (
      <PasswordGate
        docName={brd.name}
        clientName={brd.clientName}
        onUnlock={(unlockedBrd) => {
          setBrd(unlockedBrd as unknown as typeof brd);
          setIsGated(false);
        }}
      />
    );
  }

  // ── Comment partitioning ────────────────────────────────────────────────────
  // Top-level inline = has a position (anchorY) and no parent
  // Their replies = has a parentId that matches a top-level inline
  // Section comments = no position and no parent (bottom of page)
  // Section replies = parentId matching a section comment

  const inlineTopLevel = allComments.filter((c) => c.anchorY != null && !c.parentId);
  const inlineTopLevelIds = new Set(inlineTopLevel.map((c) => c.id));
  const inlineReplies = allComments.filter((c) => c.parentId && inlineTopLevelIds.has(c.parentId));

  const sectionTopLevel = allComments.filter((c) => c.anchorY == null && !c.parentId);
  const sectionTopLevelIds = new Set(sectionTopLevel.map((c) => c.id));
  const sectionReplies = allComments.filter((c) => c.parentId && sectionTopLevelIds.has(c.parentId));

  const aiContent = brd.aiContent || {};
  const documentContent = aiContent["improved-brd.md"] || aiContent["brd.md"] || "";

  // ── Main document ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-30 print:hidden">
        <div className="relative">
          <ReadingProgress />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="h-16 w-auto object-contain shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                  <BookText className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {brd.isPasswordProtected && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1">
                  <Lock className="w-3 h-3" /> Protected
                </div>
              )}
              {brd.publishedVersionLabel && (
                <span className="hidden sm:block text-xs font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 rounded-full px-3 py-1">
                  v{brd.publishedVersionLabel}
                </span>
              )}
              <span className="hidden sm:block text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1">
                Confidential · Read-only
              </span>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Cover block */}
        <div className="py-8 sm:py-14 border-b border-zinc-100 mb-8 sm:mb-12 print:py-8 print:mb-8">
          {logoUrl && (
            <div className="hidden print:block mb-8">
              <img src={logoUrl} alt={companyName} className="h-12 w-auto object-contain" />
            </div>
          )}
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Business Requirements Document
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold text-zinc-900 leading-tight mb-6 sm:mb-8 tracking-tight">
              {brd.name}
            </h1>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-8">
              {brd.clientName && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                    Prepared For
                  </p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                    <p className="text-sm font-semibold text-zinc-800">{brd.clientName}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                  Prepared By
                </p>
                {brd.preparedBy ? (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-400" />
                    <p className="text-sm font-semibold text-zinc-800">{brd.preparedBy}</p>
                  </div>
                ) : logoUrl ? (
                  <img src={logoUrl} alt={companyName} className="h-8 w-auto object-contain" />
                ) : (
                  <p className="text-sm font-semibold text-zinc-800">{companyName}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                  Date
                </p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-800">
                    {brd.documentDate || formatDate(brd.createdAt)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                  Version
                </p>
                <p className="text-sm font-semibold text-zinc-800">
                  {brd.publishedVersionLabel ? `v${brd.publishedVersionLabel}` : brd.documentVersion || "1.0"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Document body */}
        {documentContent ? (
          <InlineCommentLayer
            token={token}
            comments={[...inlineTopLevel, ...inlineReplies]}
            onCommentAdded={addComment}
            onCommentDeleted={deleteComment}
            onCommentUpdated={updateComment}
          >
            <div className="pb-12">
              <BRDDocumentRenderer content={documentContent} />
            </div>
          </InlineCommentLayer>
        ) : (
          <div className="py-24 text-center">
            <BookText className="w-14 h-14 text-zinc-200 mx-auto mb-4" />
            <Typography.Text className="text-zinc-400">
              Document content is not yet available.
            </Typography.Text>
          </div>
        )}

      </div>


      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 w-10 h-10 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-700 transition-colors print:hidden z-20"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
