"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Spin, Typography } from "antd";
import {
  BookText,
  Building2,
  Calendar,
  User,
  Printer,
  ArrowUp,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  MessageSquare,
  Send,
  AlertCircle,
} from "lucide-react";
import { BRDDocumentRenderer } from "@/components/features/BRD/BRDDocumentRenderer";
import type { BRD, BRDComment } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Branding {
  companyName: string;
  tagline: string | null;
  logoPath: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " at " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <div className="absolute bottom-0 left-0 h-0.5 bg-zinc-900 transition-all duration-100 print:hidden" style={{ width: `${pct}%` }} />;
}

// ─── Password Gate ────────────────────────────────────────────────────────────

function PasswordGate({
  brdName,
  clientName,
  logoUrl,
  companyName,
  onUnlock,
}: {
  brdName: string;
  clientName?: string | null;
  logoUrl: string | null;
  companyName: string;
  onUnlock: (brdData: BRD) => void;
}) {
  const { token } = useParams() as { token: string };
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = async () => {
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.detail || "Incorrect password");
        setLoading(false);
        return;
      }
      // Brief "unlocked" animation before revealing content
      setUnlocked(true);
      sessionStorage.setItem(`brd_unlocked_${token}`, "true");
      setTimeout(() => onUnlock(json.data as BRD), 900);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-sm z-10">

        {/* Lock icon — animates to open on success */}
        <div className="flex justify-center mb-6">
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
              unlocked
                ? "bg-emerald-500/20 border-emerald-500/40"
                : "bg-white/5 border-white/10"
            }`}
          >
            {unlocked ? (
              <LockOpen className="w-7 h-7 text-emerald-400" />
            ) : (
              <Lock className={`w-7 h-7 transition-colors duration-300 ${error ? "text-red-400" : "text-white/60"}`} />
            )}
          </div>
        </div>

        {/* Document info */}
        <div className="text-center mb-8">
          <h1 className="text-lg font-semibold text-white mb-1 leading-snug px-4">{brdName}</h1>
          {clientName && (
            <p className="text-xs text-zinc-500">{clientName}</p>
          )}
          <p className="text-xs text-zinc-600 mt-3">
            This document is confidential and password protected.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-2">
            Access Password
          </label>

          {/* Password field */}
          <div
            className={`flex items-center border rounded-xl px-4 mb-4 transition-all duration-200 ${
              error
                ? "border-red-500/50 bg-red-500/5"
                : "border-white/10 bg-white/5 focus-within:border-white/30 focus-within:bg-white/8"
            }`}
          >
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 py-3 outline-none"
              autoFocus
              disabled={unlocked}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors ml-2 shrink-0"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Unlock button */}
          <button
            onClick={handleUnlock}
            disabled={!password || loading || unlocked}
            className={`w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              unlocked
                ? "bg-emerald-500 text-white"
                : "bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {unlocked ? (
              <>
                <LockOpen className="w-4 h-4" />
                Access Granted
              </>
            ) : loading ? (
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Unlock Document
              </>
            )}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-zinc-700 text-center mt-6 leading-relaxed">
          Contact the document sender if you don&apos;t have the password.
          <br />This link is intended for authorised recipients only.
        </p>
      </div>
    </div>
  );
}

// ─── Comments section ─────────────────────────────────────────────────────────

