"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Spin, Typography } from "antd";
import { BookText, Building2, Calendar, User, Printer, ArrowUp } from "lucide-react";
import { BRDDocumentRenderer } from "@/components/features/BRD/BRDDocumentRenderer";
import type { BRD } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Branding {
  companyName: string;
  tagline: string | null;
  logoPath: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? Math.round((scrolled / total) * 100) : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div className="absolute bottom-0 left-0 h-0.5 bg-zinc-900 transition-all duration-100 print:hidden" style={{ width: `${pct}%` }} />
  );
}

export default function SharedBRDPage() {
  const { token } = useParams() as { token: string };
  const [brd, setBrd] = useState<BRD | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [brdRes, brandingRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}`),
          fetch(`${API_BASE_URL}/api/v1/branding`),
        ]);
        if (brdRes.status === "fulfilled" && brdRes.value.ok) {
          const json = await brdRes.value.json();
          setBrd(json.data);
        } else {
          setNotFound(true);
        }
        if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
          const json = await brandingRes.value.json();
          const d = json.data;
          setBranding({ companyName: d.companyName || "", tagline: d.tagline || null, logoPath: d.logoPath || null });
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const aiContent = brd.aiContent || {};
  const documentContent = aiContent["improved-brd.md"] || aiContent["brd.md"] || "";
  const companyName = branding?.companyName || "Business Analysis Team";
  const tagline = branding?.tagline || null;
  const logoUrl = branding?.logoPath ? `${API_BASE_URL}${branding.logoPath}` : null;

  return (
    <div className="min-h-screen bg-white print:bg-white">

      {/* Sticky header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-30 print:hidden">
        <div className="relative">
        <ReadingProgress />
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-8 w-auto object-contain shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                <BookText className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 leading-none truncate">{companyName}</p>
              {tagline && <p className="text-[11px] text-zinc-400 leading-none mt-0.5 truncate">{tagline}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:block text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1">
              Confidential · Read-only
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6">

        {/* Cover block */}
        <div className="py-14 border-b border-zinc-100 mb-12 print:py-8 print:mb-8">
          {/* Logo for print */}
          {logoUrl && (
            <div className="hidden print:block mb-8">
              <img src={logoUrl} alt={companyName} className="h-12 w-auto object-contain" />
            </div>
          )}

          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
              Business Requirements Document
            </p>
            <h1 className="text-4xl font-bold text-zinc-900 leading-tight mb-8 tracking-tight">
              {brd.name}
            </h1>

            <div className="flex flex-wrap gap-8">
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
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-800">{companyName}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                  Date
                </p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-800">{formatDate(brd.createdAt)}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                  Version
                </p>
                <p className="text-sm font-semibold text-zinc-800">1.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Document content — BRD renderer with sidebar TOC */}
        {documentContent ? (
          <div className="pb-20">
            <BRDDocumentRenderer content={documentContent} />
          </div>
        ) : (
          <div className="py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <BookText className="w-7 h-7 text-zinc-300" />
            </div>
            <Typography.Text className="text-zinc-400">
              Document content is not yet available.
            </Typography.Text>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-100 mt-4 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-5 w-auto object-contain opacity-40" />
            ) : (
              <div className="w-5 h-5 rounded bg-zinc-200 flex items-center justify-center">
                <BookText className="w-3 h-3 text-zinc-400" />
              </div>
            )}
            <p className="text-xs text-zinc-400">{companyName}</p>
            {tagline && <span className="text-zinc-200">·</span>}
            {tagline && <p className="text-xs text-zinc-300">{tagline}</p>}
          </div>
          <p className="text-xs text-zinc-300">Generated with Apex BRD Intelligence</p>
        </div>
      </footer>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 w-10 h-10 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-700 transition-colors print:hidden z-20"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
