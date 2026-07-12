"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Lock, LockOpen, Eye, EyeOff, AlertCircle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Default endpoint targets the BRD share/verify route. Any other document
// type (proposals, SOW, etc.) passes an explicit ``verifyEndpoint`` prop
// so this component can gate them without any BRD coupling.
const DEFAULT_VERIFY_ENDPOINT = (token: string) =>
  `/api/v1/brd/brds/share/${token}/verify`;

/**
 * The password-protected document data returned by the /verify endpoint.
 * We deliberately widen it to ``Record<string, unknown>`` so callers using
 * different document shapes (BRD, Proposal, ...) can pass their own type
 * through without loosening this component's contract.
 */
type UnlockedDoc = Record<string, unknown>;

interface Props {
  /** Human-readable document name to show on the gate. */
  docName: string;
  /** Optional client / recipient name shown as subtext. */
  clientName?: string | null;
  /** Called after a successful unlock with the verify response's ``data``. */
  onUnlock: (data: UnlockedDoc) => void;
  /**
   * Endpoint path (with leading ``/``) that receives the POST body
   * ``{ password }`` and returns ``{ data: <full doc> }`` on success.
   * Defaults to the BRD share/verify path for backward compatibility.
   */
  verifyEndpoint?: (token: string) => string;
  /**
   * SessionStorage key namespace so different document types don't
   * cross-pollinate cached unlock state. Defaults to ``"brd"``.
   */
  storageNamespace?: string;

  // Deprecated: use ``docName`` instead. Kept so existing callers keep
  // compiling; the runtime falls back to this when ``docName`` is empty.
  brdName?: string;
}

export function PasswordGate({
  docName,
  brdName,
  clientName,
  onUnlock,
  verifyEndpoint = DEFAULT_VERIFY_ENDPOINT,
  storageNamespace = "brd",
}: Props) {
  const { token } = useParams() as { token: string };

  const displayName = docName || brdName || "Document";

  const [visitorName, setVisitorName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = async () => {
    if (!visitorName.trim() || !password || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}${verifyEndpoint(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.detail || "Incorrect password");
        return;
      }
      sessionStorage.setItem(
        `${storageNamespace}_viewer_name_${token}`,
        visitorName.trim(),
      );
      sessionStorage.setItem(`${storageNamespace}_unlocked_${token}`, "true");
      setUnlocked(true);
      setTimeout(() => onUnlock(json.data as UnlockedDoc), 900);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm z-10">
        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
              unlocked ? "bg-emerald-500/20 border-emerald-500/40" : "bg-white/5 border-white/10"
            }`}
          >
            {unlocked ? (
              <LockOpen className="w-7 h-7 text-emerald-400" />
            ) : (
              <Lock
                className={`w-7 h-7 transition-colors duration-300 ${
                  error ? "text-red-400" : "text-white/60"
                }`}
              />
            )}
          </div>
        </div>

        {/* Document info */}
        <div className="text-center mb-8">
          <h1 className="text-lg font-semibold text-white mb-1 leading-snug px-4">{displayName}</h1>
          {clientName && <p className="text-xs text-zinc-500">{clientName}</p>}
          <p className="text-xs text-zinc-600 mt-3">
            This document is confidential and password protected.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-2">
            Your Name
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            disabled={unlocked}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/30 transition-colors mb-4"
          />

          <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-2">
            Access Password
          </label>
          <div
            className={`flex items-center border rounded-xl px-4 mb-4 transition-all duration-200 ${
              error
                ? "border-red-500/50 bg-red-500/5"
                : "border-white/10 bg-white/5 focus-within:border-white/30"
            }`}
          >
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
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
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={!visitorName.trim() || !password || loading || unlocked}
            className={`w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              unlocked
                ? "bg-emerald-500 text-white"
                : "bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {unlocked ? (
              <>
                <LockOpen className="w-4 h-4" /> Access Granted
              </>
            ) : loading ? (
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" /> Unlock Document
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-zinc-700 text-center mt-6 leading-relaxed">
          Contact the document sender if you don&apos;t have the password.
          <br />
          This link is intended for authorised recipients only.
        </p>
      </div>
    </div>
  );
}
