export interface SummaryInfo {
  clientProblem?: string | null;
  businessGoals?: string | null;
  projectVision?: string | null;
}

export interface ScopeInfo {
  includedFeatures: string[];
  excludedFeatures: string[];
  deliverables: string[];
}

export interface TimelinePhase {
  name: string;
  duration: string;
}

export interface TimelineInfo {
  phases: TimelinePhase[];
}

export interface PricingInfo {
  type: string;
  cost: number;
  currency: string;
  paymentTerms?: string | null;
}

export interface ConsentRecord {
  consentText: string;
  consentVersion: string;
  agreed: boolean;
  agreedAt: string;
  ipAddress: string;
}

export interface Signature {
  role: "client" | "internal";
  signerName: string;
  signerEmail: string;
  signedAt: string;
  ipAddress: string;
  userAgent: string;
  signatureStyle: "typed" | "drawn";
  consent?: ConsentRecord | null;
  sessionId?: string | null;
  currentHash?: string | null;
  previousHash?: string | null;
}

export interface Proposal {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  projectName?: string | null;
  status: string;
  version: number;
  summary?: SummaryInfo | null;
  scope?: ScopeInfo | null;
  timeline?: TimelineInfo | null;
  pricing?: PricingInfo | null;
  assumptions: string[];
  risks: string[];
  shareToken?: string | null;
  createdBy?: string | null;
  isAiGenerated?: boolean;
  proposalJobId?: string | null;
  signingStatus: string;
  signatures: Signature[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposalVersion {
  id: string;
  proposalId: string;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: string;
}

export interface ProposalActivity {
  id: string;
  proposalId: string;
  action: string;
  description: string;
  performedBy?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SignatureStatus {
  signatures: Signature[];
  signingStatus: string;
  nextExpectedSigner: string | null;
}

export interface ProposalDetail {
  proposal: Proposal;
  versions: ProposalVersion[];
  activities: ProposalActivity[];
}

export interface ProposalStats {
  totalProposals: number;
  draftCount: number;
  sentCount: number;
  approvedCount: number;
  rejectedCount: number;
  byStatus: Record<string, number>;
}

// -- Compliance / eSignature types --

export interface AuditEvent {
  id: string;
  ceremonyId: string;
  eventType: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  currentHash: string;
  previousHash?: string | null;
  createdAt: string;
}

export interface EvidencePackage {
  id: string;
  ceremonyId: string;
  proposalId: string;
  packageHash: string;
  generatedAt: string;
  format: string;
}

export interface StartSessionResponse {
  sessionId: string;
  consentText: string;
  consentVersion: string;
  consentRequired: boolean;
}

export interface ConsentResponse {
  consentVersion: string;
  agreed: boolean;
  agreedAt: string;
}

export interface VerifySignatureResult {
  valid: boolean;
  auditEvents: AuditEvent[];
  ceremonyId?: string | null;
  message: string;
}
