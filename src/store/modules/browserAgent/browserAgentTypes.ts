export type AgentName =
  | "Supervisor"
  | "Researcher"
  | "Coder"
  | "System"
  | "General";

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  agentName?: AgentName | string;
  timestamp: string;
}

export interface BrowserAgentState {
  isOpen: boolean;
  isFullScreen: boolean;
  sessionId: string | null;
  messages: AgentMessage[];
  streamingText: string;
  isStreaming: boolean;
  activeAgent: string | null;
  handoffHistory: string[];
  lastTool: string | null;
  error: string | null;
}
