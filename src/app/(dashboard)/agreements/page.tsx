"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Drawer, Input, Modal, Select, message, Tooltip } from "antd";
import {
  FilePen,
  Plus,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Lock,
  Globe,
  Sparkles,
  Trash2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { fetchAgreementsRequest } from "@/store/modules/agreements/agreementsSlice";
import { selectAgreements, selectAgreementsLoading } from "@/store/modules/agreements/agreementsSelectors";
import { storage } from "@/lib/utils/storage";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import type { Agreement } from "@/types/models/Agreement";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const statusAccent: Record<string, string> = {
  draft: "border-l-zinc-300",
  review: "border-l-amber-400",
  sent: "border-l-blue-500",
  fully_signed: "border-l-emerald-500",
  declined: "border-l-red-400",
  archived: "border-l-zinc-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function AgreementCard({ agreement, onDelete }: { agreement: Agreement; onDelete: (a: Agreement) => void }) {
  const isFullySigned = agreement.status === "fully_signed";
  const isSent = agreement.status === "sent";
  const isReview = agreement.status === "review";
  const isDeclined = agreement.status === "declined";

  return (
    <div className={`relative group bg-white rounded-2xl border-l-4 border border-zinc-100 ${statusAccent[agreement.status] || "border-l-zinc-300"} hover:border-zinc-200 hover:shadow-md transition-all duration-200`}>
      <Link href={`${APP_ROUTES.agreements}/${agreement.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors leading-snug line-clamp-2">
              {agreement.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {isFullySigned && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Fully Signed
              </span>
            )}
            {isDeclined && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                <AlertCircle className="w-2.5 h-2.5" /> Declined
              </span>
            )}
            {isSent && agreement.signingStatus === "awaiting_client" && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Awaiting Client
              </span>
            )}
            {isSent && agreement.signingStatus === "awaiting_internal" && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Awaiting Your Signature
              </span>
            )}
            {isReview && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Eye className="w-2.5 h-2.5" /> Under Review
              </span>
            )}
            {agreement.status === "draft" && (
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">
                Draft
              </span>
            )}
          </div>
        </div>

        {agreement.clientName ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-3">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {agreement.clientName}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 italic mb-3">No client assigned</div>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-50 pt-3 mt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(agreement.createdAt)}
            </span>
            {agreement.signatures.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {agreement.signatures.length} sig{agreement.signatures.length !== 1 ? "s" : ""}
              </span>
            )}
            {agreement.isPasswordProtected && (
              <Tooltip title="Password protected">
                <Lock className="w-3 h-3 text-zinc-400" />
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isFullySigned && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            <span className="text-zinc-300">{formatTime(agreement.createdAt)}</span>
          </div>
        </div>
      </Link>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(agreement); }}
        className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
        title="Delete Agreement"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function AgreementsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const agreements = useAppSelector(selectAgreements);
  const isLoading = useAppSelector(selectAgreementsLoading);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPartyRole, setNewPartyRole] = useState("Client");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // AI Generate modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({
    agreementType: "Service Agreement",
    party1Name: "",
    party1Role: "Service Provider",
    party2Name: "",
    party2Role: "Client",
    jurisdiction: "",
    effectiveDate: "",
    term: "",
    subjectMatter: "",
    specialClauses: "",
  });

  useEffect(() => {
    dispatch(fetchAgreementsRequest());
  }, [dispatch]);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newName.trim(), external_party_role: newPartyRole }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setNewName("");
      setNewPartyRole("Client");
      setCreateModalOpen(false);
      router.push(`${APP_ROUTES.agreements}/${json.data.id}`);
    } catch {
      message.error("Failed to create agreement");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (agreement: Agreement) => {
    Modal.confirm({
      title: "Delete Agreement",
      content: `Delete "${agreement.name}"? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = storage.getAccessToken();
          await fetch(`${API_BASE_URL}/api/v1/agreements/${agreement.id}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          message.success("Deleted");
          dispatch(fetchAgreementsRequest());
        } catch {
          message.error("Failed to delete");
        }
      },
    });
  };

  const showCreateModal = () => {
    setNewName("");
    setNewPartyRole("Client");
    setCreateModalOpen(true);
  };

  const handleGenerate = async () => {
    if (!genForm.party1Name.trim() || !genForm.party2Name.trim() || !genForm.subjectMatter.trim() || !genForm.jurisdiction.trim()) {
      message.warning("Please fill in Party 1, Party 2, Jurisdiction, and Subject Matter.");
      return;
    }
    if (generating) return;
    setGenerating(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          agreement_type: genForm.agreementType,
          party1_name: genForm.party1Name,
          party1_role: genForm.party1Role,
          party2_name: genForm.party2Name,
          party2_role: genForm.party2Role,
          jurisdiction: genForm.jurisdiction,
          effective_date: genForm.effectiveDate,
          term: genForm.term,
          subject_matter: genForm.subjectMatter,
          special_clauses: genForm.specialClauses,
          external_party_role: genForm.party2Role,  // same as party 2 role
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setGenerateModalOpen(false);
      router.push(`${APP_ROUTES.agreements}/${json.data.agreementId}?generating=true&jobId=${json.data.jobId}`);
    } catch {
      message.error("Failed to start generation");
    } finally {
      setGenerating(false);
    }
  };

  const signedCount = agreements.filter((a) => a.status === "fully_signed").length;
  const pendingCount = agreements.filter((a) => a.status === "sent").length;

  const PARTY_ROLES = ["Client", "Partner", "Vendor", "Consultant", "Contractor"];

  return (
    <div>
      <PageHeader
        title="Agreements"
        subtitle="Create documents, send for signing, and manage legally binding agreements."
      />

      {/* Create Agreement Modal */}
      <Modal
        open={createModalOpen}
        title="New Agreement"
        okText="Create"
        confirmLoading={creating}
        onOk={handleCreate}
        onCancel={() => { setCreateModalOpen(false); setNewName(""); setNewPartyRole("Client"); }}
        destroyOnClose
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">Agreement Name</label>
            <input
              type="text"
              placeholder="e.g. Service Agreement — Acme Corp"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">External Party Role</label>
            <Select
              value={newPartyRole}
              onChange={(v) => setNewPartyRole(v)}
              className="w-full"
              options={PARTY_ROLES.map((r) => ({ label: r, value: r }))}
              dropdownRender={(menu) => (
                <div>
                  {menu}
                  <div className="px-3 py-2 border-t border-zinc-100">
                    <input
                      placeholder="Custom role..."
                      className="w-full text-sm outline-none text-zinc-700"
                      onKeyDown={(e) => {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (e.key === "Enter" && val) {
                          setNewPartyRole(val);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            />
            <p className="text-xs text-zinc-400 mt-1.5">This label appears on the signing certificate (e.g. "Partner", "Vendor").</p>
          </div>
        </div>
      </Modal>

      {agreements.length > 0 && (
        <div className="flex items-center gap-6 mb-6 text-xs text-zinc-500">
          <span><strong className="text-zinc-800 font-semibold">{agreements.length}</strong> total</span>
          <span><strong className="text-emerald-700 font-semibold">{signedCount}</strong> fully signed</span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <strong>{pendingCount}</strong> pending signature
            </span>
          )}
          <div className="flex-1" />
          <Button
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setGenerateModalOpen(true)}
            className="border-purple-200 text-purple-700 hover:border-purple-400"
          >
            Generate with AI
          </Button>
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={showCreateModal}
            className="!bg-zinc-900"
          >
            New Agreement
          </Button>
        </div>
      )}

      {isLoading && agreements.length === 0 ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : agreements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
            <FilePen className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-bold text-zinc-700 mb-1">No agreements yet</h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">
            Create a document in CKEditor, send it to your client for signing, and both parties sign electronically.
          </p>
          <div className="flex items-center gap-3">
            <Button
              size="large"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => setGenerateModalOpen(true)}
              className="border-purple-200 text-purple-700 hover:border-purple-400"
            >
              Generate with AI
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<Plus className="w-4 h-4" />}
              onClick={showCreateModal}
              className="!bg-zinc-900"
            >
              Create manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agreements.map((agreement: Agreement) => (
            <AgreementCard key={agreement.id} agreement={agreement} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Generate with AI — Side Sheet */}
      <Drawer
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-zinc-900">Generate Agreement with AI</span>
          </div>
        }
        width={480}
        placement="right"
        destroyOnClose
        footer={
          <div className="flex items-center gap-3 justify-end">
            <Button onClick={() => setGenerateModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={generating}
              onClick={handleGenerate}
              className="!bg-purple-600 hover:!bg-purple-700 !border-purple-600"
            >
              Generate Agreement
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <p className="text-xs text-zinc-500 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 leading-relaxed">
            Our AI runs a 6-agent legal pipeline to produce a professionally drafted, legally structured agreement. You can review and edit the result before sending for signing.
          </p>

          {/* Agreement type */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">Agreement Type</label>
            <Select
              value={genForm.agreementType}
              onChange={(v) => setGenForm((f) => ({ ...f, agreementType: v }))}
              className="w-full"
              options={[
                "Non-Disclosure Agreement (NDA)",
                "Service Agreement",
                "Partnership Agreement",
                "Employment Agreement",
                "Vendor Agreement",
                "Consulting Agreement",
                "Software License Agreement",
                "Distribution Agreement",
                "Joint Venture Agreement",
              ].map((t) => ({ label: t, value: t }))}
            />
          </div>

          {/* Parties */}
          <div className="border-t border-zinc-100 pt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Parties</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Party 1 Name</label>
                  <Input
                    placeholder="e.g. Appmotiv Ltd"
                    value={genForm.party1Name}
                    onChange={(e) => setGenForm((f) => ({ ...f, party1Name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Role</label>
                  <Input
                    placeholder="e.g. Service Provider"
                    value={genForm.party1Role}
                    onChange={(e) => setGenForm((f) => ({ ...f, party1Role: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Party 2 Name</label>
                  <Input
                    placeholder="e.g. Acme Corp"
                    value={genForm.party2Name}
                    onChange={(e) => setGenForm((f) => ({ ...f, party2Name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Role</label>
                  <Input
                    placeholder="e.g. Client"
                    value={genForm.party2Role}
                    onChange={(e) => setGenForm((f) => ({ ...f, party2Role: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Agreement details */}
          <div className="border-t border-zinc-100 pt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Agreement Details</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Jurisdiction / Governing Law <span className="text-red-400">*</span></label>
                  <Input
                    placeholder="e.g. England & Wales"
                    value={genForm.jurisdiction}
                    onChange={(e) => setGenForm((f) => ({ ...f, jurisdiction: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Term / Duration</label>
                  <Input
                    placeholder="e.g. 12 months"
                    value={genForm.term}
                    onChange={(e) => setGenForm((f) => ({ ...f, term: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Subject Matter / Purpose <span className="text-red-400">*</span></label>
                <Input.TextArea
                  placeholder="Describe what this agreement covers — services, products, IP, collaboration scope, etc."
                  value={genForm.subjectMatter}
                  onChange={(e) => setGenForm((f) => ({ ...f, subjectMatter: e.target.value }))}
                  rows={5}
                  className="resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Special Clauses / Notes <span className="text-zinc-400 font-normal">(optional)</span></label>
                <Input.TextArea
                  placeholder="Any specific terms, restrictions, payment amounts, or requirements to include..."
                  value={genForm.specialClauses}
                  onChange={(e) => setGenForm((f) => ({ ...f, specialClauses: e.target.value }))}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
