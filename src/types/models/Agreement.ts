export interface AgreementSignature {
  role: "client" | "internal";
  signerName: string;
  signerEmail: string;
  signerTitle?: string | null;
  signedAt?: string | null;
  signatureStyle?: string;
}

export interface Agreement {
  id: string;
  name: string;
  content: string;
  clientId?: string | null;
  clientName?: string | null;
  description?: string | null;
  status: "draft" | "review" | "sent" | "fully_signed" | "declined" | "archived";
  externalPartyRole: string;
  signingStatus: "not_sent" | "awaiting_client" | "awaiting_internal" | "partially_signed" | "fully_signed" | "declined";
  signatures: AgreementSignature[];
  documentHash?: string | null;
  shareToken?: string | null;
  isLocked: boolean;
  isPasswordProtected: boolean;
  consentVersion: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  eventType: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  metadata: Record<string, unknown>;
  currentHash: string;
  previousHash?: string | null;
  createdAt: string;
}
