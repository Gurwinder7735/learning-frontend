import type { Meeting } from "./Meeting";

export interface SalesPrepSection {
  id: string;
  title: string;
  content: string;
}

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
  // Funnel status. Post-merge, ``converted_to_client`` is a terminal
  // value we surface here so the Leads view can render the "Converted"
  // filter and badge.
  status: string;
  assignedTo?: string | null;
  // The account's own id after conversion — same as ``id``. Kept
  // named ``clientId`` for compatibility with pre-merge callers that
  // used it to decide whether to render "Open in Clients".
  clientId?: string | null;
  salesPrepNotes?: string | null;
  salesPrepSections: SalesPrepSection[];
  // Where the account is currently in its lifecycle. ``client`` means
  // the lead has been converted; the record still shows in the Leads
  // view (with ``status="converted_to_client"``) *and* appears in the
  // Clients view.
  lifecycleStage?: "lead" | "client";
  convertedToClientAt?: string | null;
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
