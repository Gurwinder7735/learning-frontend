"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin, Typography, Input, Checkbox, Button } from "antd";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  PenLine,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { SmartContentRenderer } from "@/components/features/BRD/SmartContentRenderer";
import type { Agreement } from "@/types/models/Agreement";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CONSENT_TEXT = `ELECTRONIC SIGNATURE CONSENT

By checking this box and clicking "Sign", you:
1. Consent to use electronic signatures for this document
2. Agree that your typed name constitutes your legally binding electronic signature
3. Confirm you have read and understand this document
4. Agree to receive this document and related records electronically
5. Understand you can withdraw consent at any time before signing

Your IP address, browser information, and device data will be logged as part of the audit trail.`;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Password Gate ────────────────────────────────────────────────────────────

function PasswordGate({ name, onUnlock }: { name: string; onUnlock: (data: Agreement) => void }) {
  const { token } = useParams() as { token: string };
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.detail || "Incorrect password"); return; }
      onUnlock(json.data as Agreement);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-white/60" />
          </div>
        </div>
        <div className="text-center mb-7">
          <h1 className="text-lg font-bold text-white mb-1">{name}</h1>
          <p className="text-xs text-zinc-500">This document is password protected.</p>
        </div>
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
          <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Access Password</label>
          <div className={`flex items-center border rounded-xl px-4 mb-4 transition-colors ${error ? "border-red-500/50 bg-red-500/5" : "border-white/10 bg-white/5 focus-within:border-white/30"}`}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 py-3 outline-none"
              autoFocus
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-600 hover:text-zinc-400 ml-2">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
          <button
            onClick={handleUnlock}
            disabled={!password || loading}
            className="w-full bg-white text-zinc-900 rounded-xl py-3 text-sm font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> Unlock Document</>}
          </button>
        </div>
        <p className="text-[11px] text-zinc-700 text-center mt-5">Contact the sender if you don&apos;t have the password.</p>
      </div>
    </div>
  );
}

// ─── Certificate ──────────────────────────────────────────────────────────────

