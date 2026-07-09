"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Modal, Spin, Typography, message } from "antd";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  FileSearch,
  Loader2,
  RefreshCw,
  Trash2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  fetchSOWDetailRequest,
  fetchFeatureDocsRequest,
  fetchSOWsRequest,
  setGenerating,
  appendExtractorToken,
  extractorComplete,
  featuresFound,
  featureStart,
  appendFeatureToken,
  featureDone,
  featureError,
  clearGeneration,
} from "@/store/modules/sow/sowSlice";
import {
  selectCurrentSOW,
  selectSOWLoading,
  selectSOWIsGenerating,
  selectSOWGeneratingFeatures,
  selectSOWFeatureDocs,
  selectSOWExtractorDone,
} from "@/store/modules/sow/sowSelectors";
import { storage } from "@/lib/utils/storage";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import type { SOWFeatureDoc } from "@/types/models/SOW";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const moduleColors: Record<string, string> = {
  "Auth": "bg-blue-50 text-blue-700 border-blue-200",
  "Core": "bg-purple-50 text-purple-700 border-purple-200",
  "Billing": "bg-amber-50 text-amber-700 border-amber-200",
  "Payments": "bg-amber-50 text-amber-700 border-amber-200",
  "Settings": "bg-zinc-100 text-zinc-600 border-zinc-200",
  "Dashboard": "bg-emerald-50 text-emerald-700 border-emerald-200",
};
function moduleColor(mod: string) {
  return moduleColors[mod] || "bg-zinc-100 text-zinc-600 border-zinc-200";
}

