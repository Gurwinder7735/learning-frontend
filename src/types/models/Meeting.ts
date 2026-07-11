export interface Meeting {
  id: string;
  title: string;
  leadId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  projectId?: string | null;
  meetingType: string;
  status: string;
  summary?: string | null;
  aiSummary?: string | null;
  notes?: string | null;
  meetingDate: string;
  durationMinutes?: number | null;
  attendees: string[];
  location?: string | null;
  googleEventId?: string | null;
  googleCalendarId?: string | null;
  meetLink?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  decisionCount: number;
  actionItemCount: number;
}

export interface MeetingDecision {
  id: string;
  meetingId: string;
  decision: string;
  aiGenerated?: boolean;
  createdBy?: string | null;
  createdAt: string;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  title: string;
  owner?: string | null;
  dueDate?: string | null;
  status: string;
  aiGenerated?: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingActivity {
  id: string;
  meetingId: string;
  action: string;
  description: string;
  performedBy?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface MeetingDetail {
  meeting: Meeting;
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
  activities: MeetingActivity[];
}

export interface MeetingStats {
  totalMeetings: number;
  thisMonth: number;
  pendingActionItems: number;
  byType: Record<string, number>;
}
