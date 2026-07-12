"use client";

import {
  CheckCircle2,
  Loader2,
  XCircle,
  Brain,
  Building2,
  Layers,
  Calculator,
  DollarSign,
  CalendarClock,
  FileText,
  ClipboardCheck,
  Wand2,
} from "lucide-react";

/**
 * Static per-agent presentation config. Keys match the backend agent
 * ``name`` attribute — anything not in the map falls back to a neutral
 * "brain" icon.
 */
const AGENT_CONFIG: Record<string, { icon: typeof Brain; color: string }> = {
  business_context: { icon: Building2, color: "text-blue-600" },
  solution_architect: { icon: Layers, color: "text-purple-600" },
  estimator: { icon: Calculator, color: "text-orange-600" },
  commercial: { icon: DollarSign, color: "text-emerald-600" },
  project_manager: { icon: CalendarClock, color: "text-amber-600" },
  composer: { icon: FileText, color: "text-rose-600" },
  quality_validator: { icon: ClipboardCheck, color: "text-indigo-600" },
  improver: { icon: Wand2, color: "text-teal-600" },
};

interface AgentStatus {
  agentName: string;
  displayName: string;
  status: string;
  content?: string | null;
  error?: string | null;
}

interface Props {
  agents: AgentStatus[];
  currentStream: Record<string, string>;
}

export function ProposalAgentExecutionPanel({ agents, currentStream }: Props) {
  const activeAgent = agents.find((a) => a.status === "running");

  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const config = AGENT_CONFIG[agent.agentName] || {
          icon: Brain,
          color: "text-zinc-600",
        };
        const Icon = config.icon;

        return (
          <div
            key={agent.agentName}
            className={`rounded-xl border p-4 transition-all ${
              agent.status === "running"
                ? "border-zinc-200 bg-zinc-50 shadow-sm"
                : agent.status === "completed"
                  ? "border-emerald-200 bg-emerald-50/30"
                  : agent.status === "failed"
                    ? "border-red-200 bg-red-50/30"
                    : "border-zinc-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg bg-white border flex items-center justify-center ${config.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-medium text-zinc-900">
                    {agent.displayName}
                  </span>
                  {agent.status === "running" &&
                    activeAgent?.agentName === agent.agentName &&
                    currentStream[agent.agentName] && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2 max-w-md">
                        {currentStream[agent.agentName].slice(-200)}
                      </p>
                    )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {agent.status === "pending" && (
                  <span className="text-xs text-zinc-400 bg-zinc-100 rounded-full px-3 py-1">
                    Waiting...
                  </span>
                )}
                {agent.status === "running" && (
                  <Loader2 className="w-5 h-5 text-zinc-800 animate-spin" />
                )}
                {agent.status === "completed" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                {agent.status === "failed" && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
            {agent.status === "completed" && agent.content && (
              <p className="text-xs text-zinc-500 mt-2 line-clamp-2 border-t border-emerald-100 pt-2">
                {agent.content.slice(0, 300)}...
              </p>
            )}
            {agent.status === "failed" && agent.error && (
              <p className="text-xs text-red-500 mt-2 border-t border-red-100 pt-2">
                {agent.error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
