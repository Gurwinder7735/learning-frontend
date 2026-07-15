import { apiRequest } from "@/lib/api/axiosInstance";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export interface RunTaskResponse {
  data: {
    jobId: string;
    sessionId: string;
    task: string;
    status: string;
  };
  success: boolean;
  message: string;
}

export interface BrowserAgentSession {
  id: string;
  title: string;
  createdBy: string;
  historyLength: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BrowserAgentJob {
  id: string;
  sessionId: string | null;
  task: string;
  status: string;
  result: string | null;
  error: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function runTask(
  task: string,
  sessionId?: string | null
): Promise<RunTaskResponse> {
  return apiRequest<RunTaskResponse>({
    method: "POST",
    url: API_ENDPOINTS.browserAgent.run,
    data: { task, session_id: sessionId ?? undefined },
  });
}

export async function getSessions(): Promise<{
  data: { sessions: BrowserAgentSession[]; total: number };
}> {
  return apiRequest({
    method: "GET",
    url: API_ENDPOINTS.browserAgent.sessions,
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return apiRequest({
    method: "DELETE",
    url: API_ENDPOINTS.browserAgent.deleteSession(sessionId),
  });
}
