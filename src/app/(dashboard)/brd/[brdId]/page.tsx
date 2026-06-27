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
} from "lucide-react";
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
  "user_stories_analyst",
  "technical_analyst",
  "data_analyst",
  "composer",
];

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  business_context: "Business Context Analyst",
  requirements_analyst: "Requirements Analyst",
  user_stories_analyst: "User Stories Analyst",
  technical_analyst: "Technical Requirements Analyst",
  data_analyst: "Data Requirements Analyst",
  composer: "BRD Composer",
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
  const [activeTab, setActiveTab] = useState("brd");

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

  const aiContent = brd?.aiContent || {};
  const outputFiles = [
    { key: "brd", label: "Full BRD", file: "brd.md" },
    { key: "business-context", label: "Business Context", file: "business-context.md" },
    { key: "functional-requirements", label: "Functional Req.", file: "functional-requirements.md" },
    { key: "user-stories", label: "User Stories", file: "user-stories.md" },
    { key: "technical-requirements", label: "Technical Req.", file: "technical-requirements.md" },
    { key: "data-requirements", label: "Data Requirements", file: "data-requirements.md" },
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
          onChange={setActiveTab}
          items={outputFiles
            .filter((f) => aiContent[f.file])
            .map((f) => ({
              key: f.key,
              label: f.label,
              children: (
                <div className="bg-white border border-zinc-200 rounded-xl p-6 mt-2">
                  <MarkdownRenderer content={aiContent[f.file] || ""} />
                </div>
              ),
            }))}
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
