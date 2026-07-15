import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AgentMessage, BrowserAgentState } from "./browserAgentTypes";

const initialState: BrowserAgentState = {
  isOpen: false,
  isFullScreen: true,
  sessionId: null,
  messages: [],
  streamingText: "",
  isStreaming: false,
  activeAgent: null,
  handoffHistory: [],
  lastTool: null,
  error: null,
};

const browserAgentSlice = createSlice({
  name: "browserAgent",
  initialState,
  reducers: {
    openPanel(state) {
      state.isOpen = true;
    },
    closePanel(state) {
      state.isOpen = false;
    },
    togglePanel(state) {
      state.isOpen = !state.isOpen;
    },
    toggleFullScreen(state) {
      state.isFullScreen = !state.isFullScreen;
    },

    startStreaming(state, action: PayloadAction<{ task: string }>) {
      state.isStreaming = true;
      state.streamingText = "";
      state.activeAgent = "Supervisor";
      state.handoffHistory = ["Supervisor"];
      state.lastTool = null;
      state.error = null;
      state.messages.push({
        id: `user-${Date.now()}`,
        role: "user",
        content: action.payload.task,
        timestamp: new Date().toISOString(),
      });
    },

    appendToken(state, action: PayloadAction<string>) {
      state.streamingText += action.payload;
    },

    setHandoff(state, action: PayloadAction<string>) {
      state.activeAgent = action.payload;
      if (
        state.handoffHistory[state.handoffHistory.length - 1] !== action.payload
      ) {
        state.handoffHistory.push(action.payload);
      }
    },

    setToolCall(state, action: PayloadAction<string>) {
      state.lastTool = action.payload;
    },

    finishStreaming(
      state,
      action: PayloadAction<{ sessionId: string; jobId: string }>
    ) {
      state.isStreaming = false;
      state.lastTool = null;
      state.sessionId = action.payload.sessionId;
      if (state.streamingText.trim()) {
        state.messages.push({
          id: `agent-${action.payload.jobId}`,
          role: "agent",
          content: state.streamingText,
          agentName: state.activeAgent ?? undefined,
          timestamp: new Date().toISOString(),
        });
      }
      state.streamingText = "";
      state.activeAgent = null;
    },

    setError(state, action: PayloadAction<string>) {
      state.isStreaming = false;
      state.error = action.payload;
      state.activeAgent = null;
      state.lastTool = null;
      if (state.streamingText.trim()) {
        state.messages.push({
          id: `agent-err-${Date.now()}`,
          role: "agent",
          content: state.streamingText,
          agentName: state.activeAgent ?? undefined,
          timestamp: new Date().toISOString(),
        });
        state.streamingText = "";
      }
    },

    newSession(state) {
      state.sessionId = null;
      state.messages = [];
      state.streamingText = "";
      state.isStreaming = false;
      state.activeAgent = null;
      state.handoffHistory = [];
      state.lastTool = null;
      state.error = null;
    },

    addMessage(state, action: PayloadAction<AgentMessage>) {
      state.messages.push(action.payload);
    },
  },
});

export const {
  openPanel,
  closePanel,
  togglePanel,
  toggleFullScreen,
  startStreaming,
  appendToken,
  setHandoff,
  setToolCall,
  finishStreaming,
  setError,
  newSession,
  addMessage,
} = browserAgentSlice.actions;

export default browserAgentSlice.reducer;