function FeatureCard({ doc, sowId }: { doc: SOWFeatureDoc; sowId: string }) {
  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (doc.shareToken) {
      navigator.clipboard.writeText(`${window.location.origin}/sow/features/share/${doc.shareToken}`);
      message.success("Share link copied!");
    }
  };

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl hover:border-zinc-200 hover:shadow-md transition-all duration-200 group">
      <Link href={`${APP_ROUTES.sow}/${sowId}/features/${doc.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              {doc.featureCode && (
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">{doc.featureCode}</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors leading-snug">
              {doc.featureName}
            </h3>
          </div>
          <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 ${moduleColor(doc.featureModule)}`}>
            {doc.subFeatures?.length ?? 0} features
          </span>
        </div>
        {/* Sub-feature codes */}
        {doc.subFeatures && doc.subFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {doc.subFeatures.map((sf, i) => (
              <span key={i} className="text-[10px] font-mono text-zinc-500 bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5">
                {sf.code || sf.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Clock className="w-3 h-3" />
            {formatDate(doc.updatedAt)}
          </span>
          <div className="flex items-center gap-1.5">
            {doc.shareToken && (
              <button
                onClick={handleCopyLink}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 rounded-lg px-2 py-1"
              >
                <Copy className="w-3 h-3" /> Share
              </button>
            )}
            <span className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700">
              <ExternalLink className="w-3 h-3" /> Open
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function SOWDetailPage() {
  const { sowId } = useParams() as { sowId: string };
  const dispatch = useAppDispatch();
  const router = useRouter();
  const sow = useAppSelector(selectCurrentSOW);
  const isLoading = useAppSelector(selectSOWLoading);
  const isGenerating = useAppSelector(selectSOWIsGenerating);
  const generatingFeatures = useAppSelector(selectSOWGeneratingFeatures);
  const featureDocs = useAppSelector(selectSOWFeatureDocs);
  const extractorDone = useAppSelector(selectSOWExtractorDone);

  const [generationDone, setGenerationDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    dispatch(fetchSOWDetailRequest(sowId));
    dispatch(clearGeneration());

    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const jobId = urlParams?.get("jobId");

    if (urlParams?.get("generating") === "true" && jobId) {
      const token = storage.getAccessToken();
      const url = `${API_BASE_URL}/api/v1/sow/jobs/${jobId}/stream${token ? `?token=${token}` : ""}`;
      dispatch(setGenerating(true));

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          const { type, data } = payload;

          if (type === "agent_token") {
            dispatch(appendExtractorToken(data.token));
          } else if (type === "agent_complete" && data.agentName === "feature_extractor") {
            dispatch(extractorComplete());
          } else if (type === "features_found") {
            dispatch(featuresFound(data.modules || []));
          } else if (type === "feature_start") {
            dispatch(featureStart({
              featureId: data.featureId,
              featureName: data.featureName,
              featureModule: data.featureModule || "",
              featureCode: data.featureCode || undefined,
              subFeatureCount: data.subFeatureCount ?? 0,
              order: data.order,
            }));
          } else if (type === "feature_token") {
            dispatch(appendFeatureToken({ featureId: data.featureId, token: data.token }));
          } else if (type === "feature_done") {
            dispatch(featureDone({ featureId: data.featureId, shareToken: data.shareToken }));
          } else if (type === "feature_error") {
            dispatch(featureError({ featureId: data.featureId }));
          } else if (type === "done") {
            es.close();
            dispatch(setGenerating(false));
            setGenerationDone(true);
            dispatch(fetchSOWDetailRequest(sowId));
            dispatch(fetchFeatureDocsRequest(sowId));
            message.success(`Analysis complete! ${data.featureCount} feature documents generated.`);
            router.replace(`${APP_ROUTES.sow}/${sowId}`);
          } else if (type === "error") {
            es.close();
            dispatch(setGenerating(false));
            message.error("Analysis failed: " + (data.message || "Unknown error"));
          }
        } catch { /* ignore */ }
      };

      es.onerror = () => {
        es.close();
        dispatch(setGenerating(false));
      };

      return () => { es.close(); };
    }
  }, [sowId, dispatch]); // eslint-disable-line

  useEffect(() => {
    if (sow?.status === "completed") {
      dispatch(fetchFeatureDocsRequest(sowId));
    }
  }, [sow?.status, sowId, dispatch]); // eslint-disable-line

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete Analysis",
      content: `Delete "${sow?.name}" and all its feature documents? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        const token = storage.getAccessToken();
        await fetch(`${API_BASE_URL}/api/v1/sow/${sowId}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        dispatch(fetchSOWsRequest());
        router.replace(APP_ROUTES.sow);
      },
    });
  };

  // ── Generating overlay ────────────────────────────────────────────────────
  if (isGenerating || (generatingFeatures.length > 0 && !generationDone)) {
    const completedCount = generatingFeatures.filter((f) => f.status === "completed").length;
    const totalCount = generatingFeatures.length;

    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="mb-6">
          <Link href={APP_ROUTES.sow} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to SOW Analyzer
          </Link>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <FileSearch className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                {!extractorDone ? "Identifying Features..." : `Analysing ${totalCount} Features`}
              </h2>
              <p className="text-xs text-zinc-500">
                {!extractorDone
                  ? "Reading your document to discover all features..."
                  : totalCount > 0
                    ? `${completedCount} of ${totalCount} feature documents complete`
                    : "Starting feature analysis..."}
              </p>
            </div>
          </div>

          {/* Extractor stage */}
          {!extractorDone && (
            <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-4">
              <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-xs font-semibold text-zinc-700">Feature Extractor — identifying modules...</p>
            </div>
          )}

          {extractorDone && totalCount > 0 && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs font-semibold text-emerald-800">
                Found {totalCount} module{totalCount !== 1 ? "s" : ""} — generating documents...
              </p>
            </div>
          )}

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mb-5">
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1.5">
                <span>{completedCount} done</span>
                <span>{totalCount - completedCount} remaining</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-800 rounded-full transition-all duration-500"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Feature list */}
          {generatingFeatures.length > 0 && (
            <div className="space-y-2">
              {generatingFeatures.map((f, idx) => (
                <div key={f.id || idx} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
                  f.status === "completed" ? "bg-emerald-50 border-emerald-200" :
                  f.status === "generating" ? "bg-zinc-50 border-zinc-300" :
                  f.status === "failed" ? "bg-red-50 border-red-200" :
                  "bg-zinc-50 border-zinc-100"
                }`}>
                  <div className="shrink-0">
                    {f.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : f.status === "generating" ? (
                      <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                    ) : f.status === "failed" ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-xs font-semibold ${
                        f.status === "completed" ? "text-emerald-800" :
                        f.status === "generating" ? "text-zinc-800" :
                        f.status === "failed" ? "text-red-700" : "text-zinc-400"
                      }`}>{f.featureName}</p>
                      {f.featureCode && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">{f.featureCode}</span>
                      )}
                    </div>
                    {f.subFeatureCount > 0 && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">{f.subFeatureCount} sub-feature{f.subFeatureCount !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  {f.status === "completed" && f.shareToken && (
                    <Link
                      href={`${APP_ROUTES.sow}/${sowId}/features/${f.id}`}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading && !sow) {
    return <div className="flex justify-center items-center py-32"><Spin size="large" /></div>;
  }

  if (!sow) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <FileSearch className="w-16 h-16 mb-4 text-zinc-300" />
        <Typography.Text className="text-zinc-500">Analysis not found</Typography.Text>
      </div>
    );
  }

  const isCompleted = sow.status === "completed";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <div className="mb-4">
        <Link href={APP_ROUTES.sow} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to SOW Analyzer
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-zinc-900 truncate">{sow.name}</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center text-[10px] font-semibold border rounded-full px-2.5 py-0.5 shrink-0 ${
              isCompleted ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
              sow.status === "generating" ? "text-purple-700 bg-purple-50 border-purple-200" :
              sow.status === "failed" ? "text-red-600 bg-red-50 border-red-200" :
              "text-zinc-500 bg-zinc-100 border-zinc-200"
            }`}>
              {isCompleted ? `${sow.featureCount} Features` : sow.status === "generating" ? "Generating..." : sow.status === "failed" ? "Failed" : "Draft"}
            </span>
            {sow.clientName && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {sow.clientName}
              </span>
            )}
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(sow.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && sow.shareToken && (
            <Button
              icon={<Copy className="w-3.5 h-3.5" />}
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/sow/share/${sow.shareToken}`);
                message.success("Share link copied!");
              }}
            >
              Copy Share Link
            </Button>
          )}
          <Button
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            size="small"
            onClick={() => { dispatch(fetchSOWDetailRequest(sowId)); dispatch(fetchFeatureDocsRequest(sowId)); }}
          />
          <Button icon={<Trash2 className="w-3.5 h-3.5" />} size="small" danger onClick={handleDelete} />
        </div>
      </div>

      {/* Feature card grid — grouped by module */}
      {isCompleted && (
        <>
          {featureDocs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading feature documents...
            </div>
          ) : (() => {
            // Group by module, preserving insertion order
            const groups: Record<string, typeof featureDocs> = {};
            featureDocs.forEach((doc) => {
              const mod = doc.featureModule || "General";
              if (!groups[mod]) groups[mod] = [];
              groups[mod].push(doc);
            });
            return (
              <div className="space-y-8">
                {Object.entries(groups).map(([module, docs]) => (
                  <div key={module}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-[11px] font-bold uppercase tracking-wider border rounded-full px-3 py-1 ${moduleColor(module)}`}>
                        {module}
                      </span>
                      <span className="text-xs text-zinc-400">{docs.length} feature{docs.length !== 1 ? "s" : ""}</span>
                      <div className="flex-1 h-px bg-zinc-100" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {docs.map((doc) => (
                        <FeatureCard key={doc.id} doc={doc} sowId={sowId} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {sow.status === "failed" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-red-700 mb-1">Analysis failed</h3>
          <p className="text-sm text-red-500">Please try creating a new analysis with more detailed context or a clearer document.</p>
        </div>
      )}
    </div>
  );
}