function SignatureCertificate({ signatures, externalPartyRole }: { signatures: Agreement["signatures"]; externalPartyRole?: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden mb-8">
      <div className="p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            Certificate of Electronic Signature
          </div>
          <h3 className="text-xl font-bold text-amber-950 mb-1">
            {signatures.length >= 2 ? "Fully Signed & Executed" : "Signature Recorded"}
          </h3>
          <p className="text-sm text-amber-700/70 max-w-md mx-auto">
            This document has been electronically signed in accordance with applicable electronic signature laws.
          </p>
        </div>
        <div className="space-y-4">
          {signatures.map((sig, idx) => (
            <div key={idx} className={idx > 0 ? "pt-4 border-t border-amber-200" : ""}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${sig.role === "client" ? "bg-blue-500" : "bg-emerald-500"}`} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg text-amber-900" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                      {sig.signerName}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${sig.role === "client" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"}`}>
                      {sig.role === "internal" ? (sig.signerTitle || "Authorized Signatory") : (externalPartyRole || "Client")}
                    </span>
                  </div>
                  <p className="text-xs text-amber-700">{sig.signerEmail}</p>
                  {sig.signerTitle && sig.role === "internal" && (
                    <p className="text-xs text-amber-700/80 font-medium">{sig.signerTitle}</p>
                  )}
                  {sig.signedAt && <p className="text-xs text-amber-600/70">{formatDate(sig.signedAt)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {signatures.length >= 2 && (
          <div className="mt-6 pt-4 border-t border-amber-200 text-center">
            <span className="text-xs text-emerald-700 font-medium flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> All parties have signed this document
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgreementSignPage() {
  const { token } = useParams() as { token: string };
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPasswordGate, setIsPasswordGate] = useState(false);
  const [branding, setBranding] = useState<{ companyName: string; tagline: string | null; logoPath: string | null } | null>(null);

  // Signing flow state
  const [sessionId, setSessionId] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [signName, setSignName] = useState("");
  const [signEmail, setSignEmail] = useState("");
  const [signing, setSigning] = useState(false);
  const [signedAs, setSignedAs] = useState<string | null>(null);
  const [isDeclined, setIsDeclined] = useState(false);

  const loadAgreement = async () => {
    try {
      const [agreementRes, brandingRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/v1/agreements/share/${token}`),
        fetch(`${API_BASE_URL}/api/v1/branding`),
      ]);

      if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
        const bj = await brandingRes.value.json();
        const d = bj.data;
        setBranding({ companyName: d.companyName || "", tagline: d.tagline || null, logoPath: d.logoPath || null });
      }

      if (agreementRes.status === "fulfilled" && agreementRes.value.ok) {
        const json = await agreementRes.value.json();
        const data = json.data as Agreement;
        if (data.isPasswordProtected && !data.content) {
          setIsPasswordGate(true);
          setAgreement(data);
        } else {
          await initAgreement(data);
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const initAgreement = async (data: Agreement) => {
    setAgreement(data);
    const existingClientSig = data.signatures?.find((s) => s.role === "client");
    if (existingClientSig) {
      setSignedAs(existingClientSig.signerName);
      setSignName(existingClientSig.signerName);
      setSignEmail(existingClientSig.signerEmail || "");
    } else if (data.signingStatus !== "fully_signed" && data.signingStatus !== "declined") {
      // Start signing session
      const sessionRes = await fetch(`${API_BASE_URL}/api/v1/agreements/share/${token}/session`, { method: "POST" });
      if (sessionRes.ok) {
        const sj = await sessionRes.json();
        setSessionId(sj.data.sessionId);
      }
    }
  };

  useEffect(() => { loadAgreement(); }, [token]); // eslint-disable-line

  const handleConsent = async () => {
    if (!sessionId || consentGiven) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/share/${token}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, consent_version: "1.0" }),
      });
      if (res.ok) setConsentGiven(true);
    } catch { /* silent */ }
  };

  const handleSign = async (action: "sign" | "reject") => {
    if (!signName.trim() || !signEmail.trim()) return;
    setSigning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agreements/share/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_name: signName.trim(),
          signer_email: signEmail.trim(),
          session_id: sessionId,
          signature_style: "typed",
          consent_version: "1.0",
          agreed: true,
          action,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed");
      setAgreement(json.data);
      if (action === "sign") setSignedAs(signName.trim());
      else setIsDeclined(true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><Spin size="large" /></div>;
  }

  if (notFound || !agreement) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8">
        <FileText className="w-16 h-16 text-zinc-300 mb-4" />
        <Typography.Title level={4} className="!text-zinc-500">Document not found</Typography.Title>
        <p className="text-sm text-zinc-400 text-center max-w-xs">This signing link is invalid or has expired.</p>
      </div>
    );
  }

  if (isPasswordGate && !agreement.content) {
    return <PasswordGate name={agreement.name} onUnlock={(data) => { setIsPasswordGate(false); initAgreement(data); }} />;
  }

  const isReviewMode = agreement.status === "review";
  const isFullySigned = agreement.signingStatus === "fully_signed" || agreement.status === "fully_signed";
  const alreadyDeclined = agreement.signingStatus === "declined";
  const clientAlreadySigned = !!agreement.signatures?.find((s) => s.role === "client");

  // Shared branded header used in both review and signing views
  const BrandedHeader = (
    <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {branding?.logoPath ? (
            <img
              src={`${API_BASE_URL}${branding.logoPath}`}
              alt={branding.companyName}
              className="h-16 w-auto object-contain shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
          )}
          {branding?.companyName && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 leading-none truncate">{branding.companyName}</p>
              {branding.tagline && <p className="text-[11px] text-zinc-400 leading-none mt-0.5 truncate">{branding.tagline}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs text-zinc-400">Confidential · Read-only</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors print:hidden"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </header>
  );

  // ── Review-only mode (document not yet ready for signing) ──────────────────
  if (isReviewMode) {
    return (
      <div className="min-h-screen bg-zinc-50">
        {BrandedHeader}
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Review notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900 mb-1">Document under review</h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                This document has been shared with you for review only. You can read its contents, but it is not yet ready for signing.
                You will receive a separate link when the document is finalised and ready for your signature.
              </p>
            </div>
          </div>

          {/* Cover */}
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Draft — For Review</p>
            <h1 className="text-3xl font-bold text-zinc-900 mb-3">{agreement.name}</h1>
            {agreement.clientName && (
              <p className="text-sm text-zinc-500">Prepared for <strong className="text-zinc-700">{agreement.clientName}</strong></p>
            )}
          </div>

          {/* Document content */}
          {agreement.content && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 mb-8">
              <SmartContentRenderer content={agreement.content} />
            </div>
          )}

          <footer className="border-t border-zinc-100 mt-4 print:hidden">
            <div className="max-w-6xl mx-auto py-4 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-zinc-300">
                {branding?.companyName ? `${branding.companyName} · ` : ""}Review copy — not for signature
              </p>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      {BrandedHeader}

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Cover */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Document for Signature</p>
          <h1 className="text-3xl font-bold text-zinc-900 mb-3">{agreement.name}</h1>
          {agreement.clientName && (
            <p className="text-sm text-zinc-500">Prepared for <strong className="text-zinc-700">{agreement.clientName}</strong></p>
          )}
        </div>

        {/* Document content */}
        {agreement.content && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 mb-8">
            <SmartContentRenderer content={agreement.content} />
          </div>
        )}

        {/* Signature section */}
        {(isFullySigned || signedAs || alreadyDeclined || isDeclined) ? (
          <>
            {(isDeclined || alreadyDeclined) && !isFullySigned ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center mb-8">
                <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-red-800 mb-1">Agreement Declined</h3>
                <p className="text-sm text-red-600">This agreement was declined.</p>
              </div>
            ) : (
              <SignatureCertificate signatures={agreement.signatures || []} externalPartyRole={agreement.externalPartyRole} />
            )}
          </>
        ) : clientAlreadySigned ? (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center mb-8">
            <CheckCircle2 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-blue-800">You have already signed this document.</p>
            <p className="text-xs text-blue-600 mt-1">Waiting for the other party to sign.</p>
          </div>
        ) : (
          /* Signing form */
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <PenLine className="w-5 h-5 text-zinc-500" />
              <h2 className="text-sm font-bold text-zinc-800">Sign this Agreement</h2>
            </div>
            <div className="max-w-lg space-y-5">
              {/* Consent step */}
              {!consentGiven && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-3">Electronic Signature Consent</p>
                  <p className="text-xs text-amber-700 leading-relaxed whitespace-pre-line mb-4">{CONSENT_TEXT}</p>
                  <Checkbox
                    checked={agreeChecked}
                    onChange={(e) => {
                      setAgreeChecked(e.target.checked);
                      if (e.target.checked) handleConsent();
                    }}
                  >
                    <span className="text-sm font-medium text-amber-900">
                      I agree to use electronic signatures for this document
                    </span>
                  </Checkbox>
                </div>
              )}

              {consentGiven && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Electronic signature consent recorded
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Full Name</label>
                    <Input
                      placeholder="Enter your full legal name"
                      value={signName}
                      onChange={(e) => setSignName(e.target.value)}
                      size="large"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Email Address</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={signEmail}
                      onChange={(e) => setSignEmail(e.target.value)}
                      size="large"
                    />
                  </div>
                  {signName.trim() && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Your Signature</label>
                      <div className="text-2xl text-zinc-800 border-b border-zinc-300 pb-2" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>
                        {signName.trim()}
                      </div>
                    </div>
                  )}
                  <Checkbox checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)}>
                    <span className="text-sm text-zinc-600">I have read and agree to the terms of this agreement</span>
                  </Checkbox>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="primary"
                      size="large"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      loading={signing}
                      disabled={!signName.trim() || !signEmail.trim() || !agreeChecked}
                      onClick={() => handleSign("sign")}
                      className={`flex-1 ${!signName.trim() || !signEmail.trim() || !agreeChecked ? "!bg-zinc-200 !text-zinc-400 !border-zinc-200 cursor-not-allowed" : "!bg-zinc-900 !text-white"}`}
                    >
                      Accept & Sign
                    </Button>
                    <Button
                      danger
                      size="large"
                      icon={<XCircle className="w-4 h-4" />}
                      loading={signing}
                      onClick={() => handleSign("reject")}
                    >
                      Decline
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-zinc-100 mt-4 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-zinc-300">
            {branding?.companyName ? `${branding.companyName} · ` : ""}Legally binding electronic signature
          </p>
        </div>
      </footer>
    </div>
  );
}
