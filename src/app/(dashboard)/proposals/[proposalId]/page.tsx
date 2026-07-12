"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Modal,
  Select,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowLeft,
  Building2,
  Clock,
  Copy,
  Eye,
  FileText,
  History,
  Lock,
  LockOpen,
  Pencil,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/constants/appConstants";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { storage } from "@/lib/utils/storage";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  appendAgentToken,
  clearGeneration,
  fetchJobDetailRequest,
  fetchProposalDetailRequest,
  setGenerating,
  updateAgentRun,
} from "@/store/modules/proposals/proposalsSlice";
import {
  selectAgentRuns,
  selectAgentStream,
  selectCurrentJob,
  selectCurrentProposal,
  selectIsGenerating,
  selectProposalsLoading,
} from "@/store/modules/proposals/proposalsSelectors";
import { ProposalAgentExecutionPanel } from "@/components/features/Proposals/ProposalAgentExecutionPanel";
import { BRDContentEditor } from "@/components/features/BRD/BRDContentEditor";
import { SmartContentRenderer } from "@/components/features/BRD/SmartContentRenderer";
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import {
  selectClients,
  selectClientsMeta,
} from "@/store/modules/clients/clientsSelectors";

import type { ProposalAgentRun, ProposalVersion } from "@/types/models/Proposal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Pipeline reference ─────────────────────────────────────────────────

const AGENT_ORDER = [
  "business_context",
  "solution_architect",
  "estimator",
  "commercial",
  "project_manager",
  "composer",
  "quality_validator",
  "improver",
];

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  business_context: "Business Context Analyst",
  solution_architect: "Solution Architect",
  estimator: "Effort Estimator",
  commercial: "Commercial Strategist",
  project_manager: "Project Manager",
  composer: "Proposal Composer",
  quality_validator: "Quality Validator",
  improver: "Proposal Improver",
};

// Workspace tabs — every non-final agent output the user can inspect.
const WORKSPACE_FILES = [
  { key: "quality-report", label: "Quality Report", file: "quality-report.md" },
  { key: "proposal-draft", label: "Draft Proposal", file: "proposal.md" },
  { key: "business-context", label: "Business Context", file: "business-context.md" },
  { key: "solution-architecture", label: "Solution Architecture", file: "solution-architecture.md" },
  { key: "estimation", label: "Estimation", file: "estimation.md" },
  { key: "commercials", label: "Commercials", file: "commercials.md" },
  { key: "project-plan", label: "Project Plan", file: "project-plan.md" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Edit toolbar ──────────────────────────────────────────────────────

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
  // Optional — when supplied a Preview button appears while editing.
  // Callers close over ``editContent`` themselves; the toolbar just fires.
  onPreview?: () => void;
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {onPreview && (
          <Button
            size="small"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={onPreview}
          >
            Preview
          </Button>
        )}
        <Button
          size="small"
          icon={<X className="w-3.5 h-3.5" />}
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          icon={
            isSaving ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )
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
    <Button
      size="small"
      icon={<Pencil className="w-3.5 h-3.5" />}
      onClick={onEdit}
    >
      Edit
    </Button>
  );
}

// ── Document panel (view / edit) ──────────────────────────────────────

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
  // Optional — a Preview button shows while editing when supplied.
  onPreview?: () => void;
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
          onPreview={onPreview}
          onEdit={() => onStartEdit(file, content)}
          onSave={() => onSave(file)}
          onCancel={onCancelEdit}
        />
      </div>
      {isEditing ? (
        <BRDContentEditor
          content={editContent}
          onChange={onEditChange}
          disabled={isSaving}
        />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <SmartContentRenderer content={content} />
        </div>
      )}
    </div>
  );
}

// ── Commercial summary chip strip ─────────────────────────────────────

