"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin } from "antd";
import { AlertCircle, Eye, EyeOff, FileSearch, FileText, Lock } from "lucide-react";
import { SmartContentRenderer } from "@/components/features/BRD/SmartContentRenderer";
import { InlineCommentLayer } from "@/components/features/BRD/InlineCommentLayer";
import type { SOWFeatureDoc } from "@/types/models/SOW";
import type { BRDComment } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const moduleColors: Record<string, string> = {
  "Auth": "bg-blue-50 text-blue-700 border-blue-200",
  "Core": "bg-purple-50 text-purple-700 border-purple-200",
  "Billing": "bg-amber-50 text-amber-700 border-amber-200",
  "Payments": "bg-amber-50 text-amber-700 border-amber-200",
  "Settings": "bg-zinc-100 text-zinc-600 border-zinc-200",
  "Dashboard": "bg-emerald-50 text-emerald-700 border-emerald-200",
};
function moduleColor(mod: string) {
  return moduleColors[mod] || "bg-zinc-100 text-zinc-600 border-zinc-200";
}

function PasswordGate({ name, onUnlock }: { name: string; onUnlock: (data: SOWFeatureDoc) => void }) {
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
      const res = await fetch(`${API_BASE_URL}/api/v1/sow/features/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.detail || "Incorrect password"); return; }
      onUnlock(json.data as SOWFeatureDoc);
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
          <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Password</label>
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
            {loading ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> Unlock</>}
          </button>
        </div>
        <p className="text-[11px] text-zinc-700 text-center mt-5">Contact the sender if you don&apos;t have the password.</p>
      </div>
    </div>
  );
}

export default function FeatureSharePage() {
  const { token } = useParams() as { token: string };
  const [doc, setDoc] = useState<SOWFeatureDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPasswordGate, setIsPasswordGate] = useState(false);
  const [branding, setBranding] = useState<{ companyName: string; tagline: string | null; logoPath: string | null } | null>(null);
  const [comments, setComments] = useState<BRDComment[]>([]);

  const commentApiBase = `/api/v1/sow/features/share/${token}/comments`;

  const loadComments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${commentApiBase}`);
      if (res.ok) {
        const json = await res.json();
        setComments(json.data || []);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [docRes, brandingRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/sow/features/share/${token}`),
          fetch(`${API_BASE_URL}/api/v1/branding`),
        ]);

        if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
          const bj = await brandingRes.value.json();
          const d = bj.data;
          setBranding({ companyName: d.companyName || "", tagline: d.tagline || null, logoPath: d.logoPath || null });
        }

        if (docRes.status === "fulfilled" && docRes.value.ok) {
          const json = await docRes.value.json();
          const data = json.data as SOWFeatureDoc;
          if (data.isPasswordProtected && !data.content) {
            setIsPasswordGate(true);
            setDoc(data);
            document.title = data.featureName ?? "Protected Document";
          } else {
            setDoc(data);
            document.title = [data.featureName, data.featureModule].filter(Boolean).join(" · ");
            loadComments();
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
    load();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><Spin size="large" /></div>;
  }

  if (notFound || !doc) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-zinc-600">Document not found</h2>
          <p className="text-sm text-zinc-400 mt-1">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  if (isPasswordGate && !doc.content) {
    return <PasswordGate name={doc.featureName} onUnlock={(data) => { setIsPasswordGate(false); setDoc(data); loadComments(); }} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {branding?.logoPath ? (
              <img
                src={`${API_BASE_URL}${branding.logoPath}`}
                alt={branding.companyName}
                className="h-14 w-auto object-contain shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                <FileSearch className="w-4 h-4 text-white" />
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
            <span className="hidden sm:block text-xs text-zinc-400">Feature Document · Read-only</span>
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

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Cover */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {doc.featureModule && (
              <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-0.5 ${moduleColor(doc.featureModule)}`}>
                {doc.featureModule}
              </span>
            )}
            {doc.featureCode && (
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5">
                {doc.featureCode}
              </span>
            )}
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Feature Document</span>
          </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">{doc.featureName}</h1>
        {doc.subFeatures && doc.subFeatures.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {doc.subFeatures.map((sf, i) => (
              <span key={i} className="text-[11px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5">
                {sf.code ? `${sf.code}: ${sf.name}` : sf.name}
              </span>
            ))}
          </div>
        )}
        </div>

        {doc.content ? (
          <InlineCommentLayer
            token={token}
            comments={comments.filter((c) => c.anchorY != null)}
            onCommentAdded={(c) => setComments((prev) => [...prev, c])}
            onCommentDeleted={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
            onCommentUpdated={(updated) => setComments((prev) => prev.map((c) => c.id === updated.id ? updated : c))}
            commentApiBase={commentApiBase}
          >
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 mb-8">
              <SmartContentRenderer content={doc.content} />
            </div>
          </InlineCommentLayer>
        ) : (
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-12 text-center">
            <FileSearch className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Content not available.</p>
          </div>
        )}

      </div>

      <footer className="border-t border-zinc-100 mt-4 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <p className="text-xs text-zinc-300">
            {branding?.companyName ? `${branding.companyName} · ` : ""}Product Discovery · Feature Document
          </p>
        </div>
      </footer>
    </div>
  );
}
