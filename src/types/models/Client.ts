export interface Client {
  id: string;
  companyName: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  country?: string | null;
  timezone?: string | null;
  sourceType: string;
  referredBy?: string | null;
  internalNotes?: string | null;
  status: string;
  logoUrl?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  contactCount: number;
  // Unified account fields — the same record backs both the Leads and
  // Clients modules. ``originStage`` says how the record entered the
  // system (immutable); ``lifecycleStage`` says where it is right now.
  // ``convertedToClientAt`` is populated only after a lead-origin
  // record is promoted.
  originStage?: "lead" | "client";
  lifecycleStage?: "lead" | "client";
  convertedToClientAt?: string | null;
  // Lead-origin fields — populated on records that came in through
  // the Leads module. Kept on the ``Client`` type (rather than a
  // separate ``LeadOriginClient`` variant) so the client detail page
  // can render them conditionally without a discriminated union.
  contactPerson?: string | null;
  linkedinProfile?: string | null;
  assignedTo?: string | null;
  salesPrepSections?: Array<{ id: string; title: string; content: string }>;
  notesSections?: Array<{ id: string; title: string; content: string }>;
}

export interface Contact {
  id: string;
  clientId: string;
  fullName: string;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinProfile?: string | null;
  notes?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  clientId: string;
  action: string;
  description: string;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ClientDetail {
  client: Client;
  contacts: Contact[];
  activities: Activity[];
}

/**
 * Minimal shape shared by the BRD / Proposal / Agreement "Prepared For"
 * pickers. Both ``Client`` and ``Lead`` satisfy this interface since the
 * two come from the same unified ``ClientModel`` collection.
 */
export interface AccountOption {
  id: string;
  companyName: string;
  /** ``"lead"`` or ``"client"`` — controls the badge shown in the picker. */
  originStage?: "lead" | "client";
  lifecycleStage?: "lead" | "client";
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  recentlyAdded: number;
  newThisMonth: number;
}
