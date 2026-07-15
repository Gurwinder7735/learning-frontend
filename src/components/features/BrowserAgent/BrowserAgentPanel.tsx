"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Button, Tooltip, Badge, Alert } from "antd";
import {
  X,
  Maximize2,
  Minimize2,
  SquarePen,
  Bot,
  Sparkles,
} from "lucide-react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  closePanel,
  toggleFullScreen,
  startStreaming,
  appendToken,
  setHandoff,
  setToolCall,
  finishStreaming,
  setError,
  newSession,
} from "@/store/modules/browserAgent/browserAgentSlice";
import { runTask } from "@/lib/api/browserAgent";
import { storage } from "@/lib/utils/storage";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { AgentActivityBar } from "./AgentActivityBar";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Inner panel card ────────────────────────────────────────────────────────

function PanelCard({
  isFullScreen,
  onSend,
}: {
  isFullScreen: boolean;
  onSend: (task: string) => void;
}) {
  const dispatch = useAppDispatch();
  const isStreaming = useAppSelector((s) => s.browserAgent.isStreaming);
  const activeAgent = useAppSelector((s) => s.browserAgent.activeAgent);
  const handoffHistory = useAppSelector((s) => s.browserAgent.handoffHistory);
  const sessionId = useAppSelector((s) => s.browserAgent.sessionId);
  const lastTool = useAppSelector((s) => s.browserAgent.lastTool);
  const error = useAppSelector((s) => s.browserAgent.error);
  const messageCount = useAppSelector((s) => s.browserAgent.messages.length);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        width: isFullScreen ? "min(760px, calc(100vw - 32px))" : 420,
        height: isFullScreen ? "min(86vh, 800px)" : 580,
        borderRadius: 20,
        boxShadow: "0 24px 80px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)",
        background: "#fff",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Dark header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          background: "linear-gradient(135deg, #0f0f0f 0%, #1c1c1e 100%)",
          padding: "14px 16px",
          borderRadius: "20px 20px 0 0",
        }}
      >
        {/* Left: logo + title */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 32, height: 32, background: "rgba(255,255,255,0.1)", flexShrink: 0 }}
          >
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, lineHeight: 1 }}>
                Apex Agent
              </span>
              {isStreaming && (
                <Badge
                  status="processing"
                  color="#10b981"
                  style={{ marginBottom: 1 }}
                />
              )}
            </div>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, lineHeight: 1.4, display: "block", marginTop: 2 }}>
              {isStreaming
                ? `${activeAgent ?? "Supervisor"} is working…`
                : sessionId
                ? "Session active · multi-turn"
                : "Browser · Code · System · Research"}
            </span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-0.5">
          <Tooltip title="New chat" placement="bottom">
            <Button
              type="text"
              size="small"
              disabled={isStreaming || messageCount === 0}
              onClick={() => dispatch(newSession())}
              icon={<SquarePen className="w-3.5 h-3.5" />}
              style={{ color: "rgba(255,255,255,0.5)", padding: "0 6px" }}
              className="hover:!text-white hover:!bg-white/10"
            />
          </Tooltip>

          <Tooltip title={isFullScreen ? "Compact" : "Full screen"} placement="bottom">
            <Button
              type="text"
              size="small"
              onClick={() => dispatch(toggleFullScreen())}
              icon={isFullScreen
                ? <Minimize2 className="w-3.5 h-3.5" />
                : <Maximize2 className="w-3.5 h-3.5" />
              }
              style={{ color: "rgba(255,255,255,0.5)", padding: "0 6px" }}
              className="hover:!text-white hover:!bg-white/10"
            />
          </Tooltip>

          <Tooltip title="Close" placement="bottom">
            <Button
              type="text"
              size="small"
              onClick={() => dispatch(closePanel())}
              icon={<X className="w-3.5 h-3.5" />}
              style={{ color: "rgba(255,255,255,0.5)", padding: "0 6px" }}
              className="hover:!text-white hover:!bg-white/10"
            />
          </Tooltip>
        </div>
      </div>

      {/* ── Agent activity bar ───────────────────────────────────────────── */}
      <AgentActivityBar
        activeAgent={activeAgent}
        handoffHistory={handoffHistory}
        isStreaming={isStreaming}
        lastTool={lastTool}
      />

      {/* ── Error alert ──────────────────────────────────────────────────── */}
      {error && (
        <div className="px-4 pt-3 shrink-0">
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            style={{ fontSize: 12, borderRadius: 10 }}
          />
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <ChatMessages onSend={onSend} />

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <ChatInput onSend={onSend} />
    </div>
  );
}

// ─── Main exported component ─────────────────────────────────────────────────

export function BrowserAgentPanel() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.browserAgent.isOpen);
  const isFullScreen = useAppSelector((s) => s.browserAgent.isFullScreen);
  const sessionId = useAppSelector((s) => s.browserAgent.sessionId);

  const esRef = useRef<EventSource | null>(null);

  const stopSSE = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  useEffect(() => () => stopSSE(), [stopSSE]);

  const handleSend = useCallback(
    async (task: string) => {
      stopSSE();
      dispatch(startStreaming({ task }));

      let jobId: string;
      let resolvedSessionId: string;

      try {
        const res = await runTask(task, sessionId);
        jobId = res.data.jobId;
        resolvedSessionId = res.data.sessionId;
      } catch {
        dispatch(setError("Failed to start — please try again."));
        return;
      }

      const token = storage.getAccessToken();
      const url =
        `${API_BASE_URL}${API_ENDPOINTS.browserAgent.stream(jobId)}` +
        (token ? `?token=${token}` : "");

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (ev) => {
        try {
          const { type, data } = JSON.parse(ev.data) as {
            type: string;
            data: Record<string, string>;
          };
          if (type === "token") {
            dispatch(appendToken(data.token ?? ""));
          } else if (type === "handoff") {
            dispatch(setHandoff(data.agent ?? ""));
          } else if (type === "tool_call") {
            dispatch(setToolCall(data.tool ?? ""));
          } else if (type === "done") {
            dispatch(finishStreaming({ sessionId: data.sessionId ?? resolvedSessionId, jobId }));
            stopSSE();
          } else if (type === "error") {
            dispatch(setError(data.message ?? "An error occurred."));
            stopSSE();
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        dispatch(setError("Connection lost — please try again."));
        stopSSE();
      };
    },
    [dispatch, sessionId, stopSSE]
  );

  if (!isOpen) return null;

  if (isFullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        onClick={() => dispatch(closePanel())}
      >
        <PanelCard isFullScreen onSend={handleSend} />
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <PanelCard isFullScreen={false} onSend={handleSend} />
    </div>
  );
}
