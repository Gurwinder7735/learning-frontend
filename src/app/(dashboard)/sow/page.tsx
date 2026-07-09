"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Drawer, Input, message, Tooltip } from "antd";
import {
  Search,
  Plus,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  FileSearch,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { fetchSOWsRequest } from "@/store/modules/sow/sowSlice";
import { selectSOWs, selectSOWLoading } from "@/store/modules/sow/sowSelectors";
import { storage } from "@/lib/utils/storage";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import type { SOW } from "@/types/models/SOW";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const statusAccent: Record<string, string> = {
  draft: "border-l-zinc-300",
  generating: "border-l-purple-400",
  completed: "border-l-emerald-500",
  failed: "border-l-red-400",
  archived: "border-l-zinc-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function SOWCard({ sow, onDelete }: { sow: SOW; onDelete: (s: SOW) => void }) {
  const isCompleted = sow.status === "completed";
  const isGenerating = sow.status === "generating";
  const isFailed = sow.status === "failed";

  return (
    <div className={`relative group bg-white rounded-2xl border-l-4 border border-zinc-100 ${statusAccent[sow.status] || "border-l-zinc-300"} hover:border-zinc-200 hover:shadow-md transition-all duration-200`}>
      <Link href={`${APP_ROUTES.sow}/${sow.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors leading-snug line-clamp-2">
              {sow.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {isCompleted && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Completed
              </span>
            )}
            {isGenerating && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Generating
              </span>
            )}
            {isFailed && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                <AlertCircle className="w-2.5 h-2.5" /> Failed
              </span>
            )}
            {sow.status === "draft" && (
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">Draft</span>
            )}
          </div>
        </div>

        {sow.clientName ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-3">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {sow.clientName}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 italic mb-3">No client assigned</div>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-50 pt-3 mt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(sow.createdAt)} · {formatTime(sow.createdAt)}
          </span>
          {sow.isPasswordProtected && (
            <span className="text-zinc-400 text-[10px]">🔒 Protected</span>
          )}
        </div>
      </Link>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(sow); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SOWListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sows = useAppSelector(selectSOWs);
  const isLoading = useAppSelector(selectSOWLoading);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [contextText, setContextText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchSOWsRequest());
  }, [dispatch]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (!name.trim()) { message.warning("Please enter a document name."); return; }
    if (!contextText.trim() && files.length === 0) { message.warning("Please provide context text or upload at least one document."); return; }
    if (generating) return;
    setGenerating(true);
    try {
      const token = storage.getAccessToken();
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("context_text", contextText.trim());
      if (clientName.trim()) formData.append("client_name", clientName.trim());
      files.forEach((f) => formData.append("files", f));

      const res = await fetch(`${API_BASE_URL}/api/v1/sow/generate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setDrawerOpen(false);
      router.push(`${APP_ROUTES.sow}/${json.data.sowId}?generating=true&jobId=${json.data.jobId}`);
    } catch {
      message.error("Failed to start analysis");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = (sow: SOW) => {
    const confirmed = window.confirm(`Delete "${sow.name}"? This cannot be undone.`);
    if (!confirmed) return;
    const token = storage.getAccessToken();
    fetch(`${API_BASE_URL}/api/v1/sow/${sow.id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(() => dispatch(fetchSOWsRequest())).catch(() => message.error("Failed to delete"));
  };

  const completedCount = sows.filter((s) => s.status === "completed").length;
  const generatingCount = sows.filter((s) => s.status === "generating").length;

  return (
    <div>
      <PageHeader
        title="SOW Analyzer"
        subtitle="Upload a SOW, SRS, or BRD and AI agents will produce a complete Product Discovery Document."
      />

      {/* Stats + New button */}
      {sows.length > 0 && (
        <div className="flex items-center gap-6 mb-6 text-xs text-zinc-500">
          <span><strong className="text-zinc-800 font-semibold">{sows.length}</strong> total</span>
          <span><strong className="text-emerald-700 font-semibold">{completedCount}</strong> completed</span>
          {generatingCount > 0 && (
            <span className="flex items-center gap-1 text-purple-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <strong>{generatingCount}</strong> generating
            </span>
          )}
          <div className="flex-1" />
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setDrawerOpen(true)}
            className="!bg-zinc-900"
          >
            New Analysis
          </Button>
        </div>
      )}

      {isLoading && sows.length === 0 ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : sows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
            <FileSearch className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-bold text-zinc-700 mb-1">No analyses yet</h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">
            Upload a SOW, SRS, or BRD document and our 7-agent AI pipeline will produce a complete Product Discovery Document.
          </p>
          <Button type="primary" size="large" icon={<Plus className="w-4 h-4" />} onClick={() => setDrawerOpen(true)} className="!bg-zinc-900">
            Start your first analysis
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sows.map((sow) => (
            <SOWCard key={sow.id} sow={sow} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Generation Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="font-semibold text-zinc-900">New SOW Analysis</span>
          </div>
        }
        width={480}
        placement="right"
        destroyOnClose
        footer={
          <div className="flex items-center gap-3 justify-end">
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" loading={generating} onClick={handleGenerate} className="!bg-zinc-900">
              Analyse Document
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 leading-relaxed">
            Our 7-agent AI pipeline will analyse your document and produce a Product Discovery Document covering requirements, user journeys, screens, feature flows, and UX recommendations.
          </p>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">Analysis Name <span className="text-red-400">*</span></label>
            <Input
              placeholder="e.g. Acme App — Product Discovery"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">Client Name <span className="text-zinc-300 font-normal">(optional)</span></label>
            <Input
              placeholder="e.g. Acme Corporation"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Upload Documents</p>
            <p className="text-xs text-zinc-400 mb-3">PDF, Word, Excel — up to 5 files. The AI will extract and analyse all content.</p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
              className="hidden"
              onChange={handleFilePick}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-zinc-200 rounded-xl py-6 text-center hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
            >
              <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-500 font-medium">Click to upload files</p>
              <p className="text-xs text-zinc-400 mt-0.5">PDF, DOC, DOCX, XLSX, TXT (max 5 files)</p>
            </button>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2">
                    <span className="flex-1 text-xs text-zinc-700 truncate">{f.name}</span>
                    <span className="text-[10px] text-zinc-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => handleRemoveFile(idx)} className="text-zinc-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">Additional Context <span className="text-zinc-300 font-normal">(optional)</span></label>
            <Input.TextArea
              placeholder="Paste any additional context, requirements, or notes that aren't in the uploaded documents..."
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
