"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { Button, Tooltip } from "antd";
import { ArrowUp, Loader2 } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";

interface Props {
  onSend: (task: string) => void;
}

export function ChatInput({ onSend }: Props) {
  const isStreaming = useAppSelector((s) => s.browserAgent.isStreaming);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 148) + "px";
  }, []);

  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus();
  }, [isStreaming]);

  const handleSend = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const value = el.value.trim();
    if (!value || isStreaming) return;
    onSend(value);
    el.value = "";
    el.style.height = "auto";
  }, [isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div
      className="shrink-0 px-4 pb-4 pt-2"
      style={{ borderTop: "1px solid #f0f0f0" }}
    >
      <div
        className="flex items-end gap-2 rounded-2xl transition-all duration-150"
        style={{
          padding: "10px 12px 10px 16px",
          background: "#f9f9f9",
          border: "1.5px solid #e4e4e7",
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#a1a1aa";
          (e.currentTarget as HTMLDivElement).style.background = "#fff";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(0,0,0,0.05)";
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#e4e4e7";
            (e.currentTarget as HTMLDivElement).style.background = "#f9f9f9";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
          }
        }}
      >
        <textarea
          id="browser-agent-input"
          ref={textareaRef}
          rows={1}
          disabled={isStreaming}
          placeholder={isStreaming ? "Agent is working…" : "Ask the agent anything…"}
          className="flex-1 resize-none bg-transparent outline-none leading-relaxed disabled:cursor-not-allowed"
          style={{
            fontSize: 13,
            color: "#18181b",
            minHeight: 22,
            maxHeight: 148,
            fontFamily: "inherit",
          }}
          onInput={autoResize}
          onKeyDown={handleKeyDown}
        />

        <Tooltip title={isStreaming ? "Working…" : "Send (Enter)"} placement="top">
          <Button
            type="primary"
            shape="circle"
            size="middle"
            disabled={isStreaming}
            onClick={handleSend}
            style={{
              background: "#18181b",
              borderColor: "#18181b",
              width: 34,
              height: 34,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "none",
            }}
            icon={
              isStreaming
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowUp className="w-4 h-4" />
            }
          />
        </Tooltip>
      </div>

      <p className="text-center mt-1.5" style={{ fontSize: 10, color: "#c4c4c4" }}>
        Enter&nbsp;to send&nbsp;·&nbsp;Shift+Enter for newline
      </p>
    </div>
  );
}
