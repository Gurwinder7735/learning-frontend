"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Drawer, Form, Input, Modal, Select, Space, Spin, Table, Tag, Typography, message, Tooltip } from "antd";
import { Mail, CheckCircle, XCircle } from "lucide-react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Lock,
  LockOpen,
  Pencil,
  RefreshCw,
  Save,
  Send,
  Shield,
  Sparkles,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { fetchAgreementDetailRequest, updateCurrentAgreement } from "@/store/modules/agreements/agreementsSlice";
import { selectCurrentAgreement, selectAgreementsLoading } from "@/store/modules/agreements/agreementsSelectors";
import { BRDContentEditor } from "@/components/features/BRD/BRDContentEditor";
import { SmartContentRenderer } from "@/components/features/BRD/SmartContentRenderer";
import { storage } from "@/lib/utils/storage";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import type { AuditEvent } from "@/types/models/Agreement";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const signingStatusColor: Record<string, string> = {
  not_sent: "default",
  awaiting_client: "processing",
  awaiting_internal: "purple",
  partially_signed: "orange",
  fully_signed: "success",
  declined: "error",
};

const signingStatusLabel: Record<string, string> = {
  not_sent: "Not sent",
  awaiting_client: "Awaiting client signature",
  awaiting_internal: "Awaiting your signature",
  partially_signed: "Partially signed",
  fully_signed: "Fully Signed",
  declined: "Declined",
};

// ─── Agent step types for streaming UI ───────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  party_context: "Party & Context Analyst",
  obligations_rights: "Obligations & Rights Analyst",
  commercial_terms: "Commercial Terms Analyst",
  legal_compliance: "Legal & Compliance Analyst",
  composer: "Agreement Composer",
  reviewer: "Agreement Reviewer",
};

const AGENT_ORDER = ["party_context", "obligations_rights", "commercial_terms", "legal_compliance", "composer", "reviewer"];

