import type { Meeting, MeetingDecision, MeetingActionItem, MeetingActivity, MeetingDetail, MeetingStats } from "@/types/models/Meeting";

export interface MeetingQuery {
  search?: string;
  status?: string;
  clientId?: string;
  leadId?: string;
  skip?: number;
  limit?: number;
}

export interface CreateMeetingPayload {
  clientName?: string | null;
  title: string;
  leadId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  meetingType: string;
  summary?: string | null;
  notes?: string | null;
  meetingDate: string;
  durationMinutes?: number | null;
  attendees?: string[];
  location?: string | null;
  generateMeetLink?: boolean;
}

export interface UpdateMeetingPayload {
  id: string;
  data: Partial<CreateMeetingPayload & { status: string }>;
}

export interface MeetingsState {
  items: Meeting[];
  total: number;
  isLoading: boolean;
  error: string | null;
  stats: MeetingStats | null;
  detail: MeetingDetail | null;
  detailLoading: boolean;
  currentMeeting: Meeting | null;
  googleConnected: boolean;
  googleEmail: string | null;
}
