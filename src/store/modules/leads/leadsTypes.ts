import type { Lead, LeadActivity, LeadDetail, LeadStats } from "@/types/models/Lead";
import type { Meeting } from "@/types/models/Meeting";

export interface LeadsState {
  items: Lead[];
  total: number;
  isLoading: boolean;
  error: string | null;
  stats: LeadStats | null;
  detail: LeadDetail | null;
  activities: LeadActivity[];
  meetings: Meeting[];
}

export interface LeadsQuery {
  search?: string;
  status?: string;
  source?: string;
  assignedTo?: string;
  skip?: number;
  limit?: number;
}

export interface LeadCreatePayload {
  companyName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  linkedinProfile?: string;
  country?: string;
  timezone?: string;
  source?: string;
  assignedTo?: string;
  salesPrepNotes?: string;
}

export interface LeadUpdatePayload {
  id: string;
  data: Partial<LeadCreatePayload & { status: string }>;
}

export interface LeadActivityCreatePayload {
  leadId: string;
  type: string;
  content: string;
}

export interface LeadMeetingCreatePayload {
  leadId: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
}

export interface LeadMeetingUpdatePayload {
  leadId: string;
  meetingId: string;
  data: Partial<{
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    meetingNotes: string;
  }>;
}

export interface ActionItemCreatePayload {
  leadId: string;
  meetingId: string;
  description: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface ActionItemUpdatePayload {
  leadId: string;
  meetingId: string;
  itemIndex: number;
  data: Partial<{
    description: string;
    assignedTo: string;
    dueDate: string;
    status: string;
  }>;
}
