import type { Agreement } from "@/types/models/Agreement";

export interface AgreementsState {
  agreements: Agreement[];
  currentAgreement: Agreement | null;
  isLoading: boolean;
  error: string | null;
}