function CommentsSection({ token }: { token: string }) {
  const [comments, setComments] = useState<BRDComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}/comments`);
        if (res.ok) {
          const json = await res.json();
          setComments(json.data || []);
        }
      } catch { /* silent */ } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [token]);

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commenter_name: name.trim(),
          commenter_email: email.trim() || null,
          content: content.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.detail || "Failed to post comment");
        return;
      }
      // Optimistic update
      setComments((prev) => [...prev, json.data as BRDComment]);
      setContent("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-t border-zinc-100 mt-16 pt-12 pb-20 print:hidden">
      <div className="max-w-2xl mx-auto px-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <MessageSquare className="w-5 h-5 text-zinc-600" />
          <h2 className="text-base font-bold text-zinc-900">
            Comments {comments.length > 0 && <span className="text-zinc-400 font-normal">({comments.length})</span>}
          </h2>
        </div>

        {/* Compose form */}
        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">Leave a comment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-zinc-200 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Email <span className="text-zinc-300">(optional)</span></label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-zinc-200 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-zinc-500 block mb-1">Comment <span className="text-red-400">*</span></label>
            <textarea
              placeholder="Share your feedback or questions about this document..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full border border-zinc-200 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors resize-none"
            />
            <div className="flex justify-end mt-0.5">
              <span className={`text-[11px] ${content.length > 1800 ? "text-red-500" : "text-zinc-300"}`}>
                {content.length}/2000
              </span>
            </div>
          </div>
          {submitError && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <p className="text-sm text-emerald-600 mb-3 font-medium">Comment posted successfully!</p>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !content.trim() || submitting}
              className="flex items-center gap-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl px-5 py-2.5 hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Post Comment
            </button>
          </div>
        </div>

        {/* Comments list */}
        {loadingComments ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-600 rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No comments yet. Be the first to leave feedback.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="bg-white border border-zinc-100 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {c.commenterName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{c.commenterName}</p>
                      {c.commenterEmail && (
                        <p className="text-xs text-zinc-400">{c.commenterEmail}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 sm:shrink-0 pl-10 sm:pl-0">{formatRelative(c.createdAt)}</p>
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SharedBRDPage() {
  const { token } = useParams() as { token: string };
  const [brd, setBrd] = useState<BRD | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isGated, setIsGated] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [brdRes, brandingRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}`),
          fetch(`${API_BASE_URL}/api/v1/branding`),
        ]);

        if (brdRes.status === "fulfilled" && brdRes.value.ok) {
          const json = await brdRes.value.json();
          const data = json.data as BRD;

          if (data.isPasswordProtected) {
            // Check if already unlocked in this session
            const unlocked = sessionStorage.getItem(`brd_unlocked_${token}`);
            if (unlocked) {
              // Re-verify silently — for now just show the gate metadata
              // The user will need to re-enter on a new session (intended behaviour)
              setIsGated(true);
              setBrd(data);
            } else {
              setIsGated(true);
              setBrd(data);
            }
          } else {
            setBrd(data);
          }
        } else {
          setNotFound(true);
        }

        if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
          const json = await brandingRes.value.json();
          const d = json.data;
          setBranding({ companyName: d.companyName || "", tagline: d.tagline || null, logoPath: d.logoPath || null });
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const companyName = branding?.companyName || "Business Analysis Team";
  const tagline = branding?.tagline || null;
  const logoUrl = branding?.logoPath ? `${API_BASE_URL}${branding.logoPath}` : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (notFound || !brd) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-6">
          <BookText className="w-8 h-8 text-zinc-400" />
        </div>
        <Typography.Title level={3} className="!text-zinc-700 !mb-2 !font-semibold">Document not found</Typography.Title>
        <Typography.Text className="text-zinc-400 text-center max-w-xs">
          This document is not available or the link has expired.
        </Typography.Text>
      </div>
    );
  }

  // Show password gate if protected and not yet unlocked
  if (isGated && !brd.aiContent) {
    return (
      <PasswordGate
        brdName={brd.name}
        clientName={brd.clientName}
        logoUrl={logoUrl}
        companyName={companyName}
        onUnlock={(unlockedBrd) => {
          setBrd(unlockedBrd);
          setIsGated(false);
        }}
      />
    );
  }

  const aiContent = brd.aiContent || {};
  const documentContent = aiContent["improved-brd.md"] || aiContent["brd.md"] || "";

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Sticky header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-30 print:hidden">
        <div className="relative">
          <ReadingProgress />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-8 w-auto object-contain shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                  <BookText className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 leading-none truncate">{companyName}</p>
                {tagline && <p className="text-[11px] text-zinc-400 leading-none mt-0.5 truncate">{tagline}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {brd.isPasswordProtected && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1">
                  <Lock className="w-3 h-3" />
                  Protected
                </div>
              )}
              <span className="hidden sm:block text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1">
                Confidential · Read-only
              </span>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Cover block */}
        <div className="py-8 sm:py-14 border-b border-zinc-100 mb-8 sm:mb-12 print:py-8 print:mb-8">
          {logoUrl && (
            <div className="hidden print:block mb-8">
              <img src={logoUrl} alt={companyName} className="h-12 w-auto object-contain" />
            </div>
          )}
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Business Requirements Document
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold text-zinc-900 leading-tight mb-6 sm:mb-8 tracking-tight">
              {brd.name}
            </h1>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-8">
              {brd.clientName && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Prepared For</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                    <p className="text-sm font-semibold text-zinc-800">{brd.clientName}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Prepared By</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-800">{companyName}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-800">{formatDate(brd.createdAt)}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Version</p>
                <p className="text-sm font-semibold text-zinc-800">1.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Document body */}
        {documentContent ? (
          <div className="pb-12">
            <BRDDocumentRenderer content={documentContent} />
          </div>
        ) : (
          <div className="py-24 text-center">
            <BookText className="w-14 h-14 text-zinc-200 mx-auto mb-4" />
            <Typography.Text className="text-zinc-400">Document content is not yet available.</Typography.Text>
          </div>
        )}

        {/* Comments section */}
        <CommentsSection token={token} />
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-100 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-5 w-auto object-contain opacity-40" />
            ) : (
              <div className="w-5 h-5 rounded bg-zinc-200 flex items-center justify-center">
                <BookText className="w-3 h-3 text-zinc-400" />
              </div>
            )}
            <p className="text-xs text-zinc-400">{companyName}</p>
          </div>
          <p className="text-xs text-zinc-300">Generated with Apex BRD Intelligence</p>
        </div>
      </footer>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 w-10 h-10 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-700 transition-colors print:hidden z-20"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
