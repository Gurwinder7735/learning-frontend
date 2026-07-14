"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin } from "antd";
import { AlertCircle, ArrowRight, Eye, EyeOff, FileSearch, FileText, Lock } from "lucide-react";
import type { SOW, SOWFeatureDoc } from "@/types/models/SOW";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type SOWWithFeatures = SOW & { features: SOWFeatureDoc[] };

// ─── Module color helpers ─────────────────────────────────────────────────────

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

// ─── Password Gate ────────────────────────────────────────────────────────────

function PasswordGate({ name, onUnlock }: { name: string; onUnlock: (data: SOWWithFeatures) => void }) {
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
      const res = await fetch(`${API_BASE_URL}/api/v1/sow/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.detail || "Incorrect password"); return; }
      onUnlock(json.data as SOWWithFeatures);
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
          <p className="text-xs text-zinc-500">This analysis is password protected.</p>
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

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({ feature }: { feature: SOWFeatureDoc }) {
  const href = feature.shareToken ? `/sow/features/share/${feature.shareToken}` : "#";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-zinc-100 rounded-2xl p-5 hover:border-zinc-300 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors leading-snug">
          {feature.featureName}
        </h3>
        <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0 mt-0.5" />
      </div>
      {feature.featureCode && (
        <p className="text-[10px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-100 rounded px-1.5 py-0.5 inline-block mb-1.5">{feature.featureCode}</p>
      )}
      {feature.subFeatures && feature.subFeatures.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {feature.subFeatures.map((sf, i) => (
            <span key={i} className="text-[10px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-100 rounded px-1.5 py-0.5">
              {sf.code || sf.name}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SOWSharePage() {
  const { token } = useParams() as { token: string };
  const [sow, setSOW] = useState<SOWWithFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPasswordGate, setIsPasswordGate] = useState(false);
  const [branding, setBranding] = useState<{ companyName: string; tagline: string | null; logoPath: string | null } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sowRes, brandingRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/sow/share/${token}`),
          fetch(`${API_BASE_URL}/api/v1/branding`),
        ]);

        if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
          const bj = await brandingRes.value.json();
          const d = bj.data;
          setBranding({ companyName: d.companyName || "", tagline: d.tagline || null, logoPath: d.logoPath || null });
        }

        if (sowRes.status === "fulfilled" && sowRes.value.ok) {
          const json = await sowRes.value.json();
          const data = json.data;
          if (data.isPasswordProtected && !data.features) {
            setIsPasswordGate(true);
            setSOW(data);
            document.title = data.name ?? "Protected Analysis";
          } else {
            setSOW(data as SOWWithFeatures);
            document.title = [data.name, data.clientName].filter(Boolean).join(" — ");
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

  if (notFound || !sow) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-zinc-600">Analysis not found</h2>
          <p className="text-sm text-zinc-400 mt-1">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  if (isPasswordGate && !sow.features) {
    return <PasswordGate name={sow.name} onUnlock={(data) => { setIsPasswordGate(false); setSOW(data); }} />;
  }

  const features = sow.features || [];

  // Group by module
  const groups: Record<string, SOWFeatureDoc[]> = {};
  features.forEach((f) => {
    const mod = f.featureModule || "General";
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push(f);
  });

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
            {/* Company name intentionally hidden — logo is the brand identifier */}
          </div>
          <span className="hidden sm:block text-xs text-zinc-400">Product Discovery · Read-only</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Cover */}
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">Product Discovery Analysis</p>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">{sow.name}</h1>
          {sow.clientName && (
            <p className="text-sm text-zinc-500 mb-1">Prepared for <strong className="text-zinc-700">{sow.clientName}</strong></p>
          )}
          <p className="text-xs text-zinc-400">{features.length} feature{features.length !== 1 ? "s" : ""} · Click any feature to read the full document</p>
        </div>

        {/* Features grouped by module */}
        {features.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <FileSearch className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
            <p className="text-sm">No features available yet.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groups).map(([module, docs]) => (
              <div key={module}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-[11px] font-bold uppercase tracking-wider border rounded-full px-3 py-1 ${moduleColor(module)}`}>
                    {module}
                  </span>
                  <span className="text-xs text-zinc-400">{docs.length} feature{docs.length !== 1 ? "s" : ""}</span>
                  <div className="flex-1 h-px bg-zinc-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map((f) => (
                    <FeatureCard key={f.id} feature={f} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-zinc-100 mt-12 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <p className="text-xs text-zinc-300">
            {branding?.companyName ? `${branding.companyName} · ` : ""}Product Discovery Analysis · AI-generated
          </p>
        </div>
      </footer>
    </div>
  );
}
