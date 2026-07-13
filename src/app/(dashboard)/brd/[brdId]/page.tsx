"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { Button, Tabs, Tag, Typography, Spin, message, Modal, Input, Select, Tooltip } from "antd";
import {
  Share2,
  Copy,
  BookText,
  Building2,
  Clock,
  RefreshCw,
  Pencil,
  Save,
  X,
  Lock,
  LockOpen,
  Trash2,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowLeft,
  Upload,
  History,
  RotateCcw,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import { selectClients, selectClientsMeta } from "@/store/modules/clients/clientsSelectors";
import { fetchLeadsRequest } from "@/store/modules/leads/leadsSlice";
import { selectLeads, selectLeadsMeta } from "@/store/modules/leads/leadsSelectors";
import {
  fetchBRDDetailRequest,
  fetchJobDetailRequest,
  updateAgentRun,
  appendAgentToken,
  setGenerating,
  clearGeneration,
} from "@/store/modules/brd/brdSlice";
import {
  selectCurrentBRD,
  selectCurrentJob,
  selectAgentRuns,
  selectAgentStream,
  selectIsGenerating,
  selectBRDLoading,
} from "@/store/modules/brd/brdSelectors";
import { BRDAgentExecutionPanel } from "@/components/features/BRD/BRDAgentExecutionPanel";
import { BRDContentEditor } from "@/components/features/BRD/BRDContentEditor";
import { SmartContentRenderer } from "@/components/features/BRD/SmartContentRenderer";
import { storage } from "@/lib/utils/storage";
import type { BRDAgentRun } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const AGENT_ORDER = [
  "business_context",
  "requirements_analyst",
  "process_workflow_analyst",
  "nfr_compliance_analyst",
  "validation_gap_analyst",
  "composer",
  "quality_validator",
  "brd_improver",
];

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  business_context: "Business Context Analyst",
  requirements_analyst: "Business Requirements Analyst",
  process_workflow_analyst: "Process & Workflow Analyst",
  nfr_compliance_analyst: "Non-Functional & Compliance Analyst",
  validation_gap_analyst: "Validation & Gap Analyst",
  composer: "BRD Composer",
  quality_validator: "Quality Validator",
  brd_improver: "BRD Improver",
};

// Internal documents — never shared with the client
const WORKSPACE_FILES = [
  { key: "quality-report", label: "Quality Report", file: "quality-report.md" },
  { key: "brd-draft", label: "Draft BRD", file: "brd.md" },
  { key: "business-context", label: "Business Context", file: "business-context.md" },
  { key: "business-requirements", label: "Requirements", file: "business-requirements.md" },
  { key: "process-workflow", label: "Processes & Workflows", file: "process-workflow.md" },
  { key: "nfr-compliance", label: "NFR & Compliance", file: "nfr-compliance.md" },
  { key: "validation-gap", label: "Validation & Gaps", file: "validation-gap.md" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Inline edit toolbar ──────────────────────────────────────────────────────

function EditToolbar({
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onPreview,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onPreview?: () => void;  // simple no-arg callback — caller reads state directly
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {onPreview && (
          <Button size="small" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => onPreview()}>
            Preview
          </Button>
        )}
        <Button size="small" icon={<X className="w-3.5 h-3.5" />} onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          icon={
            isSaving
              ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-3.5 h-3.5" />
          }
          onClick={onSave}
          loading={isSaving}
          className="!bg-black"
        >
          Save
        </Button>
      </div>
    );
  }
  return (
    <Button size="small" icon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit}>
      Edit
    </Button>
  );
}

// ─── Document panel (view or edit) ───────────────────────────────────────────

