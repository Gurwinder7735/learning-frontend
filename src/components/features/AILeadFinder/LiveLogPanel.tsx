"use client";

import React, { useEffect, useRef } from "react";
import { Button, Tag, Spin } from "antd";
import { StopCircle, Terminal } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import type { LogEntry } from "@/store/modules/aiLeadFinder/aiLeadFinderTypes";

const LOG_COLOR: Record<LogEntry["type"], string> = {
  info:  "#a1a1aa",
  lead:  "#10b981",
  tool:  "#3b82f6",
  error: "#ef4444",
};

function LogLine({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  return (
    <div className="flex gap-2 items-start font-mono text-[12px] leading-relaxed py-0.5">
      <span style={{ color: "#52525b", flexShrink: 0 }}>{time}</span>
      <span style={{ color: LOG_COLOR[entry.type] }}>{entry.message}</span>
    </div>
  );
}

interface Props {
  onStop: () => void;
  isStopping: boolean;
}

export function LiveLogPanel({ onStop, isStopping }: Props) {
  const logs = useAppSelector((s) => s.aiLeadFinder.logs);
  const isRunning = useAppSelector((s) => s.aiLeadFinder.isRunning);
  const job = useAppSelector((s) => s.aiLeadFinder.currentJob);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{ border: "1px solid #e4e4e7", background: "#0f0f0f" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #1f1f1f" }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-300">Agent Log</span>
          {isRunning && (
            <Tag
              color="green"
              style={{ fontSize: 10, lineHeight: "18px", marginLeft: 4 }}
            >
              <span className="flex items-center gap-1">
                <Spin size="small" />
                Running
              </span>
            </Tag>
          )}
          {job && !isRunning && (
            <Tag
              color={job.status === "completed" ? "green" : job.status === "stopped" ? "orange" : "red"}
              style={{ fontSize: 10, lineHeight: "18px" }}
            >
              {job.status}
            </Tag>
          )}
        </div>

        {isRunning && (
          <Button
            size="small"
            danger
            loading={isStopping}
            icon={<StopCircle className="w-3.5 h-3.5" />}
            onClick={onStop}
            style={{ fontSize: 12 }}
          >
            Stop
          </Button>
        )}
      </div>

      {/* Log body */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#2f2f2f transparent" }}
      >
        {logs.length === 0 ? (
          <span className="text-zinc-600 font-mono text-xs">Waiting for agent…</span>
        ) : (
          logs.map((entry) => <LogLine key={entry.id} entry={entry} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer counter */}
      <div
        className="px-4 py-2 shrink-0 flex items-center justify-between"
        style={{ borderTop: "1px solid #1f1f1f" }}
      >
        <span className="font-mono text-[11px] text-zinc-600">
          {logs.length} log entries
        </span>
        {job && (
          <span className="font-mono text-[11px] text-zinc-500">
            {job.leadsFoundCount} / {job.leadsRequested} leads
          </span>
        )}
      </div>
    </div>
  );
}
