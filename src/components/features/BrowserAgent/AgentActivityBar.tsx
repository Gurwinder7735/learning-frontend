"use client";

import React from "react";
import { Tag, Space } from "antd";
import {
  Crown,
  Globe,
  Code2,
  Terminal,
  MessageSquare,
  ChevronRight,
  Loader2,
  Wrench,
} from "lucide-react";

const AGENT_META: Record<
  string,
  { icon: React.ElementType; color: string; antColor: string }
> = {
  Supervisor: { icon: Crown,       color: "#18181b", antColor: "default" },
  Researcher: { icon: Globe,       color: "#2563eb", antColor: "blue"    },
  Coder:      { icon: Code2,       color: "#7c3aed", antColor: "purple"  },
  System:     { icon: Terminal,    color: "#059669", antColor: "green"   },
  General:    { icon: MessageSquare, color: "#71717a", antColor: "default" },
};

interface Props {
  activeAgent: string | null;
  handoffHistory: string[];
  isStreaming: boolean;
  lastTool?: string | null;
}

export function AgentActivityBar({
  activeAgent,
  handoffHistory,
  isStreaming,
  lastTool,
}: Props) {
  if (!isStreaming && handoffHistory.length === 0) return null;

  return (
    <div
      className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-b"
      style={{
        background: "linear-gradient(to right, #fafafa, #f4f4f5)",
        borderColor: "#e4e4e7",
        scrollbarWidth: "none",
      }}
    >
      {isStreaming && handoffHistory.length === 0 && (
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Starting…
        </span>
      )}

      <Space size={2} wrap={false}>
        {handoffHistory.map((agent, idx) => {
          const meta = AGENT_META[agent] ?? {
            icon: MessageSquare,
            color: "#71717a",
            antColor: "default",
          };
          const Icon = meta.icon;
          const isActive = agent === activeAgent;

          return (
            <React.Fragment key={`${agent}-${idx}`}>
              <Tag
                icon={<Icon style={{ width: 10, height: 10, display: "inline-flex", verticalAlign: "middle" }} />}
                bordered={isActive}
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  margin: 0,
                  padding: "1px 8px",
                  borderRadius: 20,
                  background: isActive ? meta.color : "#f1f1f1",
                  color: isActive ? "#fff" : "#71717a",
                  borderColor: isActive ? meta.color : "transparent",
                  transition: "all 0.2s",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {agent}
              </Tag>

              {idx < handoffHistory.length - 1 && (
                <ChevronRight
                  style={{ width: 10, height: 10, color: "#d4d4d8", flexShrink: 0 }}
                />
              )}
            </React.Fragment>
          );
        })}

        {isStreaming && activeAgent && (
          <Loader2
            className="animate-spin ml-1"
            style={{ width: 11, height: 11, color: "#a1a1aa", flexShrink: 0 }}
          />
        )}
      </Space>

      {isStreaming && lastTool && (
        <span
          className="ml-auto shrink-0 flex items-center gap-1 text-[10px] truncate max-w-[180px]"
          style={{ color: "#a1a1aa" }}
        >
          <Wrench style={{ width: 10, height: 10 }} />
          {lastTool}
        </span>
      )}
    </div>
  );
}
