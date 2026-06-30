"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Drawer, Modal, message, Tooltip } from "antd";
import {
  BookText,
  Sparkles,
  Loader2,
  Building2,
  Clock,
  CheckCircle2,
  Trash2,
  FileText,
  AlertCircle,
  Lock,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { fetchBRDsRequest } from "@/store/modules/brd/brdSlice";
import { selectBRDs, selectBRDLoading } from "@/store/modules/brd/brdSelectors";
import { selectClients, selectClientsMeta } from "@/store/modules/clients/clientsSelectors";
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import { BRDGenerationForm } from "@/components/features/BRD/BRDGenerationForm";
import { storage } from "@/lib/utils/storage";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import type { BRD } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Card left-border accent colour by status
const accentClass: Record<string, string> = {
  completed: "border-l-emerald-500",
  generating: "border-l-blue-500",
  failed: "border-l-red-400",
  draft: "border-l-zinc-300",
  archived: "border-l-zinc-200",
};

function BRDCard({ brd, onDelete }: { brd: BRD; onDelete: (b: BRD) => void }) {
  const isGenerating = brd.status === "generating";
  const isCompleted = brd.status === "completed";
  const isFailed = brd.status === "failed";
  const isPublished = !!brd.publishedVersionLabel;

  return (
    <div className={`relative group bg-white rounded-2xl border-l-4 border border-zinc-100 ${accentClass[brd.status] || "border-l-zinc-300"} hover:border-zinc-200 hover:shadow-md transition-all duration-200`}>
      <Link href={`${APP_ROUTES.brd}/${brd.id}`} className="block p-5">
        {/* Top row: name + status indicators */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors leading-snug line-clamp-2">
              {brd.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isGenerating && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Generating
              </span>
            )}
            {isFailed && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                <AlertCircle className="w-2.5 h-2.5" />
                Failed
              </span>
            )}
            {isCompleted && isPublished && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <Globe className="w-2.5 h-2.5" />
                v{brd.publishedVersionLabel} live
              </span>
            )}
            {isCompleted && !isPublished && (
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">
                Not published
              </span>
            )}
          </div>
        </div>

        {/* Client */}
        {brd.clientName ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-3">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {brd.clientName}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 italic mb-3">No client assigned</div>
        )}

        {/* Bottom row: meta */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-50 pt-3 mt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(brd.createdAt)}
            </span>
            {brd.documentIds.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {brd.documentIds.length} doc{brd.documentIds.length !== 1 ? "s" : ""}
              </span>
            )}
            {brd.isPasswordProtected && (
              <Tooltip title="Password protected">
                <Lock className="w-3 h-3 text-zinc-400" />
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            <span className="text-zinc-300">{formatTime(brd.createdAt)}</span>
          </div>
        </div>
      </Link>

      {/* Delete button — appears on hover */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(brd); }}
        className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
        title="Delete BRD"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function BRDPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const brds = useAppSelector(selectBRDs);
  const isLoading = useAppSelector(selectBRDLoading);
  const clients = useAppSelector(selectClients);
  const clientsMeta = useAppSelector(selectClientsMeta);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    dispatch(fetchBRDsRequest());
    dispatch(fetchClientsRequest({ limit: 200 }));
  }, [dispatch]);

  const handleDelete = (brd: BRD) => {
    Modal.confirm({
      title: "Delete BRD",
      content: `Delete "${brd.name}"? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = storage.getAccessToken();
          const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/${brd.id}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error();
          message.success("BRD deleted");
          dispatch(fetchBRDsRequest());
        } catch {
          message.error("Failed to delete BRD");
        }
      },
    });
  };

  const handleGenerate = async (formData: {
    name: string;
    contextText: string;
    clientId?: string;
    clientName?: string;
    files: File[];
  }) => {
    setGenerating(true);
    try {
      const token = storage.getAccessToken();
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("context_text", formData.contextText);
      if (formData.clientId) fd.append("client_id", formData.clientId);
      if (formData.clientName) fd.append("client_name", formData.clientName);
      formData.files.forEach((f) => fd.append("files", f));

      const res = await fetch(`${API_BASE_URL}/api/v1/brd/generate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const brdId = json.data?.brdId;
      setDrawerOpen(false);
      message.success("BRD generation started!");
      if (brdId) router.push(`${APP_ROUTES.brd}/${brdId}`);
    } catch {
      Modal.error({ title: "Generation failed", content: "Could not start BRD generation. Please try again." });
    } finally {
      setGenerating(false);
    }
  };

  // Stats
  const completedCount = brds.filter((b) => b.status === "completed").length;
  const publishedCount = brds.filter((b) => b.publishedVersionLabel).length;
  const generatingCount = brds.filter((b) => b.status === "generating").length;

  return (
    <div>
      <PageHeader
        title="BRD Studio"
        subtitle="Generate AI-powered Business Requirements Documents from client context and uploaded files."
      />

      {/* Stats bar */}
      {brds.length > 0 && (
        <div className="flex items-center gap-6 mb-6 text-xs text-zinc-500">
          <span><strong className="text-zinc-800 font-semibold">{brds.length}</strong> total</span>
          <span><strong className="text-emerald-700 font-semibold">{publishedCount}</strong> published</span>
          <span><strong className="text-zinc-700 font-semibold">{completedCount}</strong> completed</span>
          {generatingCount > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <strong>{generatingCount}</strong> generating
            </span>
          )}
          <div className="flex-1" />
          <Button
            type="primary"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setDrawerOpen(true)}
            className="!bg-zinc-900"
          >
            Generate BRD
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading && brds.length === 0 ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : brds.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
            <BookText className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-bold text-zinc-700 mb-1">No BRDs yet</h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">
            Upload client documents and let AI agents generate a complete, professional Business Requirements Document.
          </p>
          <Button
            type="primary"
            size="large"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setDrawerOpen(true)}
            className="!bg-zinc-900"
          >
            Generate your first BRD
          </Button>
        </div>
      ) : (
        /* Card grid */
        <>
          {/* Generating BRDs first */}
          {generatingCount > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">In Progress</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {brds.filter((b) => b.status === "generating").map((brd) => (
                  <BRDCard key={brd.id} brd={brd} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Completed + others */}
          {brds.filter((b) => b.status !== "generating").length > 0 && (
            <div>
              {generatingCount > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">All Documents</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {brds.filter((b) => b.status !== "generating").map((brd) => (
                  <BRDCard key={brd.id} brd={brd} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Drawer
        title="Generate AI Business Requirements Document"
        width={680}
        open={drawerOpen}
        onClose={() => { if (!generating) setDrawerOpen(false); }}
        destroyOnClose
      >
        <BRDGenerationForm
          clients={clients}
          clientsLoading={clientsMeta.isLoading}
          onSubmit={handleGenerate}
          loading={generating}
        />
      </Drawer>
    </div>
  );
}
