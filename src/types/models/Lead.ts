import type { Meeting } from "./Meeting";

export interface ActionItem {
  description: string;
  assignedTo?: string | null;
  dueDate?: string | null;
  status: "pending" | "completed";
}

export interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  email?: string | null;
  phone?: string | null;
  linkedinProfile?: string | null;
  country?: string | null;
  timezone?: string | null;
  source: string;
  status: string;
  assignedTo?: string | null;
  clientId?: string | null;
  salesPrepNotes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: string;
  content: string;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface LeadMeeting {
  id: string;
  leadId: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number | null;
  status: string;
  meetingNotes?: string | null;
  actionItems: ActionItem[];
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetail {
  lead: Lead;
  activities: LeadActivity[];
  meetings: Meeting[];
}

export interface LeadStats {
  total: number;
  newCount: number;
  contactedCount: number;
  meetingScheduledCount: number;
  proposalSentCount: number;
  wonCount: number;
  lostCount: number;
}
