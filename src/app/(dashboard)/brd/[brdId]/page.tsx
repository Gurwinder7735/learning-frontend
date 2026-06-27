"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Tabs, Tag, Typography, Spin, message } from "antd";
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
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
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
import { MarkdownRenderer } from "@/components/features/ProposalIntelligence/MarkdownRenderer";
import { storage } from "@/lib/utils/storage";
import { PageHeader } from "@/components/ui/PageHeader";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BRDDetailPage() {
  const { brdId } = useParams() as { brdId: string };
  const dispatch = useAppDispatch();
  const brd = useAppSelector(selectCurrentBRD);
  const job = useAppSelector(selectCurrentJob);
  const agentRuns = useAppSelector(selectAgentRuns);
  const agentStream = useAppSelector(selectAgentStream);
  const isGenerating = useAppSelector(selectIsGenerating);
  const isLoading = useAppSelector(selectBRDLoading);

  const eventSourceRef = useRef<EventSource | null>(null);
  const [activeTab, setActiveTab] = useState("improved-brd");

  // Edit mode state
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Local override of ai_content for immediate post-save update
  const [localContent, setLocalContent] = useState<Record<string, string>>({});

  const handleStartEdit = (fileName: string, currentContent: string) => {
    setEditingFile(fileName);
    setEditContent(currentContent);
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
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${API_ENDPOINTS.brd.updateContent(brdId)}`,
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
      // Update local content immediately so the view reflects changes
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

  const startSSE = useCallback(
    (jobId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      const token = storage.getAccessToken();
      const url = `${API_BASE_URL}/api/v1/brd/jobs/${jobId}/stream${token ? `?token=${token}` : ""}`;

      dispatch(setGenerating(true));

      // Pre-populate agent run stubs
      AGENT_ORDER.forEach((agentName, idx) => {
        dispatch(
          updateAgentRun({
            agentName,
            status: "pending",
          })
        );
      });

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          const { type, data } = parsed;

          if (type === "agent_start") {
            dispatch(updateAgentRun({ agentName: data.agentName, status: "running" }));
          } else if (type === "agent_token") {
            dispatch(appendAgentToken({ agentName: data.agentName, token: data.token }));
          } else if (type === "agent_complete") {
            const accumulated = agentStream[data.agentName] || "";
            dispatch(
              updateAgentRun({
                agentName: data.agentName,
                status: "completed",
                content: accumulated,
              })
            );
          } else if (type === "agent_error") {
            dispatch(updateAgentRun({ agentName: data.agentName, status: "failed" }));
          } else if (type === "done") {
            dispatch(setGenerating(false));
            es.close();
            // Reload BRD to get final ai_content
            dispatch(fetchBRDDetailRequest(brdId));
          } else if (type === "error") {
            dispatch(setGenerating(false));
            es.close();
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        dispatch(setGenerating(false));
        es.close();
        // Reload to check if completed
        dispatch(fetchBRDDetailRequest(brdId));
      };
    },
    [dispatch, brdId, agentStream]
  );

  useEffect(() => {
    dispatch(clearGeneration());
    dispatch(fetchBRDDetailRequest(brdId));
  }, [brdId, dispatch]);

  useEffect(() => {
    if (!brd) return;

    if (brd.status === "generating" && brd.brdJobId) {
      dispatch(fetchJobDetailRequest(brd.brdJobId));
      startSSE(brd.brdJobId);
    } else if (brd.status === "completed" && brd.brdJobId && !job) {
      dispatch(fetchJobDetailRequest(brd.brdJobId));
    }

    return () => {
      eventSourceRef.current?.close();
    };
  }, [brd?.id, brd?.status]); // eslint-disable-line

  const handleCopyShareLink = () => {
    if (!brd?.shareToken) return;
    const link = `${window.location.origin}/brd/share/${brd.shareToken}`;
    navigator.clipboard.writeText(link);
    message.success("Share link copied to clipboard!");
  };

  // Build display agents list from job or default order
  const displayAgents: BRDAgentRun[] = agentRuns.length > 0
    ? agentRuns
    : AGENT_ORDER.map((name, idx) => ({
        id: name,
        agentName: name,
        displayName: AGENT_DISPLAY_NAMES[name] || name,
        status: "pending" as const,
        order: idx,
      }));

  // Merge server ai_content with any locally saved edits
  const aiContent = { ...(brd?.aiContent || {}), ...localContent };
  const outputFiles = [
    { key: "improved-brd", label: "Final BRD", file: "improved-brd.md" },
    { key: "quality-report", label: "Quality Report", file: "quality-report.md" },
    { key: "brd", label: "Draft BRD", file: "brd.md" },
    { key: "business-context", label: "Business Context", file: "business-context.md" },
    { key: "business-requirements", label: "Requirements", file: "business-requirements.md" },
    { key: "process-workflow", label: "Processes & Workflows", file: "process-workflow.md" },
    { key: "nfr-compliance", label: "NFR & Compliance", file: "nfr-compliance.md" },
    { key: "validation-gap", label: "Validation & Gaps", file: "validation-gap.md" },
  ];

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

  const isRunning = brd.status === "generating" || isGenerating;
  const isCompleted = brd.status === "completed";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900 truncate">{brd.name}</h1>
            <Tag
              color={
                isRunning ? "processing" : isCompleted ? "green" : brd.status === "failed" ? "red" : "default"
              }
              className="!rounded-full shrink-0"
            >
              {isRunning ? "Generating..." : isCompleted ? "Completed" : brd.status}
            </Tag>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
            {brd.clientName && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {brd.clientName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(brd.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && (
            <>
              <Button
                icon={<Copy className="w-3.5 h-3.5" />}
                size="small"
                onClick={handleCopyShareLink}
              >
                Copy Share Link
              </Button>
              <Button
                icon={<Share2 className="w-3.5 h-3.5" />}
                size="small"
                href={`/brd/share/${brd.shareToken}`}
                target="_blank"
              >
                Open Share View
              </Button>
            </>
          )}
          <Button
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            size="small"
            onClick={() => dispatch(fetchBRDDetailRequest(brdId))}
          />
        </div>
      </div>

      {/* Content */}
      {isRunning ? (
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
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-zinc-400">
                    <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Waiting for agents to start...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : isCompleted && Object.keys(aiContent).length > 0 ? (
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            // Cancel edit if switching tabs
            if (editingFile) handleCancelEdit();
            setActiveTab(key);
          }}
          items={outputFiles
            .filter((f) => aiContent[f.file])
            .map((f) => {
              const isEditing = editingFile === f.file;
              const content = aiContent[f.file] || "";
              return {
                key: f.key,
                label: f.label,
                children: (
                  <div className="bg-white border border-zinc-200 rounded-xl mt-2 overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-zinc-50">
                      <Typography.Text className="text-xs text-zinc-400">
                        {isEditing ? "Editing — Markdown supported" : f.label}
                      </Typography.Text>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="small"
                              icon={<X className="w-3.5 h-3.5" />}
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              icon={isSaving
                                ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                : <Save className="w-3.5 h-3.5" />
                              }
                              onClick={() => handleSave(f.file)}
                              loading={isSaving}
                              className="!bg-black"
                            >
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="small"
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => handleStartEdit(f.file, content)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Content — view or edit */}
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full font-mono text-sm text-zinc-800 leading-relaxed p-6 outline-none resize-none bg-white"
                        style={{ minHeight: 600 }}
                        spellCheck={false}
                        autoFocus
                      />
                    ) : (
                      <div className="p-6">
                        <MarkdownRenderer content={content} />
                      </div>
                    )}
                  </div>
                ),
              };
            })}
        />
      ) : brd.status === "failed" ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <BookText className="w-6 h-6 text-red-500" />
          </div>
          <Typography.Text className="text-zinc-600 block mb-2">
            BRD generation failed.
          </Typography.Text>
          <Typography.Text className="text-zinc-400 text-sm">
            Check the agent logs for details. You may try generating again.
          </Typography.Text>
        </div>
      ) : (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      )}

      {/* Agent run summary when completed */}
      {isCompleted && displayAgents.length > 0 && (
        <div className="mt-8">
          <Typography.Text className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
            Agent Summary
          </Typography.Text>
          <BRDAgentExecutionPanel agents={displayAgents} currentStream={{}} />
        </div>
      )}
    </div>
  );
}
