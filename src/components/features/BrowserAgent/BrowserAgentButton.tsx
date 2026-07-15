"use client";

import React from "react";
import { Badge, Tooltip } from "antd";
import { Bot } from "lucide-react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { togglePanel } from "@/store/modules/browserAgent/browserAgentSlice";

export function BrowserAgentButton() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.browserAgent.isOpen);
  const isStreaming = useAppSelector((s) => s.browserAgent.isStreaming);

  return (
    <Tooltip
      title={isOpen ? "Close Agent" : "Apex Agent"}
      placement="left"
      mouseEnterDelay={0.5}
    >
      <div className="fixed bottom-7 right-7 z-40">
        {/* Outer pulse when streaming */}
        {isStreaming && (
          <span className="absolute inset-0 rounded-full bg-zinc-900/30 animate-ping" />
        )}

        <Badge
          dot={isStreaming}
          color="#10b981"
          offset={[-4, 4]}
          style={{ width: 10, height: 10 }}
        >
          <button
            onClick={() => dispatch(togglePanel())}
            className={`
              relative flex items-center justify-center
              w-[52px] h-[52px] rounded-full
              shadow-[0_8px_30px_rgba(0,0,0,0.25)]
              transition-all duration-200 ease-out
              focus:outline-none
              active:scale-95
              ${isOpen
                ? "bg-zinc-700 rotate-[20deg]"
                : "bg-zinc-950 hover:bg-zinc-800 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              }
            `}
            aria-label="Toggle Agent"
          >
            <Bot
              className={`w-5 h-5 text-white transition-all duration-200 ${
                isOpen ? "opacity-70" : "opacity-100"
              }`}
            />
          </button>
        </Badge>
      </div>
    </Tooltip>
  );
}
