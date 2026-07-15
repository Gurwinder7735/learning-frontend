"use client";

import React, { useEffect, useRef } from "react";
import { Collapse, Progress, Tag, Button, Spin, Typography } from "antd";
import {
  ChevronDown,
  StopCircle,
  CheckCircle,
  XCircle,
  Radio,
  Terminal,
  Loader2,
} from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import type { LogEntry } from "@/store/modules/aiLeadFinder/aiLeadFinderTypes";

// Logs are passed as a prop (not stored in Redux) to avoid re-rendering the
// whole tree on every token event (can be 100+ per second during browsing).

const { Text } = Typography;

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
    <div className="flex gap-2 items-start font-mono text-[11.5px] leading-relaxed py-px">
      <span style={{ color: "#52525b", flexShrink: 0, userSelect: "none" }}>{time}</span>
      <span style={{ color: LOG_COLOR[entry.type], wordBreak: "break-word" }}>
        {entry.message}
      </span>
    </div>
  );
}

interface Props {
  logs: LogEntry[];
  onStop: () => void;
  isStopping: boolean;
}

export function ActiveJobBanner({ logs, onStop, isStopping }: Props) {
  const job       = useAppSelector((s) => s.aiLeadFinder.currentJob);
  const isRunning = useAppSelector((s) => s.aiLeadFinder.isRunning);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRunning) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length, isRunning]);

  // Only show if there's a job (running or recently finished)
  if (!job) return null;

  const percent = job.leadsRequested > 0
    ? Math.round((job.leadsFoundCount / job.leadsRequested) * 100)
    : 0;

  const statusColor =
    job.status === "running"   ? "#3b82f6" :
    job.status === "completed" ? "#10b981" :
    job.status === "stopped"   ? "#f59e0b" : "#ef4444";

  const statusIcon =
    job.status === "running"   ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: statusColor }} /> :
    job.status === "completed" ? <CheckCircle className="w-3.5 h-3.5" style={{ color: statusColor }} /> :
    job.status === "stopped"   ? <XCircle className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} /> :
                                 <XCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />;

  const headerLabel = (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center gap-1.5">
        {statusIcon}
        <Text strong style={{ fontSize: 13, color: "#18181b" }}>
          {job.status === "running" ? "Search in Progress" :
           job.status === "completed" ? "Search Completed" :
           job.status === "stopped" ? "Search Stopped" : "Search Failed"}
        </Text>
      </div>

      <Tag style={{ fontSize: 11, margin: 0 }}>
        {job.targetIndustry} · {job.targetCountry}
      </Tag>

      <div className="flex items-center gap-2 ml-auto mr-6">
        <Text style={{ fontSize: 12, color: "#52525b" }}>
          {job.leadsFoundCount} / {job.leadsRequested} leads
        </Text>
        <Progress
          percent={percent}
          size="small"
          showInfo={false}
          strokeColor={statusColor}
          style={{ width: 80, margin: 0 }}
        />
        {isRunning && (
          <Button
            size="small"
            danger
            loading={isStopping}
            icon={<StopCircle className="w-3 h-3" />}
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            style={{ fontSize: 11, height: 24, padding: "0 8px" }}
          >
            Stop
          </Button>
        )}
      </div>
    </div>
  );

  const collapseItems = [
    {
      key: "log",
      label: headerLabel,
      children: (
        <div
          style={{
            background: "#0f0f0f",
            borderRadius: 10,
            padding: "10px 14px",
            height: 200,
            overflowY: "auto",
            scrollbarWidth: "thin" as const,
            scrollbarColor: "#2f2f2f transparent",
          }}
        >
          {logs.length === 0 ? (
            <span className="font-mono text-xs" style={{ color: "#52525b" }}>
              Waiting for agent…
            </span>
          ) : (
            logs.map((entry) => <LogLine key={entry.id} entry={entry} />)
          )}
          <div ref={bottomRef} />
        </div>
      ),
    },
  ];

  return (
    <Collapse
      defaultActiveKey={isRunning ? ["log"] : []}
      items={collapseItems}
      style={{
        borderRadius: 12,
        border: `1px solid ${isRunning ? "#bfdbfe" : "#e4e4e7"}`,
        background: isRunning ? "#eff6ff" : "#fafafa",
        overflow: "hidden",
      }}
    />
  );
}