export default function AgreementDetailPage() {
  const { agreementId } = useParams() as { agreementId: string };
  const dispatch = useAppDispatch();
  const router = useRouter();
  const agreement = useAppSelector(selectCurrentAgreement);
  const isLoading = useAppSelector(selectAgreementsLoading);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editName, setEditName] = useState("");
  const [editPartyRole, setEditPartyRole] = useState("Client");
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false);
  const [sendForm] = Form.useForm();
  const [isSigning, setIsSigning] = useState(false);
  const [isSharingReview, setIsSharingReview] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const [officialSignatory, setOfficialSignatory] = useState<{ name?: string; title?: string; email?: string } | null>(null);

  // AI generation streaming
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);
  const [agentTokens, setAgentTokens] = useState<Record<string, string>>({});
  const esRef = useRef<EventSource | null>(null);

  // Password
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchAgreementDetailRequest(agreementId));
    fetch(`${API_BASE_URL}/api/v1/branding`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.officialSignatoryName) {
          setOfficialSignatory({
            name: j.data.officialSignatoryName,
            title: j.data.officialSignatoryTitle || undefined,
            email: j.data.officialSignatoryEmail || undefined,
          });
        }
      })
      .catch(() => {});

    // Start SSE stream if ?generating=true&jobId=xxx (read from window.location to avoid Suspense requirement)
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const jobId = urlParams?.get("jobId");
    if (urlParams?.get("generating") === "true" && jobId) {
      const token = storage.getAccessToken();
      const url = `${API_BASE_URL}/api/v1/agreements/jobs/${jobId}/stream${token ? `?token=${token}` : ""}`;
      setIsGenerating(true);
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          const { type, data } = payload;

          if (type === "agent_start") {
            setCurrentAgent(data.agentName);
          } else if (type === "agent_token") {
            setAgentTokens((prev) => ({
              ...prev,
              [data.agentName]: (prev[data.agentName] || "") + data.token,
            }));
          } else if (type === "agent_complete") {
            setCompletedAgents((prev) => [...prev, data.agentName]);
            setCurrentAgent(null);
          } else if (type === "done") {
            es.close();
            setIsGenerating(false);
            setGenerationDone(true);
            setCurrentAgent(null);
            // Reload the agreement to get the generated content
            dispatch(fetchAgreementDetailRequest(agreementId));
            message.success("Agreement generated successfully!");
            // Remove query params
            router.replace(`${APP_ROUTES.agreements}/${agreementId}`);
          } else if (type === "error") {
            es.close();
            setIsGenerating(false);
            message.error("Generation failed: " + (data.message || "Unknown error"));
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        es.close();
        setIsGenerating(false);
      };

      return () => { es.close(); };
    }
  }, [agreementId, dispatch]); // eslint-disable-line

  useEffect(() => {
    if (agreement) {
      setEditContent(agreement.content || "");
      setEditName(agreement.name || "");
      setEditPartyRole(agreement.externalPartyRole || "Client");
    }
  }, [agreement?.id]); // eslint-disable-line

  const authHeaders = () => {
    const token = storage.getAccessToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const handleSave = async () => {
    if (!agreement || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ name: editName, content: editContent, external_party_role: editPartyRole }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      dispatch(updateCurrentAgreement(json.data));
      setIsEditing(false);
      message.success("Saved");
    } catch {
      message.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = () => {
    // Pre-fill client email from the linked account if available.
    const prefillEmail = (agreement as never as { clientEmail?: string })?.clientEmail || "";
    const prefillName = agreement?.clientName || "";
    sendForm.setFieldsValue({ clientEmail: prefillEmail, clientName: prefillName, message: "" });
    setSendDrawerOpen(true);
  };

  const handleSendSubmit = async () => {
    try {
      const values = await sendForm.validateFields();
      setIsSending(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}/send`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: values.clientEmail,
          clientName: values.clientName || null,
          message: values.message || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed");
      const json = await res.json();
      dispatch(updateCurrentAgreement(json.data));
      setSendDrawerOpen(false);
      sendForm.resetFields();
      message.success(`Signing invite sent to ${values.clientEmail}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send";
      message.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleSignInternal = () => {
    Modal.confirm({
      title: "Sign this Agreement",
      content: officialSignatory?.name
        ? `Signing as: ${officialSignatory.name}${officialSignatory.title ? ` (${officialSignatory.title})` : ""}. This action is legally binding and recorded in the audit trail.`
        : "By confirming, you are electronically signing this agreement. This action is recorded in the audit trail.",
      okText: "Sign Now",
      onOk: async () => {
        setIsSigning(true);
        try {
          const token = storage.getAccessToken();
          const res = await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}/sign-internal`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error();
          const json = await res.json();
          dispatch(updateCurrentAgreement(json.data));
          message.success("Signed successfully!");
        } catch {
          message.error("Failed to sign");
        } finally {
          setIsSigning(false);
        }
      },
    });
  };

  const handleShareForReview = async () => {
    if (!agreement || isSharingReview) return;
    setIsSharingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}/share-for-review`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      dispatch(updateCurrentAgreement(json.data));
      message.success("Review link is now active. Share it with your " + (agreement.externalPartyRole || "client") + ".");
    } catch {
      message.error("Failed to share for review");
    } finally {
      setIsSharingReview(false);
    }
  };

  const handleUnshareReview = async () => {
    if (!agreement || isSharingReview) return;
    setIsSharingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}/unshare-review`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      dispatch(updateCurrentAgreement(json.data));
      message.success("Review link deactivated.");
    } catch {
      message.error("Failed to stop review sharing");
    } finally {
      setIsSharingReview(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!agreement?.shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/agreements/sign/${agreement.shareToken}`);
    message.success("Share link copied!");
  };

  const handleSetPassword = async (remove = false) => {
    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}/set-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ password: remove ? null : newPassword }),
      });
      if (!res.ok) throw new Error();
      dispatch(updateCurrentAgreement({
        isPasswordProtected: !remove,
      }));
      setPasswordModalOpen(false);
      setNewPassword("");
      message.success(remove ? "Password removed" : "Password set");
    } catch {
      message.error("Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete Agreement",
      content: `Delete "${agreement?.name}"? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = storage.getAccessToken();
          await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          message.success("Deleted");
          router.replace(APP_ROUTES.agreements);
        } catch {
          message.error("Failed to delete");
        }
      },
    });
  };

  const loadAuditEvents = async () => {
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}/audit-events`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setAuditEvents(json.data || []);
        setShowAudit(true);
      }
    } catch { /* silent */ }
  };

  if (isLoading && !agreement) {
    return <div className="flex justify-center items-center py-32"><Spin size="large" /></div>;
  }

  if (!agreement) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <FileText className="w-16 h-16 mb-4 text-zinc-300" />
        <Typography.Text className="text-zinc-500">Agreement not found</Typography.Text>
      </div>
    );
  }

  const isDraft = agreement.status === "draft";
  const isReview = agreement.status === "review";
  const isSent = agreement.status === "sent";
  const isFullySigned = agreement.status === "fully_signed";
  const isEditable = isDraft || isReview;
  const canInternalSign = isSent && agreement.signingStatus === "awaiting_internal";
  const isLocked = agreement.isLocked;

  // ── Generation overlay ────────────────────────────────────────────────────
  if (isGenerating || (generationDone && !agreement?.content)) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="mb-6">
          <Link href={APP_ROUTES.agreements} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Agreements
          </Link>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Generating Agreement</h2>
              <p className="text-xs text-zinc-500">Our AI legal pipeline is drafting your agreement...</p>
            </div>
          </div>
          <div className="space-y-3">
            {AGENT_ORDER.map((agentName) => {
              const label = AGENT_LABELS[agentName] || agentName;
              const isDone = completedAgents.includes(agentName);
              const isActive = currentAgent === agentName;
              const tokenCount = agentTokens[agentName]?.length || 0;

              return (
                <div key={agentName} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${isDone ? "bg-emerald-50 border-emerald-200" : isActive ? "bg-purple-50 border-purple-200" : "bg-zinc-50 border-zinc-100"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-100" : isActive ? "bg-purple-100" : "bg-zinc-200"}`}>
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : isActive ? (
                      <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${isDone ? "text-emerald-800" : isActive ? "text-purple-800" : "text-zinc-500"}`}>{label}</p>
                    {isActive && tokenCount > 0 && (
                      <p className="text-[10px] text-purple-500 mt-0.5">{tokenCount.toLocaleString()} characters generated...</p>
                    )}
                    {isDone && (
                      <p className="text-[10px] text-emerald-600 mt-0.5">Complete — {(agentTokens[agentName]?.length || 0).toLocaleString()} characters</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {generationDone && (
            <div className="mt-6 flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Agreement generated — loading content...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <div className="mb-4">
        <Link href={APP_ROUTES.agreements} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Agreements
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-xl font-bold text-zinc-900 border-b-2 border-zinc-900 outline-none bg-transparent w-full max-w-lg"
              placeholder="Agreement name"
            />
          ) : (
            <h1 className="text-xl font-bold text-zinc-900 truncate">{agreement.name}</h1>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {isReview && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 shrink-0">
                Under Review
              </span>
            )}
            {!isReview && (() => {
              const statusStyles: Record<string, string> = {
                not_sent: "text-zinc-500 bg-zinc-100 border-zinc-200",
                awaiting_client: "text-blue-700 bg-blue-50 border-blue-200",
                awaiting_internal: "text-purple-700 bg-purple-50 border-purple-200",
                partially_signed: "text-orange-700 bg-orange-50 border-orange-200",
                fully_signed: "text-emerald-700 bg-emerald-50 border-emerald-200",
                declined: "text-red-600 bg-red-50 border-red-200",
              };
              return (
                <span className={`inline-flex items-center text-[10px] font-semibold border rounded-full px-2.5 py-0.5 shrink-0 ${statusStyles[agreement.signingStatus] || "text-zinc-500 bg-zinc-100 border-zinc-200"}`}>
                  {signingStatusLabel[agreement.signingStatus] || agreement.signingStatus}
                </span>
              );
            })()}
            {agreement.clientName && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {agreement.clientName}
              </span>
            )}
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(agreement.createdAt)}
            </span>
            {/* External party role — editable in draft/review, read-only otherwise */}
            {isEditable && isEditing ? (
              <Select
                size="small"
                value={editPartyRole}
                onChange={(v) => setEditPartyRole(v)}
                style={{ minWidth: 120 }}
                options={["Client", "Partner", "Vendor", "Consultant", "Contractor"].map((r) => ({ label: r, value: r }))}
              />
            ) : (
              <Tooltip title="External party role">
                <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full border border-zinc-200">
                  {agreement.externalPartyRole || "Client"}
                </span>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isEditable && !isEditing && (
            <Button icon={<Pencil className="w-3.5 h-3.5" />} size="small" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button icon={<X className="w-3.5 h-3.5" />} size="small" onClick={() => { setIsEditing(false); setEditContent(agreement.content || ""); setEditName(agreement.name || ""); }} disabled={isSaving}>
                Cancel
              </Button>
              <Button icon={<Save className="w-3.5 h-3.5" />} size="small" type="primary" onClick={handleSave} loading={isSaving} className="!bg-zinc-900">
                Save
              </Button>
            </>
          )}
          {/* Share for Review — shown on draft when not editing */}
          {isDraft && !isEditing && (
            <Tooltip title="Share a read-only preview link before sending for signing">
              <Button icon={<Eye className="w-3.5 h-3.5" />} size="small" onClick={handleShareForReview} loading={isSharingReview}>
                Share for Review
              </Button>
            </Tooltip>
          )}
          {/* Stop sharing review */}
          {isReview && !isEditing && (
            <>
              <Button icon={<Copy className="w-3.5 h-3.5" />} size="small" onClick={handleCopyShareLink}>
                Copy Review Link
              </Button>
              <Button icon={<EyeOff className="w-3.5 h-3.5" />} size="small" onClick={handleUnshareReview} loading={isSharingReview}>
                Stop Sharing
              </Button>
            </>
          )}
          {/* Send for Signing — available in draft and review */}
          {isEditable && !isEditing && (
            <Button icon={<Send className="w-3.5 h-3.5" />} size="small" type="primary" className="!bg-zinc-900" onClick={handleSend} loading={isSending}>
              Send for Signing
            </Button>
          )}
          {(isSent || isFullySigned) && (
            <>
              <Button icon={<Copy className="w-3.5 h-3.5" />} size="small" onClick={handleCopyShareLink}>
                Copy {agreement.externalPartyRole || "Client"} Link
              </Button>
              {agreement.isPasswordProtected ? (
                <Button icon={<LockOpen className="w-3.5 h-3.5" />} size="small" danger onClick={() => handleSetPassword(true)} loading={savingPassword}>
                  Remove Password
                </Button>
              ) : (
                <Button icon={<Lock className="w-3.5 h-3.5" />} size="small" onClick={() => setPasswordModalOpen(true)}>
                  Set Password
                </Button>
              )}
            </>
          )}
          {canInternalSign && (
            <Button icon={<CheckCircle2 className="w-3.5 h-3.5" />} size="small" type="primary" className="!bg-emerald-700" onClick={handleSignInternal} loading={isSigning}>
              Sign Now
            </Button>
          )}
          <Button icon={<RefreshCw className="w-3.5 h-3.5" />} size="small" onClick={() => dispatch(fetchAgreementDetailRequest(agreementId))} />
          <Button icon={<Trash2 className="w-3.5 h-3.5" />} size="small" danger onClick={handleDelete} />
        </div>

        {/* Password modal */}
        <Modal
          title="Set Share Password"
          open={passwordModalOpen}
          onCancel={() => { setPasswordModalOpen(false); setNewPassword(""); }}
          onOk={() => handleSetPassword(false)}
          okText="Set Password"
          confirmLoading={savingPassword}
          okButtonProps={{ disabled: newPassword.length < 4 }}
        >
          <p className="text-sm text-zinc-500 mb-4">
            The client will need this password to open the signing link.
          </p>
          <Input.Password
            placeholder="Enter a password (min 4 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onPressEnter={() => newPassword.length >= 4 && handleSetPassword(false)}
            autoFocus
          />
        </Modal>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            This agreement is fully signed and locked. Document content cannot be changed.
          </p>
        </div>
      )}

      {/* Review sharing banner */}
      {isReview && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Eye className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              This document is <strong>shared for review</strong>. The {agreement.externalPartyRole || "client"} can read it but cannot sign yet. You can still edit it.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="small" icon={<Copy className="w-3 h-3" />} onClick={handleCopyShareLink}>
              Copy Link
            </Button>
          </div>
        </div>
      )}

      {/* Signing required banner */}
      {canInternalSign && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>The client has signed. <strong>Your signature is required</strong> to complete this agreement.</span>
          </div>
          <Button size="small" type="primary" className="!bg-emerald-700 shrink-0 ml-4" onClick={handleSignInternal} loading={isSigning}>
            Sign Now
          </Button>
        </div>
      )}

      {/* Signatures summary */}
      {agreement.signatures.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Signatures</p>
          <div className="space-y-2">
            {agreement.signatures.map((sig, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${sig.role === "client" ? "bg-blue-100" : "bg-emerald-100"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${sig.role === "client" ? "text-blue-600" : "text-emerald-600"}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-800">{sig.signerName}</p>
                  <p className="text-[10px] text-zinc-400">
                    {sig.signerEmail}
                    {" · "}
                    {sig.role === "internal" ? (sig.signerTitle || "Authorized Signatory") : (agreement.externalPartyRole || "Client")}
                    {" · "}
                    {sig.signedAt ? formatDate(sig.signedAt) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document content */}
      <div className="mb-6">
        {isEditing ? (
          <BRDContentEditor content={editContent} onChange={setEditContent} disabled={isSaving} />
        ) : agreement.content ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <SmartContentRenderer content={agreement.content} />
          </div>
        ) : (
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No content yet.</p>
            <Button size="small" className="mt-3" onClick={() => setIsEditing(true)}>
              Start writing
            </Button>
          </div>
        )}
      </div>

      {/* Email History */}
      {(isSent || isFullySigned) && (
        <EmailHistorySection agreementId={agreementId} />
      )}

      {/* Send for Signing Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-zinc-500" />
            <span>Send for Signing</span>
          </div>
        }
        open={sendDrawerOpen}
        width={480}
        onClose={() => { setSendDrawerOpen(false); sendForm.resetFields(); }}
        destroyOnClose
        footer={
          <Space className="w-full justify-end">
            <Button onClick={() => { setSendDrawerOpen(false); sendForm.resetFields(); }}>
              Cancel
            </Button>
            <Button type="primary" onClick={handleSendSubmit} loading={isSending} icon={<Send className="w-3.5 h-3.5" />}>
              Send Invite
            </Button>
          </Space>
        }
      >
        <Form form={sendForm} layout="vertical">
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Once sent, the document content will be <strong>locked</strong> and cannot be edited.
          </div>

          <Form.Item
            name="clientEmail"
            label="Client Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="client@example.com" prefix={<Mail className="w-3.5 h-3.5 text-zinc-400" />} />
          </Form.Item>

          <Form.Item name="clientName" label="Client Name (optional)">
            <Input placeholder="e.g. John Smith" />
          </Form.Item>

          <Form.Item name="message" label="Personal Message (optional)">
            <Input.TextArea
              rows={3}
              placeholder="Add a personal note to include in the email…"
            />
          </Form.Item>

          <div className="text-xs text-zinc-400 mt-1">
            The signing link and document details will be included automatically.
          </div>
        </Form>
      </Drawer>

      {/* Audit trail */}
      {(isSent || isFullySigned) && (
        <div>
          <button
            onClick={() => showAudit ? setShowAudit(false) : loadAuditEvents()}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 mb-3 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            {showAudit ? "Hide" : "View"} Audit Trail
          </button>
          {showAudit && auditEvents.length > 0 && (
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              {auditEvents.map((e, idx) => (
                <div key={idx} className="flex items-start gap-3 px-5 py-3 border-b border-zinc-50 last:border-0 bg-white">
                  <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-3 h-3 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-zinc-800">{e.eventType.replace(/_/g, " ")}</span>
                      {e.actorEmail && <span className="text-[10px] text-zinc-400">{e.actorEmail}</span>}
                      {e.actorRole && <span className="text-[10px] text-zinc-400">({e.actorRole})</span>}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">{e.currentHash}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">{formatDate(e.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Email History Section ──────────────────────────────────────────────────

interface EmailLogEntry {
  id: string;
  toEmail: string;
  toName?: string | null;
  subject: string;
  templateLabel: string;
  status: "sent" | "failed";
  error?: string | null;
  sentAt: string;
}

function EmailHistorySection({ agreementId }: { agreementId: string }) {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const load = async () => {
    setLoading(true);
    try {
      const token = typeof window !== "undefined"
        ? localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
        : null;
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/${agreementId}/email-log`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => { if (!visible) load(); setVisible((v) => !v); }}
        className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 mb-3 transition-colors"
      >
        <Mail className="w-3.5 h-3.5" />
        {visible ? "Hide" : "View"} Email History
      </button>

      {visible && (
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-6 text-center text-sm text-zinc-400">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-400">No emails sent yet.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 px-5 py-3 border-b border-zinc-50 last:border-0 bg-white"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  {log.status === "sent"
                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                    : <XCircle className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-800">{log.templateLabel}</span>
                    <span className="text-[10px] text-zinc-400">to {log.toName ? `${log.toName} <${log.toEmail}>` : log.toEmail}</span>
                    <Tag
                      color={log.status === "sent" ? "green" : "red"}
                      className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none"
                    >
                      {log.status}
                    </Tag>
                  </div>
                  {log.error && (
                    <p className="text-[10px] text-red-400 mt-0.5 truncate">{log.error}</p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 shrink-0">
                  {new Date(log.sentAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