function DocumentPanel({
  file,
  label,
  content,
  editingFile,
  editContent,
  isSaving,
  onStartEdit,
  onSave,
  onCancelEdit,
  onEditChange,
  onPreview,
}: {
  file: string;
  label: string;
  content: string;
  editingFile: string | null;
  editContent: string;
  isSaving: boolean;
  onStartEdit: (file: string, content: string) => void;
  onSave: (file: string) => void;
  onCancelEdit: () => void;
  onEditChange: (v: string) => void;
  onPreview?: () => void;  // no-arg — the page closes over editContent directly
}) {
  const isEditing = editingFile === file;

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <Typography.Text className="text-xs text-zinc-400">
          {isEditing ? "Editing" : label}
        </Typography.Text>
        <EditToolbar
          isEditing={isEditing}
          isSaving={isSaving}
          onEdit={() => onStartEdit(file, content)}
          onSave={() => onSave(file)}
          onCancel={onCancelEdit}
          onPreview={onPreview}
        />
      </div>
      {isEditing ? (
        <BRDContentEditor content={editContent} onChange={onEditChange} disabled={isSaving} />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <SmartContentRenderer content={content} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BRDDetailPage() {
  const { brdId } = useParams() as { brdId: string };
  const dispatch = useAppDispatch();
  const brd = useAppSelector(selectCurrentBRD);
  const job = useAppSelector(selectCurrentJob);
  const agentRuns = useAppSelector(selectAgentRuns);
  const agentStream = useAppSelector(selectAgentStream);
  const isGenerating = useAppSelector(selectIsGenerating);
  const isLoading = useAppSelector(selectBRDLoading);
  const clients = useAppSelector(selectClients);
  const clientsMeta = useAppSelector(selectClientsMeta);
  const leads = useAppSelector(selectLeads);
  const leadsMeta = useAppSelector(selectLeadsMeta);
  const allAccounts = [
    ...leads
      .filter((l) => l.lifecycleStage !== "client")
      .map((l) => ({ id: l.id, companyName: l.companyName, isLead: true })),
    ...clients.map((c) => ({ id: c.id, companyName: c.companyName, isLead: false })),
  ];
  const accountsLoading = clientsMeta.isLoading || leadsMeta.isLoading;
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  // Edit state (shared between primary view and workspace)
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [localContent, setLocalContent] = useState<Record<string, string>>({});

  // Password state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Page-level section tab
  const [pageTab, setPageTab] = useState<"brd" | "workspace" | "history">("brd");
  const [workspaceTab, setWorkspaceTab] = useState("quality-report");

  // Cover metadata edit state
  const [meta, setMeta] = useState({ clientId: "", preparedBy: "", documentDate: "", documentVersion: "" });
  const [savingMeta, setSavingMeta] = useState(false);

  // Versioning state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishBump, setPublishBump] = useState<"minor" | "major">("minor");
  const [publishNote, setPublishNote] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [versions, setVersions] = useState<import("@/types/models/BRD").BRDVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<import("@/types/models/BRD").BRDVersion | null>(null);
  // For edit-mode preview (shows current editContent in full-screen)
  const [editPreview, setEditPreview] = useState<{ content: string; label: string } | null>(null);
  // Tracks if user loaded an old version into the editor (client-only, no server write until Save)
  const [editingFromVersion, setEditingFromVersion] = useState<string | null>(null); // version label

  // ── Edit handlers ────────────────────────────────────────────────────────────

  const handleStartEdit = (file: string, content: string) => {
    setEditingFile(file);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditContent("");
  };

  const handleSave = async (fileName: string) => {
    setIsSaving(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.brd.updateContent(brdId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ file_name: fileName, content: editContent }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLocalContent((prev) => ({ ...prev, [fileName]: editContent }));
      setEditingFile(null);
      setEditContent("");
      message.success("Saved successfully");
    } catch {
      message.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Cover metadata ───────────────────────────────────────────────────────────

  const handleSaveMeta = async () => {
    setSavingMeta(true);
    try {
      const token = storage.getAccessToken();
      await fetch(`${API_BASE_URL}${API_ENDPOINTS.brd.updateMetadata(brdId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          client_id: meta.clientId || null,
          client_name: meta.clientId
            ? (allAccounts.find((a) => a.id === meta.clientId)?.companyName ?? null)
            : null,
          prepared_by: meta.preparedBy || null,
          document_date: meta.documentDate || null,
          document_version: meta.documentVersion || "1.0",
        }),
      });
      message.success("Cover updated");
    } catch {
      message.error("Failed to save");
    } finally {
      setSavingMeta(false);
    }
  };

  // ── Versioning ───────────────────────────────────────────────────────────────

  const computeNextLabel = () => {
    const label = brd?.publishedVersionLabel || "";
    if (!label) return "1.0";
    const [maj, min] = label.split(".").map(Number);
    return publishBump === "major" ? `${maj + 1}.0` : `${maj}.${min + 1}`;
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.brd.publish(brdId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ bump: publishBump, note: publishNote || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to publish");
      message.success(`Published as v${json.data.label}`);
      setPublishModalOpen(false);
      setPublishNote("");
      dispatch(fetchBRDDetailRequest(brdId));
      // Refresh version list if open
      if (pageTab === "history") loadVersions();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const loadVersions = async () => {
    setLoadingVersions(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.brd.versions(brdId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setVersions(json.data || []);
      }
    } catch { /* silent */ } finally {
      setLoadingVersions(false);
    }
  };

  // Load old version content into the editor CLIENT-SIDE ONLY.
  // The server draft is NOT touched until the user explicitly clicks Save.
  // User can always "Return to latest draft" (clear localContent) to undo.
  const handleEditFromVersion = (v: import("@/types/models/BRD").BRDVersion) => {
    setLocalContent(v.content); // override display with old version's files
    setEditingFromVersion(v.label);
    setPreviewVersion(null);
    setPageTab("brd");
    message.info(`Loaded v${v.label} into editor. Click Save to commit, or "Return to draft" to undo.`, 5);
  };

  const handleReturnToLatestDraft = () => {
    setLocalContent({});   // clear overrides — server's brd.ai_content is shown
    setEditingFromVersion(null);
    if (editingFile) handleCancelEdit();
  };

  // ── Password handlers ────────────────────────────────────────────────────────

  const handleSetPassword = async (remove = false) => {
    setSavingPassword(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.brd.setPassword(brdId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ password: remove ? null : newPassword }),
        }
      );
      if (!res.ok) throw new Error();
      setIsPasswordProtected(!remove);
      setPasswordModalOpen(false);
      setNewPassword("");
      message.success(remove ? "Password removed" : "Password set successfully");
    } catch {
      message.error("Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete BRD",
      content: `Delete "${brd?.name}"? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = storage.getAccessToken();
          const res = await fetch(
            `${API_BASE_URL}${API_ENDPOINTS.brd.delete(brdId)}`,
            {
              method: "DELETE",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          if (!res.ok) throw new Error();
          message.success("BRD deleted");
          router.replace("/brd");
        } catch {
          message.error("Failed to delete BRD");
        }
      },
    });
  };

  // ── SSE ──────────────────────────────────────────────────────────────────────

  const startSSE = useCallback(
    (jobId: string) => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      const token = storage.getAccessToken();
      const url = `${API_BASE_URL}/api/v1/brd/jobs/${jobId}/stream${token ? `?token=${token}` : ""}`;

      dispatch(setGenerating(true));
      AGENT_ORDER.forEach((agentName) =>
        dispatch(updateAgentRun({ agentName, status: "pending" }))
      );

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (ev) => {
        try {
          const { type, data } = JSON.parse(ev.data);
          if (type === "agent_start") {
            dispatch(updateAgentRun({ agentName: data.agentName, status: "running" }));
          } else if (type === "agent_token") {
            dispatch(appendAgentToken({ agentName: data.agentName, token: data.token }));
          } else if (type === "agent_complete") {
            dispatch(updateAgentRun({ agentName: data.agentName, status: "completed", content: agentStream[data.agentName] || "" }));
          } else if (type === "agent_error") {
            dispatch(updateAgentRun({ agentName: data.agentName, status: "failed" }));
          } else if (type === "done" || type === "error") {
            dispatch(setGenerating(false));
            es.close();
            dispatch(fetchBRDDetailRequest(brdId));
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        dispatch(setGenerating(false));
        es.close();
        dispatch(fetchBRDDetailRequest(brdId));
      };
    },
    [dispatch, brdId, agentStream]
  );

  useEffect(() => {
    dispatch(clearGeneration());
    dispatch(fetchBRDDetailRequest(brdId));
    dispatch(fetchClientsRequest({ limit: 200 }));
    dispatch(fetchLeadsRequest({ limit: 200 }));
  }, [brdId, dispatch]);

  useEffect(() => {
    if (brd) {
      setIsPasswordProtected(!!brd.isPasswordProtected);
      setMeta({
        clientId: brd.clientId ?? "",
        preparedBy: brd.preparedBy ?? "",
        documentDate: brd.documentDate ?? "",
        documentVersion: brd.documentVersion ?? "1.0",
      });
    }
  }, [brd?.id]); // eslint-disable-line

  useEffect(() => {
    if (!brd) return;
    if (brd.status === "generating" && brd.brdJobId) {
      dispatch(fetchJobDetailRequest(brd.brdJobId));
      startSSE(brd.brdJobId);
    } else if (brd.status === "completed" && brd.brdJobId && !job) {
      dispatch(fetchJobDetailRequest(brd.brdJobId));
    }
    return () => { eventSourceRef.current?.close(); };
  }, [brd?.id, brd?.status]); // eslint-disable-line

  const handleCopyShareLink = () => {
    if (!brd?.shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/brd/share/${brd.shareToken}`);
    message.success("Share link copied to clipboard!");
  };

  // ── Derived values ───────────────────────────────────────────────────────────

  const displayAgents: BRDAgentRun[] = agentRuns.length > 0
    ? agentRuns
    : AGENT_ORDER.map((name, idx) => ({
        id: name,
        agentName: name,
        displayName: AGENT_DISPLAY_NAMES[name] || name,
        status: "pending" as const,
        order: idx,
      }));

  const aiContent = { ...(brd?.aiContent || {}), ...localContent };
  // Primary document: prefer the quality-improved version, fall back to composer draft
  const primaryContent = aiContent["improved-brd.md"] || aiContent["brd.md"] || "";
  const primaryFile = aiContent["improved-brd.md"] ? "improved-brd.md" : "brd.md";

  const isRunning = brd?.status === "generating" || isGenerating;
  const isCompleted = brd?.status === "completed";

  // ── Loading / not found ──────────────────────────────────────────────────────

  if (isLoading && !brd) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spin size="large" />
      </div>
    );
  }

  if (!brd) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <BookText className="w-16 h-16 mb-4 text-zinc-300" />
        <Typography.Text className="text-zinc-500">BRD not found</Typography.Text>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Back link ── */}
      <div className="mb-4">
        <Link
          href={APP_ROUTES.brd}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to BRD Studio
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900 truncate">{brd.name}</h1>
            <Tag
              color={isRunning ? "processing" : isCompleted ? "green" : brd.status === "failed" ? "red" : "default"}
              className="!rounded-full shrink-0"
            >
              {isRunning ? "Generating..." : isCompleted ? "Completed" : brd.status}
            </Tag>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
            {brd.clientName && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {brd.clientName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(brd.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && (
            <>
              {/* Publish button */}
              <Button
                icon={<Upload className="w-3.5 h-3.5" />}
                size="small"
                type="primary"
                className="!bg-zinc-900"
                onClick={() => { setPublishBump("minor"); setPublishModalOpen(true); }}
              >
                {brd.publishedVersionLabel ? `Publish (v${brd.publishedVersionLabel})` : "Publish"}
              </Button>

              {/* Share buttons — gated on first publish */}
              <Tooltip title={!brd.publishedVersionLabel ? "Publish first to enable sharing" : ""}>
                <Button
                  icon={<Copy className="w-3.5 h-3.5" />}
                  size="small"
                  onClick={handleCopyShareLink}
                  disabled={!brd.publishedVersionLabel}
                >
                  Copy Share Link
                </Button>
              </Tooltip>
              <Tooltip title={!brd.publishedVersionLabel ? "Publish first to enable sharing" : ""}>
                <Button
                  icon={<Share2 className="w-3.5 h-3.5" />}
                  size="small"
                  href={brd.publishedVersionLabel ? `/brd/share/${brd.shareToken}` : undefined}
                  target="_blank"
                  disabled={!brd.publishedVersionLabel}
                >
                  Open Share View
                </Button>
              </Tooltip>

              {isPasswordProtected ? (
                <Button icon={<LockOpen className="w-3.5 h-3.5" />} size="small" danger onClick={() => handleSetPassword(true)} loading={savingPassword}>
                  Remove Password
                </Button>
              ) : (
                <Button icon={<Lock className="w-3.5 h-3.5" />} size="small" onClick={() => setPasswordModalOpen(true)}>
                  Set Password
                </Button>
              )}
            </>
          )}
          <Button icon={<RefreshCw className="w-3.5 h-3.5" />} size="small" onClick={() => dispatch(fetchBRDDetailRequest(brdId))} />
          <Button icon={<Trash2 className="w-3.5 h-3.5" />} size="small" danger onClick={handleDelete} />
        </div>

        {/* Publish modal */}
        <Modal
          title="Publish BRD"
          open={publishModalOpen}
          onCancel={() => { setPublishModalOpen(false); setPublishNote(""); }}
          onOk={handlePublish}
          okText={`Publish as v${computeNextLabel()}`}
          confirmLoading={publishing}
          okButtonProps={{ className: "!bg-zinc-900" }}
        >
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Version type</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPublishBump("minor")}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm transition-colors text-left ${
                    publishBump === "minor" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <p className="font-semibold">Minor update</p>
                  <p className={`text-xs mt-0.5 ${publishBump === "minor" ? "text-zinc-300" : "text-zinc-400"}`}>
                    Small corrections, clarifications
                    {brd?.publishedVersionLabel && ` · ${brd.publishedVersionLabel.split(".")[0]}.${parseInt(brd.publishedVersionLabel.split(".")[1]) + 1}`}
                  </p>
                </button>
                <button
                  onClick={() => setPublishBump("major")}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm transition-colors text-left ${
                    publishBump === "major" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <p className="font-semibold">Major release</p>
                  <p className={`text-xs mt-0.5 ${publishBump === "major" ? "text-zinc-300" : "text-zinc-400"}`}>
                    Significant changes, milestones
                    {brd?.publishedVersionLabel && ` · ${parseInt(brd.publishedVersionLabel.split(".")[0]) + 1}.0`}
                  </p>
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Version note <span className="text-zinc-300 font-normal normal-case">(optional)</span></p>
              <Input.TextArea
                value={publishNote}
                onChange={(e) => setPublishNote(e.target.value)}
                placeholder="e.g. Added NFR section, updated stakeholder list"
                rows={2}
              />
            </div>
            <p className="text-xs text-zinc-400 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
              The share link will immediately show <strong>v{computeNextLabel()}</strong>. Your draft will remain editable for future changes.
            </p>
          </div>
        </Modal>

        {/* Password modal */}
        <Modal
          title="Set Share Password"
          open={passwordModalOpen}
          onCancel={() => { setPasswordModalOpen(false); setNewPassword(""); }}
          onOk={() => handleSetPassword(false)}
          okText="Set Password"
          confirmLoading={savingPassword}
          okButtonProps={{ disabled: newPassword.length < 4 }}
        >
          <p className="text-sm text-zinc-500 mb-4">
            Anyone opening the share link will need to enter this password before viewing the document.
          </p>
          <Input.Password
            placeholder="Enter a password (min 4 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onPressEnter={() => newPassword.length >= 4 && handleSetPassword(false)}
            autoFocus
          />
        </Modal>
      </div>

      {/* ── Section tab bar ── */}
      {isCompleted && !isRunning && (
        <div className="flex gap-1 mb-6 border-b border-zinc-200 pb-0">
          {[
            { key: "brd", label: "Final BRD", icon: null, badge: "Client-facing" },
            { key: "workspace", label: "Internal Workspace", icon: null, badge: null },
            { key: "history", label: "Version History", icon: null, badge: brd.publishedVersionLabel ? `v${brd.publishedVersionLabel} live` : null },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                if (editingFile) handleCancelEdit();
                setPageTab(t.key as "brd" | "workspace" | "history");
                if (t.key === "history" && versions.length === 0) loadVersions();
              }}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                pageTab === t.key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {t.label}
              {t.key === "brd" && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-1.5 py-0.5">
                  Client
                </span>
              )}
              {t.badge && t.key !== "brd" && (
                <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-100 rounded-full px-1.5 py-0.5">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Editing-from-version banner ── */}
      {editingFromVersion && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <History className="w-4 h-4 shrink-0" />
            <span>Editing a copy of <strong>v{editingFromVersion}</strong>. Changes are not saved until you click Save.</span>
          </div>
          <button
            onClick={handleReturnToLatestDraft}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline shrink-0 ml-4"
          >
            Return to latest draft
          </button>
        </div>
      )}

      {/* ── Generation in progress ── */}
      {isRunning && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Typography.Text className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
              Agent Pipeline
            </Typography.Text>
            <BRDAgentExecutionPanel agents={displayAgents} currentStream={agentStream} />
          </div>
          <div>
            <Typography.Text className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
              Live Output
            </Typography.Text>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 h-[500px] overflow-y-auto">
              {Object.entries(agentStream).map(([agentName, content]) => (
                <div key={agentName} className="mb-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    {AGENT_DISPLAY_NAMES[agentName] || agentName}
                  </p>
                  <p className="text-xs text-zinc-600 font-mono whitespace-pre-wrap leading-relaxed">
                    {content.slice(-2000)}
                  </p>
                </div>
              ))}
              {Object.keys(agentStream).length === 0 && (
                <div className="flex items-center justify-center h-full text-center text-zinc-400">
                  <div>
                    <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Waiting for agents to start...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cover metadata + Final BRD (shown only on "brd" tab) ── */}
      {isCompleted && pageTab === "brd" && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Document Cover</p>
            <Button
              size="small"
              icon={savingMeta ? <div className="w-3 h-3 border border-zinc-400 border-t-zinc-900 rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
              onClick={handleSaveMeta}
              loading={savingMeta}
            >
              Save Cover
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Prepared For (Client)
              </label>
              <Select
                value={meta.clientId || undefined}
                onChange={(val) => setMeta((m) => ({ ...m, clientId: val ?? "" }))}
                onBlur={handleSaveMeta}
                placeholder="Select client"
                allowClear
                showSearch
                style={{ width: "100%" }}
                loading={accountsLoading}
                filterOption={(input, option) =>
                  (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={allAccounts.map((a) => ({
                  value: a.id,
                  label: a.isLead ? `${a.companyName} (Lead)` : a.companyName,
                }))}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Prepared By
              </label>
              <input
                type="text"
                value={meta.preparedBy}
                onChange={(e) => setMeta((m) => ({ ...m, preparedBy: e.target.value }))}
                onBlur={handleSaveMeta}
                placeholder="e.g. Appmotiv Technologies"
                className="w-full border border-zinc-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Document Date
              </label>
              <input
                type="text"
                value={meta.documentDate}
                onChange={(e) => setMeta((m) => ({ ...m, documentDate: e.target.value }))}
                onBlur={handleSaveMeta}
                placeholder="e.g. June 28, 2026"
                className="w-full border border-zinc-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Version
              </label>
              <input
                type="text"
                value={meta.documentVersion}
                onChange={(e) => setMeta((m) => ({ ...m, documentVersion: e.target.value }))}
                onBlur={handleSaveMeta}
                placeholder="e.g. 1.0"
                className="w-full border border-zinc-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3">
            These fields appear on the shared document cover page. Changes save automatically on blur.
          </p>
        </div>
      )}

      {/* ── Primary view: Final BRD ── */}
      {!isRunning && isCompleted && primaryContent && pageTab === "brd" && (
        <DocumentPanel
          file={primaryFile}
          label="Final BRD"
          content={primaryContent}
          editingFile={editingFile}
          editContent={editContent}
          isSaving={isSaving}
          onStartEdit={handleStartEdit}
          onSave={handleSave}
          onCancelEdit={handleCancelEdit}
          onEditChange={setEditContent}
          onPreview={() => setEditPreview({ content: editContent, label: "Final BRD" })}
        />
      )}

      {/* ── Failed state ── */}
      {!isRunning && brd.status === "failed" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <BookText className="w-6 h-6 text-red-500" />
          </div>
          <Typography.Text className="text-zinc-600 block mb-2">BRD generation failed.</Typography.Text>
          <Typography.Text className="text-zinc-400 text-sm">Check the agent logs for details.</Typography.Text>
        </div>
      )}

      {/* ── Pending (not yet generated) ── */}
      {!isRunning && !isCompleted && brd.status !== "failed" && (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      )}

      {/* ── Internal Workspace tab ── */}
      {isCompleted && !isRunning && pageTab === "workspace" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Internal Workspace</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <ShieldAlert className="w-3 h-3" />
              Not shared with client
            </span>
          </div>
          <Tabs
            activeKey={workspaceTab}
            onChange={(key) => {
              if (editingFile) handleCancelEdit();
              setWorkspaceTab(key);
            }}
            items={WORKSPACE_FILES
              .filter((f) => aiContent[f.file])
              .map((f) => ({
                key: f.key,
                label: f.label,
                children: (
                  <div className="pt-3">
                    <DocumentPanel
                      file={f.file}
                      label={f.label}
                      content={aiContent[f.file] || ""}
                      editingFile={editingFile}
                      editContent={editContent}
                      isSaving={isSaving}
                      onStartEdit={handleStartEdit}
                      onSave={handleSave}
                      onCancelEdit={handleCancelEdit}
                      onEditChange={setEditContent}
                      onPreview={() => setEditPreview({ content: editContent, label: f.label })}
                    />
                  </div>
                ),
              }))}
          />
        </div>
      )}

      {/* ── Version History tab ── */}
      {isCompleted && !isRunning && pageTab === "history" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Version History</span>
            </div>
            {!brd.publishedVersionLabel && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                Not published yet — click Publish to create v1.0
              </span>
            )}
          </div>

          {/* Version list — full width, clean table */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            {/* Current Draft row */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-blue-50/30">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-zinc-800">Current Draft</span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">Working copy</span>
                  {editingFromVersion && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      Loaded from v{editingFromVersion}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">Your current edits — not published until you click Publish</p>
              </div>
              <Button
                size="small"
                icon={<Eye className="w-3 h-3" />}
                onClick={() => setPreviewVersion({ id: "__draft__", label: "Draft", content: aiContent, coverMetadata: {}, publishedBy: "", publishedAt: "", major: 0, minor: 0, brdId } as any)}
              >
                Preview
              </Button>
            </div>

            {loadingVersions ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-10 text-zinc-400">
                <p className="text-sm">No published versions yet. Click <strong>Publish</strong> to create v1.0.</p>
              </div>
            ) : (
              versions.map((v) => {
                const isCurrent = v.id === brd.publishedVersionId;
                return (
                  <div key={v.id} className={`flex items-center justify-between px-5 py-4 border-b border-zinc-50 last:border-0 ${isCurrent ? "bg-emerald-50/30" : "hover:bg-zinc-50"} transition-colors`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-sm font-bold tabular-nums ${isCurrent ? "text-emerald-700" : "text-zinc-800"}`}>
                          v{v.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                            Live on share link
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {new Date(v.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}
                        {new Date(v.publishedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        {v.note && <span className="ml-2 text-zinc-500 italic">"{v.note}"</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Button
                        size="small"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => setPreviewVersion(v)}
                      >
                        Preview
                      </Button>
                      <Button
                        size="small"
                        icon={<Pencil className="w-3 h-3" />}
                        onClick={() => handleEditFromVersion(v)}
                      >
                        Edit from this
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Agent run summary ── */}
      {isCompleted && displayAgents.length > 0 && (
        <div className="mt-8">
          <Typography.Text className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
            Agent Summary
          </Typography.Text>
          <BRDAgentExecutionPanel agents={displayAgents} currentStream={{}} />
        </div>
      )}

      {/* Portaled overlays — rendered at document.body to escape stacking context */}
      {editPreview && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-bold text-zinc-900">Preview — {editPreview.label}</span>
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Unsaved changes</span>
            </div>
            <button onClick={() => setEditPreview(null)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg px-3 py-1.5 transition-colors">
              <X className="w-4 h-4" /> Back to editing
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-zinc-50">
            <div className="max-w-4xl mx-auto px-6 py-10">
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12">
                <SmartContentRenderer content={editPreview.content} />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {previewVersion && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <History className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-bold text-zinc-900">
                {(previewVersion as any).id === "__draft__" ? "Current Draft" : `Version v${previewVersion.label}`}
              </span>
              {previewVersion.id === brd.publishedVersionId && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Live on share link</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(previewVersion as any).id !== "__draft__" && (
                <Button icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { handleEditFromVersion(previewVersion as any); setPreviewVersion(null); }}>
                  Edit from this version
                </Button>
              )}
              <button onClick={() => setPreviewVersion(null)} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg px-3 py-1.5 transition-colors">
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-zinc-50">
            <div className="max-w-4xl mx-auto px-6 py-10">
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12">
                <SmartContentRenderer
                  content={
                    (previewVersion as any).id === "__draft__"
                      ? primaryContent
                      : (previewVersion.content["improved-brd.md"] || previewVersion.content["brd.md"] || "")
                  }
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
