"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin, Typography, Tabs } from "antd";
import { BookText, Building2, Clock } from "lucide-react";
import { MarkdownRenderer } from "@/components/features/ProposalIntelligence/MarkdownRenderer";
import type { BRD } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const OUTPUT_FILES = [
  { key: "brd", label: "Full BRD", file: "brd.md" },
  { key: "business-context", label: "Business Context", file: "business-context.md" },
  { key: "functional-requirements", label: "Functional Requirements", file: "functional-requirements.md" },
  { key: "user-stories", label: "User Stories", file: "user-stories.md" },
  { key: "technical-requirements", label: "Technical Requirements", file: "technical-requirements.md" },
  { key: "data-requirements", label: "Data Requirements", file: "data-requirements.md" },
];

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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("brd");

  useEffect(() => {
    const fetchBRD = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        setBrd(json.data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBRD();
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
  const availableTabs = OUTPUT_FILES.filter((f) => aiContent[f.file]);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookText className="w-5 h-5 text-zinc-600" />
            <span className="font-semibold text-zinc-900 text-sm">Business Requirements Document</span>
          </div>
          <span className="text-xs text-zinc-400 hidden sm:block">Read-only · Shared view</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Document header */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">{brd.name}</h1>
          <div className="flex items-center gap-6 text-sm text-zinc-500 flex-wrap">
            {brd.clientName && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {brd.clientName}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDate(brd.createdAt)}
            </span>
            {brd.documentIds.length > 0 && (
              <span>{brd.documentIds.length} source document{brd.documentIds.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        {/* Content tabs */}
        {availableTabs.length > 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              className="!px-6"
              items={availableTabs.map((f) => ({
                key: f.key,
                label: f.label,
                children: (
                  <div className="pb-8 px-2">
                    <MarkdownRenderer content={aiContent[f.file] || ""} />
                  </div>
                ),
              }))}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
            <BookText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <Typography.Text className="text-zinc-400">
              No content available yet.
            </Typography.Text>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-6 text-center">
        <Typography.Text className="text-xs text-zinc-400">
          Generated by Apex BRD Intelligence · AI-powered Business Requirements
        </Typography.Text>
      </footer>
    </div>
  );
}
