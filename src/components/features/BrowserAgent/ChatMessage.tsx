"use client";

import React from "react";
import { Avatar, Typography } from "antd";
import { Crown, Globe, Code2, Terminal, MessageSquare, Bot } from "lucide-react";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import type { AgentMessage } from "@/store/modules/browserAgent/browserAgentTypes";

const { Text } = Typography;

const AGENT_META: Record<
  string,
  { icon: React.ElementType; bg: string; initials: string }
> = {
  Supervisor: { icon: Crown,         bg: "#18181b", initials: "SV" },
  Researcher: { icon: Globe,         bg: "#2563eb", initials: "RS" },
  Coder:      { icon: Code2,         bg: "#7c3aed", initials: "CD" },
  System:     { icon: Terminal,      bg: "#059669", initials: "SY" },
  General:    { icon: MessageSquare, bg: "#71717a", initials: "GN" },
};

function AgentAvatar({ name }: { name?: string }) {
  const meta = name ? AGENT_META[name] : null;
  const Icon = meta?.icon ?? Bot;
  return (
    <Avatar
      size={32}
      style={{
        background: meta?.bg ?? "#18181b",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      icon={<Icon style={{ width: 15, height: 15 }} />}
    />
  );
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Streaming bubble ────────────────────────────────────────────────────────

interface StreamingMessageProps {
  text: string;
  agentName: string | null;
}

export function StreamingMessage({ text, agentName }: StreamingMessageProps) {
  return (
    <div className="flex items-start gap-3 px-5 py-1">
      <AgentAvatar name={agentName ?? undefined} />

      <div className="flex-1 min-w-0 max-w-[85%]">
        {agentName && (
          <Text
            className="block mb-1"
            style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            {agentName}
          </Text>
        )}

        <div
          style={{
            background: "#f8f8f8",
            border: "1px solid #e4e4e7",
            borderRadius: "4px 16px 16px 16px",
            padding: "12px 16px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#18181b",
          }}
        >
          {text ? (
            <MarkdownRenderer content={text} />
          ) : (
            <span style={{ color: "#a1a1aa", fontStyle: "italic" }}>Thinking…</span>
          )}
          {/* blinking cursor */}
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 14,
              background: "#71717a",
              marginLeft: 2,
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Completed message bubble ─────────────────────────────────────────────────

interface ChatMessageProps {
  message: AgentMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end items-end gap-2 px-5 py-1">
        <div className="flex flex-col items-end max-w-[80%]">
          <div
            style={{
              background: "#18181b",
              color: "#fff",
              borderRadius: "16px 16px 4px 16px",
              padding: "10px 16px",
              fontSize: 13,
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            {message.content}
          </div>
          <Text style={{ fontSize: 10, color: "#a1a1aa", marginTop: 4 }}>
            {formatTime(message.timestamp)}
          </Text>
        </div>

        {/* User avatar */}
        <Avatar
          size={28}
          style={{ background: "#e4e4e7", flexShrink: 0, marginBottom: 18 }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#52525b" }}>Y</span>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-5 py-1">
      <AgentAvatar name={message.agentName} />

      <div className="flex-1 min-w-0 max-w-[85%]">
        {message.agentName && (
          <Text
            className="block mb-1"
            style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            {message.agentName}
          </Text>
        )}

        <div
          style={{
            background: "#f8f8f8",
            border: "1px solid #e4e4e7",
            borderRadius: "4px 16px 16px 16px",
            padding: "12px 16px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#18181b",
          }}
        >
          <MarkdownRenderer content={message.content} />
        </div>

        <Text style={{ fontSize: 10, color: "#a1a1aa", marginTop: 4, display: "block" }}>
          {formatTime(message.timestamp)}
        </Text>
      </div>
    </div>
  );
}
