"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Typography } from "antd";
import {
  Globe,
  Code2,
  Terminal,
  FileSearch,
  Bot,
} from "lucide-react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { startStreaming } from "@/store/modules/browserAgent/browserAgentSlice";
import { ChatMessage, StreamingMessage } from "./ChatMessage";

const { Text, Title } = Typography;

const SUGGESTIONS = [
  { icon: Globe,       label: "Research",    text: "Find top 5 mobile app development companies and their pricing"       },
  { icon: FileSearch,  label: "Lead gen",    text: "Scrape contact emails from Y Combinator's latest batch startups"     },
  { icon: Code2,       label: "Code",        text: "Write a Python script to export MongoDB data to CSV"                 },
  { icon: Terminal,    label: "System",      text: "Show disk usage and running processes on this server"                },
];

interface Props {
  onSend: (task: string) => void;
}

export function ChatMessages({ onSend }: Props) {
  const messages  = useAppSelector((s) => s.browserAgent.messages);
  const streaming = useAppSelector((s) => s.browserAgent.streamingText);
  const isStreaming = useAppSelector((s) => s.browserAgent.isStreaming);
  const activeAgent = useAppSelector((s) => s.browserAgent.activeAgent);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Hero */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #18181b 60%, #3f3f46)" }}
          >
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: "#18181b" }}>
              Apex Agent
            </Title>
            <Text style={{ color: "#71717a", fontSize: 13, lineHeight: 1.6 }}>
              Browse the web, write code, run commands,<br />generate leads — just ask.
            </Text>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-md">
          {SUGGESTIONS.map(({ icon: Icon, label, text }) => (
            <button
              key={label}
              onClick={() => onSend(text)}
              className="group flex flex-col items-start gap-1.5 text-left p-3 rounded-xl border transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
              style={{
                borderColor: "#e4e4e7",
                background: "#fafafa",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#a1a1aa"; (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e4e4e7"; (e.currentTarget as HTMLButtonElement).style.background = "#fafafa"; }}
            >
              <span
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "#52525b" }}
              >
                <Icon style={{ width: 12, height: 12 }} />
                {label}
              </span>
              <span className="text-[11px] leading-relaxed" style={{ color: "#a1a1aa" }}>
                {text.length > 52 ? text.slice(0, 52) + "…" : text}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#e4e4e7 transparent" }}>
      <div className="flex flex-col gap-0.5">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isStreaming && (
          <StreamingMessage text={streaming} agentName={activeAgent} />
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
