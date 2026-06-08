"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Tag, Typography, Spin, Input, Checkbox, Button, Space, message, Divider } from "antd";
import { FileText, CheckCircle, XCircle, PenLine, ShieldCheck } from "lucide-react";
import axios from "axios";
import { MarkdownRenderer } from "@/components/features/ProposalIntelligence/MarkdownRenderer";

interface SignatureData {
  role: string;
  signerName: string;
  signerEmail: string;
  signedAt: string;
  ipAddress: string;
  signatureStyle: string;
}

interface SharedProposal {
  id: string;
  name: string;
  clientName?: string | null;
  projectName?: string | null;
  status: string;
  version: number;
  isAiGenerated: boolean;
  aiContent?: Record<string, string> | null;
  signingStatus: string;
  signatures: SignatureData[];
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<string, string> = {
  draft: "Draft", internal_review: "Internal Review", sent: "Sent",
  client_review: "Client Review", approved: "Approved", rejected: "Rejected", archived: "Archived",
};

const statusColors: Record<string, string> = {
  draft: "default", internal_review: "blue", sent: "purple",
  client_review: "orange", approved: "green", rejected: "red", archived: "default",
};

const signingStatusLabels: Record<string, { label: string; color: string }> = {
  not_sent: { label: "Not Sent", color: "default" },
  awaiting_client: { label: "Awaiting Client", color: "orange" },
  awaiting_internal: { label: "Awaiting Internal", color: "blue" },
  partially_signed: { label: "Partially Signed", color: "purple" },
  fully_signed: { label: "Fully Signed", color: "green" },
  declined: { label: "Declined", color: "red" },
};

function SignatureCertificate({ signatures }: { signatures: SignatureData[] }) {
  const fullySigned = signatures.length >= 2;

  const roleConfig: Record<string, { label: string; dot: string; tag: string }> = {
    client: { label: "Client", dot: "bg-blue-500", tag: "text-blue-700 bg-blue-100 border-blue-300" },
    internal: { label: "Internal", dot: "bg-emerald-500", tag: "text-emerald-700 bg-emerald-100 border-emerald-300" },
  };

  const sigRows = signatures.map((sig, i) => {
    const rc = roleConfig[sig.role] || roleConfig.internal;
    return (
      <div key={i}>
        {i > 0 && <div className="border-t border-amber-200/60 my-5" />}
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${rc.dot.replace("bg-", "bg-")}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span
                className="text-lg text-amber-900"
                style={{ fontFamily: "var(--font-great-vibes), 'Brush Script MT', cursive" }}
              >
                {sig.signerName}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${rc.tag}`}>
                {rc.label}
              </span>
            </div>
            <div className="space-y-0.5 text-xs">
              <p className="text-amber-700 m-0">{sig.signerEmail}</p>
              <p className="text-amber-600/70 m-0">
                {new Date(sig.signedAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <p className="text-amber-600/50 m-0">
                IP: {sig.ipAddress} &middot; {sig.signatureStyle} signature
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="bg-amber-50/80 rounded-2xl mb-8 border border-amber-200/60 shadow-sm overflow-hidden">
      <div className="p-8 md:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200/60 text-amber-800 text-xs font-semibold tracking-wide mb-4">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            Certificate of Electronic Signature
          </div>
          <h3 className="text-xl font-bold text-amber-950 mb-1">
            {fullySigned ? "Fully Signed & Executed" : "Signature Recorded"}
          </h3>
          <p className="text-sm text-amber-700/70 max-w-md mx-auto">
            This document has been electronically signed in accordance with applicable electronic signature laws.
          </p>
        </div>

        {/* Signatures heading */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-amber-200/60" />
          <span className="text-[10px] uppercase tracking-[3px] text-amber-600/50 font-medium">Signatures on Record</span>
          <div className="flex-1 h-px bg-amber-200/60" />
        </div>

        {/* Signatures */}
        <div className="max-w-lg mx-auto">{sigRows}</div>

        {/* Footer */}
        {fullySigned && (
          <div className="mt-8 pt-6 border-t border-amber-200/60 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              All parties have signed this document
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedProposalPage() {
  const params = useParams();
  const token = params.token as string;
  const [proposal, setProposal] = useState<SharedProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compliance signing state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [consentText, setConsentText] = useState("");
  const [consentVersion, setConsentVersion] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [signName, setSignName] = useState("");
  const [signEmail, setSignEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState<string | false>(false);
  const [declined, setDeclined] = useState(false);

  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const res = await axios.get(`${baseURL}/api/v1/proposals/share/${token}`);
        const data = res.data.data;
        setProposal(data);
        const existingClientSig = data.signatures?.find((s: SignatureData) => s.role === "client");
        if (existingClientSig) {
          setSigned(existingClientSig.signerName);
          setSignName(existingClientSig.signerName);
          setSignEmail(existingClientSig.signerEmail);
        } else {
          // Start a signing session for compliance flow
          const sessionRes = await axios.post(`${baseURL}/api/v1/proposals/share/${token}/session`);
          const sessionData = sessionRes.data.data;
          setSessionId(sessionData.sessionId);
          setConsentText(sessionData.consentText);
          setConsentVersion(sessionData.consentVersion);
        }
      } catch {
        setError("Proposal not found or link is invalid.");
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchProposal();
  }, [token]);

  const handleConsent = async () => {
    if (!sessionId) return;
    try {
      await axios.post(`${baseURL}/api/v1/proposals/share/${token}/consent`, {
        sessionId,
        consentVersion: consentVersion,
        agreed: true,
      });
      setConsentGiven(true);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.message
        ? err.response.data.message : "Something went wrong.";
      message.error(msg);
    }
  };

  const handleSign = async (action: "accept" | "reject") => {
    if (!signName.trim()) {
      message.error("Please enter your full name.");
      return;
    }
    if (!signEmail.trim()) {
      message.error("Please enter your email address.");
      return;
    }
    if (action === "accept" && !agree) {
      message.error("Please agree to the terms before signing.");
      return;
    }
    if (action === "accept" && !consentGiven) {
      message.error("You must consent to electronic signatures first.");
      return;
    }
    setSigning(true);
    try {
      const res = await axios.post(`${baseURL}/api/v1/proposals/share/${token}/compliance-sign`, {
        sessionId,
        signerName: signName.trim(),
        signerEmail: signEmail.trim(),
        action,
        signatureStyle: "typed",
        consentVersion: consentVersion,
        agreed: true,
      });
      setProposal(res.data.data);
      if (action === "accept") {
        setSigned(signName.trim());
      } else {
        setDeclined(true);
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.message
        ? err.response.data.message : "Something went wrong. Please try again.";
      message.error(msg);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
          <Typography.Title level={4} className="!text-zinc-500">{error || "Proposal not found"}</Typography.Title>
        </div>
      </div>
    );
  }

  const proposalContent = proposal.aiContent?.["proposal.md"];
  const isFullySigned = proposal.signingStatus === "fully_signed";
  const isDeclined = proposal.signingStatus === "declined";
  const certSignatures = proposal.signatures || [];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-sm" />
            </div>
            <span className="text-sm font-semibold text-zinc-500">APEX</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isFullySigned && (
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs whitespace-nowrap !m-0 !inline-flex !items-center !gap-1">
                <CheckCircle className="w-3 h-3 shrink-0" /> Signed
              </Tag>
            )}
            {isDeclined && (
              <Tag color="red" className="!rounded-full !px-3 !py-0.5 !text-xs whitespace-nowrap !m-0 !inline-flex !items-center !gap-1">
                <XCircle className="w-3 h-3 shrink-0" /> Declined
              </Tag>
            )}
            <Tag color={signingStatusLabels[proposal.signingStatus]?.color || "default"} className="!rounded-full !px-3 !py-0.5 !text-xs whitespace-nowrap !m-0">
              {signingStatusLabels[proposal.signingStatus]?.label || proposal.signingStatus}
            </Tag>
            <Tag color={statusColors[proposal.status] || "default"} className="!rounded-full !px-3 !py-0.5 !text-xs whitespace-nowrap !m-0">
              {statusLabels[proposal.status] || proposal.status}
            </Tag>
          </div>
        </div>

        <div className="mb-8">
          <Typography.Title level={2} className="!mb-2">{proposal.name}</Typography.Title>
          <Typography.Text className="text-zinc-500">
            {proposal.clientName && <>{proposal.clientName} &middot; </>}
            {proposal.projectName && <>Project: {proposal.projectName} &middot; </>}
            v{proposal.version} &middot; {new Date(proposal.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Typography.Text>
        </div>

        {proposalContent ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-8 mb-8">
            <MarkdownRenderer content={proposalContent} />
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <Typography.Text className="text-zinc-500">No proposal content available.</Typography.Text>
          </div>
        )}

        {signed ? (
          <SignatureCertificate signatures={certSignatures} />
        ) : declined ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-8">
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <Typography.Title level={4} className="!text-red-800 !mb-1">Proposal Declined</Typography.Title>
            <Typography.Text className="text-red-700">
              Recorded as declined by <strong>{signName}</strong>.
            </Typography.Text>
          </div>
        ) : !signed && certSignatures.length > 0 ? (
          <SignatureCertificate signatures={certSignatures} />
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <PenLine className="w-5 h-5 text-zinc-500" />
              <Typography.Text className="text-sm font-semibold text-zinc-700">Sign this Proposal</Typography.Text>
            </div>
            <div className="space-y-4 mx-auto max-w-xl">
              {/* Step 1: Electronic Signature Consent */}
              {!consentGiven && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <Typography.Text className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
                    Step 1: Electronic Signature Consent
                  </Typography.Text>
                  <div className="text-xs text-amber-800 whitespace-pre-line leading-relaxed">
                    {consentText}
                  </div>
                  <Checkbox
                    checked={agree}
                    onChange={(e) => {
                      setAgree(e.target.checked);
                      if (e.target.checked) handleConsent();
                    }}
                  >
                    <Typography.Text className="text-sm font-medium text-amber-900">
                      I agree to use an electronic signature and understand that my typed name constitutes a legally binding signature
                    </Typography.Text>
                  </Checkbox>
                </div>
              )}

              {/* Step 2: Signing form (shown after consent) */}
              {consentGiven && (
                <>
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium mb-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Electronic signature consent recorded
                  </div>
                  <div>
                    <Typography.Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Full Name</Typography.Text>
                    <Input
                      placeholder="Enter your full legal name"
                      value={signName}
                      onChange={(e) => setSignName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Typography.Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Email Address</Typography.Text>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={signEmail}
                      onChange={(e) => setSignEmail(e.target.value)}
                    />
                  </div>
                  {signName.trim() && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                      <Typography.Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-2">Your Signature</Typography.Text>
                      <div className="text-2xl text-zinc-800 border-b border-zinc-300 pb-2" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive" }}>
                        {signName.trim()}
                      </div>
                    </div>
                  )}
                  <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)}>
                    <Typography.Text className="text-sm text-zinc-600">
                      I have read and agree to the terms of this proposal
                    </Typography.Text>
                  </Checkbox>
                  <div className="flex gap-3">
                    <Button type="primary" icon={<CheckCircle className="w-4 h-4" />} loading={signing} onClick={() => handleSign("accept")} className="flex-1">
                      Accept & Sign
                    </Button>
                    <Button danger icon={<XCircle className="w-4 h-4" />} loading={signing} onClick={() => handleSign("reject")}>
                      Decline
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-zinc-400 pt-8 border-t border-zinc-200 mt-8">
          Powered by <span className="font-semibold text-zinc-500">APEX</span> &mdash; Proposal Studio
        </div>
      </div>
    </div>
  );
}