function CommercialSummary({
  paymentType,
  currency,
  equityPercentage,
  maxBudget,
  advancePercentage,
  maxTimelineWeeks,
}: {
  paymentType: string;
  currency: string;
  equityPercentage?: number | null;
  maxBudget?: number | null;
  advancePercentage?: number | null;
  maxTimelineWeeks?: number | null;
}) {
  // A compact strip of key/value chips so the reviewer sees at a glance
  // what commercial intent the pipeline was given.
  const chips = [
    {
      label: "Payment",
      value:
        paymentType === "cash_equity"
          ? `Cash + ${equityPercentage ?? 0}% equity`
          : "Fixed cost",
    },
    { label: "Currency", value: currency },
    maxBudget != null
      ? { label: "Max budget", value: `${maxBudget.toLocaleString()} ${currency}` }
      : null,
    advancePercentage != null
      ? { label: "Advance", value: `${advancePercentage}%` }
      : null,
    maxTimelineWeeks != null
      ? { label: "Max timeline", value: `${maxTimelineWeeks} wks` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map((c) => (
        <span
          key={c.label}
          className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1"
        >
          <span className="text-zinc-400">{c.label}:</span>
          <strong className="font-semibold text-zinc-800">{c.value}</strong>
        </span>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ProposalDetailPage() {
  const { proposalId } = useParams() as { proposalId: string };
  const dispatch = useAppDispatch();
  const router = useRouter();

  const proposal = useAppSelector(selectCurrentProposal);
  const job = useAppSelector(selectCurrentJob);
  const agentRuns = useAppSelector(selectAgentRuns);
  const agentStream = useAppSelector(selectAgentStream);
  const isGenerating = useAppSelector(selectIsGenerating);
  const isLoading = useAppSelector(selectProposalsLoading);
  const clients = useAppSelector(selectClients);
  const clientsMeta = useAppSelector(selectClientsMeta);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Edit state
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [localContent, setLocalContent] = useState<Record<string, string>>({});

  // Password state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Section tabs
  const [pageTab, setPageTab] = useState<"proposal" | "workspace" | "history">(
    "proposal",
  );
  const [workspaceTab, setWorkspaceTab] = useState("quality-report");

  // Cover metadata — mirrors BRD's Document Cover block. Kept in local
  // state and autosaved on blur so the user can tab through the four
  // fields without any explicit "Save" click.
  const [meta, setMeta] = useState({
    clientId: "",
    preparedBy: "",
    documentDate: "",
    documentVersion: "",
  });
  const [savingMeta, setSavingMeta] = useState(false);

  // Publish
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishBump, setPublishBump] = useState<"minor" | "major">("minor");
  const [publishNote, setPublishNote] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Version history
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Full-screen preview overlays. ``previewVersion`` handles both a
  // stored ProposalVersion and a synthetic "__draft__" pseudo-version
  // for previewing the live draft. ``editPreview`` shows the in-flight
  // ``editContent`` while the user is mid-edit — helpful for spotting
  // how the doc will look before saving.
  const [previewVersion, setPreviewVersion] = useState<ProposalVersion | null>(null);
  const [editPreview, setEditPreview] = useState<{ content: string; label: string } | null>(null);

  // When set, the editor was seeded from a published version — kept as
  // a **client-only** override in ``localContent``; the server draft is
  // untouched until the user explicitly clicks Save.
  const [editingFromVersion, setEditingFromVersion] = useState<string | null>(null);

  // ── Edit handlers ─────────────────────────────────────────────────

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
        `${API_BASE_URL}${API_ENDPOINTS.proposals.updateContent(proposalId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ fileName, content: editContent }),
        },
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

  // ── Cover metadata ────────────────────────────────────────────────

  const handleSaveMeta = async () => {
    // Called on every field's onBlur — a quick guard against duplicate
    // in-flight saves keeps us from stacking requests when the user tabs
    // through fields quickly.
    if (savingMeta) return;
    setSavingMeta(true);
    try {
      const token = storage.getAccessToken();
      // Backend uses ``CamelModel`` so the wire body is camelCase.
      // Missing / cleared fields are sent as ``null`` so the server can
      // distinguish "clear this field" from "leave this field alone".
      await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.proposals.updateMetadata(proposalId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            clientId: meta.clientId || null,
            clientName: meta.clientId
              ? (clients.find((c) => c.id === meta.clientId)?.companyName ?? null)
              : null,
            preparedBy: meta.preparedBy || null,
            documentDate: meta.documentDate || null,
            documentVersion: meta.documentVersion || "1.0",
          }),
        },
      );
      message.success("Cover updated");
    } catch {
      message.error("Failed to save cover");
    } finally {
      setSavingMeta(false);
    }
  };

  // ── Publish ───────────────────────────────────────────────────────

  const computeNextLabel = () => {
    const label = proposal?.publishedVersionLabel || "";
    if (!label) return "1.0";
    const [maj, min] = label.split(".").map(Number);
    return publishBump === "major" ? `${maj + 1}.0` : `${maj}.${min + 1}`;
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.proposals.publish(proposalId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ bump: publishBump, note: publishNote || null }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to publish");
      message.success(`Published as v${json.data.label}`);
      setPublishModalOpen(false);
      setPublishNote("");
      dispatch(fetchProposalDetailRequest(proposalId));
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
      // List responses omit ``content`` for weight; the detail endpoint
      // (called on demand from Preview) includes it.
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.proposals.versions(proposalId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (res.ok) {
        const json = await res.json();
        setVersions(json.data || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingVersions(false);
    }
  };

  /**
   * Fetch a version's content on demand (list endpoint omits it) and
   * open the full-screen preview modal.
   */
  const handlePreviewVersion = async (v: ProposalVersion) => {
    // If content is already loaded (rare — list endpoint doesn't include
    // it but the modal-open pathway may already have it cached), just
    // open. Otherwise fetch detail first.
    if (v.content) {
      setPreviewVersion(v);
      return;
    }
    try {
      const token = storage.getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.proposals.versionDetail(proposalId, v.id)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setPreviewVersion({ ...v, content: json.data?.content ?? {} });
    } catch {
      message.error("Failed to load version content");
    }
  };

  /**
   * Load a published version's content into the editor as a
   * client-side override. The server draft is NOT touched — the user
   * still has to click Save inside the DocumentPanel to commit. Any
   * time they want to bail they can click "Return to latest draft"
   * which clears the override.
   */
  const handleEditFromVersion = async (v: ProposalVersion) => {
    let content = v.content;
    if (!content) {
      try {
        const token = storage.getAccessToken();
        const res = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.proposals.versionDetail(proposalId, v.id)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (res.ok) {
          const json = await res.json();
          content = json.data?.content;
        }
      } catch {
        /* falls through to the check below */
      }
    }
    if (!content) {
      message.error("Failed to load version content");
      return;
    }
    setLocalContent(content);
    setEditingFromVersion(v.label);
    setPreviewVersion(null);
    setPageTab("proposal");
    message.info(
      `Loaded v${v.label} into the editor. Click Save inside the panel to commit, or "Return to latest draft" to undo.`,
      5,
    );
  };

  const handleReturnToLatestDraft = () => {
    setLocalContent({});
    setEditingFromVersion(null);
    if (editingFile) handleCancelEdit();
  };

  // ── Password handlers ─────────────────────────────────────────────

  const handleSetPassword = async (remove = false) => {
    setSavingPassword(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.proposals.setPassword(proposalId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ password: remove ? null : newPassword }),
        },
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

  // ── Delete ────────────────────────────────────────────────────────

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete Proposal",
      content: `Delete "${proposal?.title || proposal?.name}"? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = storage.getAccessToken();
          const res = await fetch(
            `${API_BASE_URL}${API_ENDPOINTS.proposals.delete(proposalId)}`,
            {
              method: "DELETE",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );
          if (!res.ok) throw new Error();
          message.success("Proposal deleted");
          router.replace(APP_ROUTES.proposals);
        } catch {
          message.error("Failed to delete proposal");
        }
      },
    });
  };

  // ── SSE ───────────────────────────────────────────────────────────

  const startSSE = useCallback(
    (jobId: string) => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      const token = storage.getAccessToken();
      const url = `${API_BASE_URL}${API_ENDPOINTS.proposals.stream(jobId)}${
        token ? `?token=${token}` : ""
      }`;

      dispatch(setGenerating(true));
      // Seed placeholder pending rows so the panel renders the full
      // pipeline even before the first SSE frame lands.
      AGENT_ORDER.forEach((agentName) =>
        dispatch(updateAgentRun({ agentName, status: "pending" })),
      );

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (ev) => {
        try {
          const { type, data } = JSON.parse(ev.data);
          if (type === "agent_start") {
            dispatch(updateAgentRun({ agentName: data.agentName, status: "running" }));
          } else if (type === "agent_token") {
            dispatch(
              appendAgentToken({ agentName: data.agentName, token: data.token }),
            );
          } else if (type === "agent_complete") {
            dispatch(
              updateAgentRun({
                agentName: data.agentName,
                status: "completed",
                content: agentStream[data.agentName] || "",
              }),
            );
          } else if (type === "agent_error") {
            dispatch(
              updateAgentRun({ agentName: data.agentName, status: "failed" }),
            );
          } else if (type === "done" || type === "error") {
            dispatch(setGenerating(false));
            es.close();
            dispatch(fetchProposalDetailRequest(proposalId));
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      es.onerror = () => {
        dispatch(setGenerating(false));
        es.close();
        dispatch(fetchProposalDetailRequest(proposalId));
      };
    },
    [dispatch, proposalId, agentStream],
  );

  // ── Mount / status effects ────────────────────────────────────────

  useEffect(() => {
    dispatch(clearGeneration());
    dispatch(fetchProposalDetailRequest(proposalId));
    // Populate the client dropdown for the cover metadata block. Same
    // list is used by the generation form so cache hits are common.
    dispatch(fetchClientsRequest({ limit: 200 }));
  }, [proposalId, dispatch]);

  useEffect(() => {
    if (proposal) {
      setIsPasswordProtected(!!proposal.isPasswordProtected);
      setMeta({
        clientId: proposal.clientId ?? "",
        preparedBy: proposal.preparedBy ?? "",
        documentDate: proposal.documentDate ?? "",
        documentVersion: proposal.documentVersion ?? "1.0",
      });
    }
  }, [proposal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!proposal) return;
    if (proposal.status === "generating" && proposal.proposalJobId) {
      dispatch(fetchJobDetailRequest(proposal.proposalJobId));
      startSSE(proposal.proposalJobId);
    } else if (
      proposal.status === "completed" &&
      proposal.proposalJobId &&
      !job
    ) {
      dispatch(fetchJobDetailRequest(proposal.proposalJobId));
    }
    return () => {
      eventSourceRef.current?.close();
    };
  }, [proposal?.id, proposal?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pageTab === "history") loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTab]);

  // ── Derived ───────────────────────────────────────────────────────

  const handleCopyShareLink = () => {
    if (!proposal?.shareToken) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/proposals/share/${proposal.shareToken}`,
    );
    message.success("Share link copied to clipboard!");
  };

  const displayAgents: ProposalAgentRun[] =
    agentRuns.length > 0
      ? agentRuns
      : AGENT_ORDER.map((name, idx) => ({
          id: name,
          agentName: name,
          displayName: AGENT_DISPLAY_NAMES[name] || name,
          status: "pending" as const,
          order: idx,
        }));

  const aiContent = { ...(proposal?.aiContent || {}), ...localContent };
  const primaryContent =
    aiContent["improved-proposal.md"] || aiContent["proposal.md"] || "";
  const primaryFile = aiContent["improved-proposal.md"]
    ? "improved-proposal.md"
    : "proposal.md";

  const isRunning = proposal?.status === "generating" || isGenerating;
  const isCompleted = proposal?.status === "completed";
  const isFailed = proposal?.status === "failed";

  // ── Loading / not found ───────────────────────────────────────────

  if (isLoading && !proposal) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spin size="large" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <FileText className="w-16 h-16 mb-4 text-zinc-300" />
        <Typography.Text className="text-zinc-500">
          Proposal not found
        </Typography.Text>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href={APP_ROUTES.proposals}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Proposals
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900 truncate">
              {proposal.title || proposal.name}
            </h1>
            <Tag
              color={
                isRunning
                  ? "processing"
                  : isCompleted
                    ? "green"
                    : isFailed
                      ? "red"
                      : "default"
              }
              className="!rounded-full shrink-0"
            >
              {isRunning
                ? "Generating..."
                : isCompleted
                  ? "Completed"
                  : proposal.status}
            </Tag>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
            {proposal.clientName && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {proposal.clientName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(proposal.createdAt)}
            </span>
            {proposal.brdName && (
              <span className="flex items-center gap-1 text-zinc-400">
                <FileText className="w-3 h-3" />
                From BRD: {proposal.brdName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && (
            <>
              <Button
                icon={<Upload className="w-3.5 h-3.5" />}
                size="small"
                type="primary"
                className="!bg-zinc-900"
                onClick={() => {
                  setPublishBump("minor");
                  setPublishModalOpen(true);
                }}
              >
                {proposal.publishedVersionLabel
                  ? `Publish (v${proposal.publishedVersionLabel})`
                  : "Publish"}
              </Button>

              <Tooltip
                title={
                  !proposal.publishedVersionLabel
                    ? "Publish first to enable sharing"
                    : ""
                }
              >
                <Button
                  icon={<Copy className="w-3.5 h-3.5" />}
                  size="small"
                  onClick={handleCopyShareLink}
                  disabled={!proposal.publishedVersionLabel}
                >
                  Copy Share Link
                </Button>
              </Tooltip>
              <Tooltip
                title={
                  !proposal.publishedVersionLabel
                    ? "Publish first to enable sharing"
                    : ""
                }
              >
                <Button
                  icon={<Share2 className="w-3.5 h-3.5" />}
                  size="small"
                  href={
                    proposal.publishedVersionLabel
                      ? `/proposals/share/${proposal.shareToken}`
                      : undefined
                  }
                  target="_blank"
                  disabled={!proposal.publishedVersionLabel}
                >
                  Open Share View
                </Button>
              </Tooltip>

              {isPasswordProtected ? (
                <Button
                  icon={<LockOpen className="w-3.5 h-3.5" />}
                  size="small"
                  danger
                  onClick={() => handleSetPassword(true)}
                  loading={savingPassword}
                >
                  Remove Password
                </Button>
              ) : (
                <Button
                  icon={<Lock className="w-3.5 h-3.5" />}
                  size="small"
                  onClick={() => setPasswordModalOpen(true)}
                >
                  Set Password
                </Button>
              )}
            </>
          )}
          <Button
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            size="small"
            onClick={() => dispatch(fetchProposalDetailRequest(proposalId))}
          />
          <Button
            icon={<Trash2 className="w-3.5 h-3.5" />}
            size="small"
            danger
            onClick={handleDelete}
          />
        </div>
      </div>

      {/* Commercial summary strip */}
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-4 h-4 text-zinc-400" />
        <CommercialSummary
          paymentType={proposal.paymentType}
          currency={proposal.currency}
          equityPercentage={proposal.equityPercentage}
          maxBudget={proposal.maxBudget}
          advancePercentage={proposal.advancePercentage}
          maxTimelineWeeks={proposal.maxTimelineWeeks}
        />
      </div>

      {/* Generation panel — visible while running */}
      {(isRunning || (isFailed && agentRuns.length > 0)) && (
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            Agent Pipeline
          </p>
          <ProposalAgentExecutionPanel
            agents={displayAgents}
            currentStream={agentStream}
          />
        </div>
      )}

      {/* Editing-from-version banner. Shown whenever the working copy
          was seeded from a published version so the user has a clear
          escape hatch back to the latest draft. */}
      {editingFromVersion && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <History className="w-4 h-4 shrink-0" />
            <span>
              Editing a copy of <strong>v{editingFromVersion}</strong>. Changes
              are not saved until you click Save.
            </span>
          </div>
          <button
            onClick={handleReturnToLatestDraft}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline shrink-0 ml-4"
          >
            Return to latest draft
          </button>
        </div>
      )}

      {/* Content */}
      {isCompleted && (
        <Tabs
          activeKey={pageTab}
          onChange={(k) => setPageTab(k as "proposal" | "workspace" | "history")}
          items={[
            {
              key: "proposal",
              label: "Proposal",
              children: (
                <>
                  {/* Document Cover — mirrors the BRD Studio cover
                      metadata block. Fields autosave on blur. */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 mb-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Document Cover
                      </p>
                      <Button
                        size="small"
                        icon={
                          savingMeta ? (
                            <div className="w-3 h-3 border border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )
                        }
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
                          onChange={(val) =>
                            setMeta((m) => ({ ...m, clientId: val ?? "" }))
                          }
                          onBlur={handleSaveMeta}
                          placeholder="Select client"
                          allowClear
                          showSearch
                          style={{ width: "100%" }}
                          loading={clientsMeta.isLoading}
                          filterOption={(input, option) =>
                            ((option?.label as string) ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={clients.map((c) => ({
                            value: c.id,
                            label: c.companyName,
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
                          onChange={(e) =>
                            setMeta((m) => ({ ...m, preparedBy: e.target.value }))
                          }
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
                          onChange={(e) =>
                            setMeta((m) => ({ ...m, documentDate: e.target.value }))
                          }
                          onBlur={handleSaveMeta}
                          placeholder="e.g. June 30, 2026"
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
                          onChange={(e) =>
                            setMeta((m) => ({
                              ...m,
                              documentVersion: e.target.value,
                            }))
                          }
                          onBlur={handleSaveMeta}
                          placeholder="e.g. 1.0"
                          className="w-full border border-zinc-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-3">
                      These fields appear on the shared document cover page.
                      Changes save automatically on blur.
                    </p>
                  </div>

                  {/* We render the DocumentPanel whenever the proposal
                      has ANY ai_content bucket (even if the primary
                      file happens to be empty) so manual proposals
                      land in an editable state right away. Only
                      proposals that never got past the pipeline show
                      the empty placeholder. */}
                  {proposal.aiContent != null ? (
                    <DocumentPanel
                      file={primaryFile}
                      label={
                        primaryFile === "improved-proposal.md"
                          ? "Final Proposal (improved)"
                          : "Proposal Draft"
                      }
                      content={primaryContent}
                      editingFile={editingFile}
                      editContent={editContent}
                      isSaving={isSaving}
                      onStartEdit={handleStartEdit}
                      onSave={handleSave}
                      onCancelEdit={handleCancelEdit}
                      onEditChange={setEditContent}
                      onPreview={() =>
                        setEditPreview({
                          content: editContent,
                          label: "Final Proposal",
                        })
                      }
                    />
                  ) : (
                    <div className="text-center py-16 text-zinc-400 text-sm">
                      No proposal content yet.
                    </div>
                  )}
                </>
              ),
            },
            {
              key: "workspace",
              label: "Workspace",
              children: (
                <Tabs
                  activeKey={workspaceTab}
                  onChange={setWorkspaceTab}
                  tabPosition="left"
                  items={WORKSPACE_FILES.filter((w) => aiContent[w.file]).map(
                    (w) => ({
                      key: w.key,
                      label: w.label,
                      children: (
                        <DocumentPanel
                          file={w.file}
                          label={w.label}
                          content={aiContent[w.file] || ""}
                          editingFile={editingFile}
                          editContent={editContent}
                          isSaving={isSaving}
                          onStartEdit={handleStartEdit}
                          onSave={handleSave}
                          onCancelEdit={handleCancelEdit}
                          onEditChange={setEditContent}
                          onPreview={() =>
                            setEditPreview({
                              content: editContent,
                              label: w.label,
                            })
                          }
                        />
                      ),
                    }),
                  )}
                />
              ),
            },
            {
              key: "history",
              label: "Version History",
              children: (
                <div className="py-2">
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    {/* Working-copy row — always present, sits above
                        the published snapshots. Preview shows the
                        live editor content (with any local overrides
                        already merged in). */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-blue-50/30">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-zinc-800">
                            Current Draft
                          </span>
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
                            Working copy
                          </span>
                          {editingFromVersion && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              Loaded from v{editingFromVersion}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">
                          Your current edits — not published until you click Publish
                        </p>
                      </div>
                      <Button
                        size="small"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() =>
                          // Synthetic pseudo-version — the modal special-cases
                          // ``id === "__draft__"`` to render primaryContent.
                          setPreviewVersion({
                            id: "__draft__",
                            proposalId,
                            label: "Draft",
                            content: aiContent,
                            coverMetadata: {},
                            publishedBy: "",
                            publishedAt: "",
                            major: 0,
                            minor: 0,
                          } as unknown as ProposalVersion)
                        }
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
                        <p className="text-sm">
                          No published versions yet. Click <strong>Publish</strong>{" "}
                          to create v1.0.
                        </p>
                      </div>
                    ) : (
                      versions.map((v) => {
                        const isLive = v.id === proposal.publishedVersionId;
                        return (
                          <div
                            key={v.id}
                            className={`flex items-center justify-between px-5 py-4 border-b border-zinc-50 last:border-0 ${
                              isLive ? "bg-emerald-50/30" : "hover:bg-zinc-50"
                            } transition-colors`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span
                                  className={`text-sm font-bold tabular-nums ${
                                    isLive ? "text-emerald-700" : "text-zinc-800"
                                  }`}
                                >
                                  v{v.label}
                                </span>
                                {isLive && (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                                    Live on share link
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400">
                                {new Date(v.publishedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {" · "}
                                {new Date(v.publishedAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {v.note && (
                                  <span className="ml-2 text-zinc-500 italic">
                                    &quot;{v.note}&quot;
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              <Button
                                size="small"
                                icon={<Eye className="w-3 h-3" />}
                                onClick={() => handlePreviewVersion(v)}
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
              ),
            },
          ]}
        />
      )}

      {/* Publish modal */}
      <Modal
        title="Publish Proposal"
        open={publishModalOpen}
        onCancel={() => {
          setPublishModalOpen(false);
          setPublishNote("");
        }}
        onOk={handlePublish}
        okText={`Publish as v${computeNextLabel()}`}
        confirmLoading={publishing}
        okButtonProps={{ className: "!bg-zinc-900" }}
      >
        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Version type
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPublishBump("minor")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm transition-colors text-left ${
                  publishBump === "minor"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <p className="font-semibold">Minor update</p>
                <p
                  className={`text-xs mt-0.5 ${publishBump === "minor" ? "text-zinc-300" : "text-zinc-400"}`}
                >
                  Small corrections, clarifications
                </p>
              </button>
              <button
                onClick={() => setPublishBump("major")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm transition-colors text-left ${
                  publishBump === "major"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <p className="font-semibold">Major release</p>
                <p
                  className={`text-xs mt-0.5 ${publishBump === "major" ? "text-zinc-300" : "text-zinc-400"}`}
                >
                  Significant changes, resigned commercials
                </p>
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Version note{" "}
              <span className="text-zinc-300 font-normal normal-case">
                (optional)
              </span>
            </p>
            <Input.TextArea
              value={publishNote}
              onChange={(e) => setPublishNote(e.target.value)}
              placeholder="e.g. Updated milestones after client feedback"
              rows={2}
            />
          </div>
          <p className="text-xs text-zinc-400 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
            The share link will immediately show{" "}
            <strong>v{computeNextLabel()}</strong>. Your draft will remain
            editable for future changes.
          </p>
        </div>
      </Modal>

      {/* Password modal */}
      <Modal
        title="Set Share Password"
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false);
          setNewPassword("");
        }}
        onOk={() => handleSetPassword(false)}
        okText="Set Password"
        confirmLoading={savingPassword}
        okButtonProps={{
          disabled: !newPassword,
          className: "!bg-zinc-900",
        }}
      >
        <div className="space-y-3 py-2">
          <Typography.Text className="text-sm text-zinc-500 block">
            Anyone with the share link will need to enter this password to view
            the proposal.
          </Typography.Text>
          <Input.Password
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter password"
            size="large"
            autoFocus
          />
        </div>
      </Modal>

      {/* ── Full-screen preview overlays ────────────────────────────
          Portaled to document.body so they escape any Tab / Modal
          stacking context. Both auto-close on Escape via their close
          buttons; nothing else is intercepted so users can still
          scroll, select, print. */}
      {editPreview &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-900">
                  Preview — {editPreview.label}
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  Unsaved changes
                </span>
              </div>
              <button
                onClick={() => setEditPreview(null)}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg px-3 py-1.5 transition-colors"
              >
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
          document.body,
        )}

      {previewVersion &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-900">
                  {previewVersion.id === "__draft__"
                    ? "Current Draft"
                    : `Version v${previewVersion.label}`}
                </span>
                {previewVersion.id !== "__draft__" &&
                  previewVersion.id === proposal.publishedVersionId && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                      Live on share link
                    </span>
                  )}
              </div>
              <div className="flex items-center gap-2">
                {previewVersion.id !== "__draft__" && (
                  <Button
                    icon={<Pencil className="w-3.5 h-3.5" />}
                    onClick={() => handleEditFromVersion(previewVersion)}
                  >
                    Edit from this version
                  </Button>
                )}
                <button
                  onClick={() => setPreviewVersion(null)}
                  className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-zinc-50">
              <div className="max-w-4xl mx-auto px-6 py-10">
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12">
                  <SmartContentRenderer
                    content={
                      previewVersion.id === "__draft__"
                        ? primaryContent
                        : (previewVersion.content?.["improved-proposal.md"] ||
                            previewVersion.content?.["proposal.md"] ||
                            "")
                    }
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
