"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin, Typography } from "antd";
import { BookText, Building2, Calendar, User } from "lucide-react";
import { MarkdownRenderer } from "@/components/features/ProposalIntelligence/MarkdownRenderer";
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

export default function SharedBRDPage() {
  const { token } = useParams() as { token: string };
  const [brd, setBrd] = useState<BRD | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
          setBranding({
            companyName: d.companyName || "",
            tagline: d.tagline || null,
            logoPath: d.logoPath || null,
          });
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Spin size="large" />
      </div>
    );
  }

  if (notFound || !brd) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-8">
        <BookText className="w-16 h-16 text-zinc-300 mb-4" />
        <Typography.Title level={3} className="!text-zinc-500 !mb-2">
          Document not found
        </Typography.Title>
        <Typography.Text className="text-zinc-400">
          This BRD is not available or the link has expired.
        </Typography.Text>
      </div>
    );
  }

  const aiContent = brd.aiContent || {};
  // Use best available content: final improved version → draft
  const documentContent =
    aiContent["improved-brd.md"] || aiContent["brd.md"] || "";

  const companyName = branding?.companyName || "Business Analysis Team";
  const tagline = branding?.tagline || null;
  const logoUrl = branding?.logoPath ? `${API_BASE_URL}${branding.logoPath}` : null;

  return (
    <div className="min-h-screen bg-zinc-50 print:bg-white">
      {/* Sticky header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                <BookText className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-zinc-900 leading-none">{companyName}</p>
              {tagline && (
                <p className="text-[11px] text-zinc-400 leading-none mt-0.5">{tagline}</p>
              )}
            </div>
          </div>
          <span className="text-xs text-zinc-400">Read-only · Confidential</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 print:py-4">
        {/* Cover block */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 mb-8 print:border-0 print:rounded-none print:p-0 print:mb-6">
          {/* Logo for print */}
          {logoUrl && (
            <div className="hidden print:block mb-6">
              <img src={logoUrl} alt={companyName} className="h-12 w-auto object-contain" />
            </div>
          )}

          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                Business Requirements Document
              </p>
              <h1 className="text-3xl font-bold text-zinc-900 leading-tight mb-1">
                {brd.name}
              </h1>
            </div>
            <div className="shrink-0 text-right hidden sm:block">
              <p className="text-xs text-zinc-400">Version 1.0</p>
              <p className="text-xs text-zinc-400">Confidential</p>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {brd.clientName && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Prepared For
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <p className="text-sm font-medium text-zinc-800 truncate">{brd.clientName}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Prepared By
                </p>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <p className="text-sm font-medium text-zinc-800 truncate">{companyName}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Date
                </p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <p className="text-sm font-medium text-zinc-800">{formatDate(brd.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document content */}
        {documentContent ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-10 print:border-0 print:rounded-none print:p-0">
            <MarkdownRenderer content={documentContent} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
            <BookText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <Typography.Text className="text-zinc-400">
              Document content is not yet available.
            </Typography.Text>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 border-t border-zinc-200 mt-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-5 w-auto object-contain opacity-50" />
            ) : (
              <BookText className="w-4 h-4 text-zinc-300" />
            )}
            <Typography.Text className="text-xs text-zinc-400">
              {companyName}
            </Typography.Text>
          </div>
          <Typography.Text className="text-xs text-zinc-400">
            Generated with Apex BRD Intelligence
          </Typography.Text>
        </div>
      </footer>
    </div>
  );
}
