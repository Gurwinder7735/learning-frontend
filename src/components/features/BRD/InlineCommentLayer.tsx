"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, MessageCircle, Send, Trash2, X, ChevronRight, CornerDownRight } from "lucide-react";
import type { BRDComment } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  token: string;
  comments: BRDComment[];
  onCommentAdded: (comment: BRDComment) => void;
  onCommentDeleted: (commentId: string) => void;
  onCommentUpdated: (comment: BRDComment) => void;
  children: React.ReactNode;
}

interface PendingPin {
  anchorY: number;   // 0–100% height — stored in DB
  anchorX: number;   // 0–100% width — stored in DB
  clickXpx: number;  // pixels from container left — bubble position this session
  clickYpx: number;  // pixels from container top (viewport) — bubble position this session
}

interface ActivePin {
  commentId: string;
  anchorY: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Each comment gets its own individual pin — no grouping
function groupPins(comments: BRDComment[]): BRDComment[][] {
  return comments.map((c) => [c]);
}

export function InlineCommentLayer({ token, comments, onCommentAdded, onCommentDeleted, onCommentUpdated, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [activePin, setActivePin] = useState<ActivePin | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelFilter, setPanelFilter] = useState<"all" | "open" | "resolved">("all");

  // Reply form state per parent comment (keyed by parentId)
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null);

  // Split: top-level inline vs replies
  const topLevelInline = comments.filter((c) => c.anchorY != null && !c.parentId);
  const repliesMap = new Map<string, BRDComment[]>();
  comments.forEach((c) => {
    if (c.parentId) {
      const arr = repliesMap.get(c.parentId) ?? [];
      arr.push(c);
      repliesMap.set(c.parentId, arr);
    }
  });

  // Jump to a pin and open its popover
  const jumpToComment = (comment: BRDComment) => {
    const container = containerRef.current;
    if (!container) return;
    const targetY = ((comment.anchorY ?? 0) / 100) * container.clientHeight;
    const headerH = 80;
    window.scrollTo({ top: container.getBoundingClientRect().top + window.scrollY + targetY - headerH - 40, behavior: "smooth" });
    setActivePin({ commentId: comment.id, anchorY: comment.anchorY ?? 0 });
    setPanelOpen(false);
    setPendingPin(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await fetch(
        `${API_BASE_URL}/api/v1/brd/brds/share/${token}/comments/${commentId}`,
        { method: "DELETE" }
      );
      onCommentDeleted(commentId);
      setActivePin(null);
    } catch { /* silent */ } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (commentId: string) => {
    setTogglingId(commentId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/brd/brds/share/${token}/comments/${commentId}/status`,
        { method: "PATCH" }
      );
      if (res.ok) {
        const json = await res.json();
        onCommentUpdated(json.data as BRDComment);
      }
    } catch { /* silent */ } finally {
      setTogglingId(null);
    }
  };

  const handleReply = async (parentId: string) => {
    const content = (replyContent[parentId] ?? "").trim();
    if (!viewerName || !content || replySubmitting) return;
    setReplySubmitting(parentId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commenter_name: viewerName,
          content,
          parent_id: parentId,
          // no anchor_y — replies inherit pin from parent
        }),
      });
      if (res.ok) {
        const json = await res.json();
        onCommentAdded(json.data as BRDComment);
        setReplyContent((prev) => ({ ...prev, [parentId]: "" }));
      }
    } catch { /* silent */ } finally {
      setReplySubmitting(null);
    }
  };

  // Session-based viewer name — captured once, reused silently for all comments
  const [viewerName, setViewerName] = useState<string>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(`brd_viewer_name_${token}`) ?? "" : ""
  );
  const [nameInput, setNameInput] = useState(""); // used only in the name-capture step
  const [nameStep, setNameStep] = useState(false); // true = show name-capture before compose

  // Comment content form state
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Click on the document body to place a new pin
  const handleDocClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't place pin if clicking a pin button itself
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    // Don't place pin if there's already a pending one (clicking elsewhere dismisses)
    if (pendingPin) {
      setPendingPin(null);
      setContent("");
      setSubmitError("");
      setNameStep(false);
      setNameInput("");
      return;
    }
    if (activePin) {
      setActivePin(null);
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Offset from container's top-left in layout space.
    // rect.top already reflects window.scrollY — do NOT add it again.
    const clickXpx = e.clientX - rect.left;
    const clickYpx = e.clientY - rect.top;
    // Store as % of container dimensions so pins survive refresh/resize
    const anchorY = Math.min(100, Math.max(0, (clickYpx / container.clientHeight) * 100));
    const anchorX = Math.min(100, Math.max(0, (clickXpx / container.clientWidth) * 100));
    setPendingPin({ anchorY, anchorX, clickXpx, clickYpx });
    // If no viewer name yet, show name-capture step first
    if (!viewerName) setNameStep(true);
  };

  const handleSubmit = async () => {
    if (!viewerName || !content.trim() || submitting || !pendingPin) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commenter_name: viewerName,
          content: content.trim(),
          anchor_y: pendingPin.anchorY,
          anchor_x: pendingPin.anchorX,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.detail || "Failed to post comment");
        return;
      }
      onCommentAdded(json.data as BRDComment);
      setPendingPin(null);
      setContent("");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const groups = groupPins(topLevelInline);

  // Global number across all groups (for the badge)
  let pinCounter = 0;
  const groupsWithNums = groups.map((group) => ({
    group,
    startNum: ++pinCounter,
    endNum: pinCounter + group.length - 1,
  }));
  pinCounter = 0; // reset for per-comment numbering later

  // Map comment id → sequential number
  const commentNums = new Map<string, number>();
  let n = 0;
  for (const c of [...comments].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )) {
    commentNums.set(c.id, ++n);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={handleDocClick}
      style={{ cursor: "crosshair" }}
    >
      {children}

      {/* Render existing pins at their true X/Y position */}
      {groupsWithNums.map(({ group, startNum }) => {
        const anchorY = group[0].anchorY ?? 0;
        const anchorX = group[0].anchorX ?? 50;
        const isActive = activePin && group.some((c) => c.id === activePin.commentId);
        // Flip popover to the left if pin is in the right half
        const flipLeft = anchorX > 50;
        return (
          <div
            key={group[0].id}
            data-pin="true"
            className="absolute z-20 pointer-events-auto group"
            style={{
              top: `${anchorY}%`,
              left: `${anchorX}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Badge */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (activePin?.commentId === group[0].id) {
                  setActivePin(null);
                } else {
                  setActivePin({ commentId: group[0].id, anchorY });
                  setPendingPin(null);
                }
              }}
              title={`${group.length} comment${group.length > 1 ? "s" : ""} — click to read`}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ring-2 ring-offset-2 ${
                isActive
                  ? "bg-blue-600 ring-blue-400 text-white scale-110 shadow-lg shadow-blue-200"
                  : group.every((c) => c.status === "resolved")
                    ? "bg-emerald-600 ring-emerald-300 text-white hover:scale-110 shadow-md opacity-70"
                    : "bg-zinc-900 ring-zinc-400 text-white hover:bg-zinc-700 hover:scale-110 shadow-md"
              }`}
            >
              {group.length > 1 ? `${startNum}+` : startNum}
            </button>

            {/* Hover label */}
            {!isActive && (
              <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                <span className="bg-zinc-900 text-white text-[10px] font-medium rounded-lg px-2 py-1 shadow-lg">
                  {group.length} comment{group.length > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Read popover — threaded */}
            {isActive && (
              <div
                className="absolute bg-white rounded-2xl border border-zinc-200 shadow-xl w-80 z-50 overflow-hidden"
                style={{
                  top: 32,
                  left: flipLeft ? "auto" : 0,
                  right: flipLeft ? 0 : "auto",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Popover header */}
                {group.map((c) => {
                  const isResolved = c.status === "resolved";
                  const threadReplies = repliesMap.get(c.id) ?? [];
                  const totalCount = 1 + threadReplies.length;
                  return (
                    <div key={c.id}>
                      {/* Thread header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-3 h-3 text-zinc-400" />
                          <span className="text-xs font-semibold text-zinc-700">
                            {totalCount} comment{totalCount !== 1 ? "s" : ""}
                          </span>
                          {isResolved && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Resolved
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Resolve toggle */}
                          <button
                            onClick={() => handleToggleStatus(c.id)}
                            disabled={togglingId === c.id}
                            title={isResolved ? "Reopen" : "Mark resolved"}
                            className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border transition-colors ${
                              isResolved
                                ? "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {togglingId === c.id
                              ? <div className="w-3 h-3 border border-zinc-300 border-t-emerald-500 rounded-full animate-spin" />
                              : isResolved ? "Reopen" : "Resolve"
                            }
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setActivePin(null); }} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Scrollable thread body */}
                      <div className="max-h-72 overflow-y-auto">
                        {/* Top-level comment */}
                        <div className={`px-4 py-3 border-b border-zinc-50 ${isResolved ? "opacity-60" : ""}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                              <span className="text-white text-[8px] font-bold">{c.commenterName.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-xs font-semibold text-zinc-900">{c.commenterName}</span>
                            <span className="text-[10px] text-zinc-400">{formatDate(c.createdAt)}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteComment(c.id); }} disabled={deletingId === c.id} className="ml-auto text-zinc-300 hover:text-red-500 transition-colors" title="Delete">
                              {deletingId === c.id ? <div className="w-3 h-3 border border-zinc-300 border-t-red-400 rounded-full animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-xs text-zinc-600 leading-relaxed pl-7">{c.content}</p>
                        </div>

                        {/* Replies */}
                        {threadReplies.length > 0 && (
                          <div className="border-b border-zinc-50">
                            {threadReplies.map((r) => (
                              <div key={r.id} className={`px-4 py-2.5 flex gap-2 ${isResolved ? "opacity-60" : ""}`}>
                                <CornerDownRight className="w-3 h-3 text-zinc-300 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                                      <span className="text-white text-[7px] font-bold">{r.commenterName.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-zinc-800">{r.commenterName}</span>
                                    <span className="text-[10px] text-zinc-400">{formatDate(r.createdAt)}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteComment(r.id); }} disabled={deletingId === r.id} className="ml-auto text-zinc-300 hover:text-red-500 transition-colors">
                                      {deletingId === r.id ? <div className="w-2.5 h-2.5 border border-zinc-300 border-t-red-400 rounded-full animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                                    </button>
                                  </div>
                                  <p className="text-xs text-zinc-600 leading-relaxed">{r.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply form */}
                        <div className="px-4 py-3">
                          <div className="flex gap-2 items-end">
                            <textarea
                              placeholder="Reply..."
                              value={replyContent[c.id] ?? ""}
                              onChange={(e) => setReplyContent((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              rows={2}
                              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply(c.id); }}
                              className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 resize-none transition-colors"
                            />
                            <button
                              onClick={() => handleReply(c.id)}
                              disabled={!(replyContent[c.id] ?? "").trim() || replySubmitting === c.id}
                              className="flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 transition-colors disabled:opacity-40 shrink-0"
                            >
                              {replySubmitting === c.id
                                ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <Send className="w-3 h-3" />
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Pending bubble — appears right at the click position */}
      {pendingPin && (
        <div
          data-pin="true"
          className="absolute z-50 pointer-events-auto"
          style={{
            top: pendingPin.clickYpx,
            left: pendingPin.clickXpx,
            transform: "translate(-12px, -12px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Small dot at click spot */}
          <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
            <MessageCircle className="w-3 h-3 text-white" />
          </div>

          {/* Compose bubble */}
          <div
            className="absolute bg-white rounded-2xl border border-zinc-200 shadow-2xl w-72 overflow-hidden"
            style={{
              top: 28,
              left: pendingPin.clickXpx > 400 ? "auto" : 0,
              right: pendingPin.clickXpx > 400 ? 0 : "auto",
            }}
          >
            {/* Speech bubble arrow */}
            <div
              className="absolute -top-2 w-4 h-2 overflow-hidden"
              style={{ left: pendingPin.clickXpx > 400 ? "auto" : 8, right: pendingPin.clickXpx > 400 ? 8 : "auto" }}
            >
              <div className="w-3 h-3 bg-white border-l border-t border-zinc-200 rotate-45 translate-y-1.5 mx-auto" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-700">
                {nameStep ? "Who are you?" : "Add comment"}
              </span>
              <button
                onClick={() => { setPendingPin(null); setContent(""); setSubmitError(""); setNameStep(false); setNameInput(""); }}
                className="text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step 1 — name capture (only when no session name) */}
            {nameStep ? (
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-zinc-400">Before adding a comment, tell us your name. You won&apos;t be asked again.</p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nameInput.trim()) {
                      sessionStorage.setItem(`brd_viewer_name_${token}`, nameInput.trim());
                      setViewerName(nameInput.trim());
                      setNameStep(false);
                    }
                  }}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                />
                <button
                  disabled={!nameInput.trim()}
                  onClick={() => {
                    sessionStorage.setItem(`brd_viewer_name_${token}`, nameInput.trim());
                    setViewerName(nameInput.trim());
                    setNameStep(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-xl px-3 py-2.5 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : (
              /* Step 2 — compose (name already known) */
              <div className="p-4 space-y-3">
                {/* Viewer name badge */}
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <div className="w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">{viewerName.charAt(0).toUpperCase()}</span>
                  </div>
                  Commenting as <span className="font-semibold text-zinc-700">{viewerName}</span>
                </div>
                <textarea
                  placeholder="Leave a comment on this section..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                  }}
                />
                {submitError && (
                  <div className="flex items-center gap-1.5 text-red-500 text-[11px]">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {submitError}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">⌘↵ to submit</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitting}
                    className="flex items-center gap-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-xl px-3 py-1.5 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating comments panel button ───────────────────────── */}
      {topLevelInline.length > 0 && (
        <div className="fixed bottom-24 right-6 z-40 print:hidden" data-pin="true">
          <button
            onClick={(e) => { e.stopPropagation(); setPanelOpen((o) => !o); setPendingPin(null); setActivePin(null); }}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold shadow-xl transition-all ${
              panelOpen ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {topLevelInline.length} comment{topLevelInline.length !== 1 ? "s" : ""}
            {topLevelInline.some((c) => c.status === "open") && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            )}
          </button>
        </div>
      )}

      {/* ── Comments slide-in panel ───────────────────────────────── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 print:hidden"
            onClick={(e) => { e.stopPropagation(); setPanelOpen(false); }}
          />
          {/* Panel */}
          <div
            className="fixed right-0 top-0 h-full w-80 bg-white border-l border-zinc-200 shadow-2xl z-50 flex flex-col print:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-900">
                  Comments
                  <span className="ml-1.5 text-xs font-normal text-zinc-400">({comments.length})</span>
                </span>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status filter */}
            <div className="flex gap-1 px-4 py-2 border-b border-zinc-100 bg-zinc-50">
              {(["all", "open", "resolved"] as const).map((f) => {
                const count = f === "all" ? topLevelInline.length : topLevelInline.filter((c) => c.status === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setPanelFilter(f)}
                    className={`flex-1 text-[10px] font-semibold rounded-lg py-1 capitalize transition-colors ${
                      panelFilter === f ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    {f} ({count})
                  </button>
                );
              })}
            </div>

            {/* Comment list — sorted top to bottom */}
            <div className="flex-1 overflow-y-auto">
              {topLevelInline
                .filter((c) => panelFilter === "all" || c.status === panelFilter)
                .sort((a, b) => (a.anchorY ?? 0) - (b.anchorY ?? 0))
                .map((c, idx) => {
                  const threadCount = (repliesMap.get(c.id) ?? []).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => jumpToComment(c)}
                      className="w-full text-left px-5 py-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${c.status === "resolved" ? "bg-emerald-600" : "bg-zinc-900"}`}>
                          <span className="text-white text-[9px] font-bold">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-zinc-900 truncate">{c.commenterName}</span>
                            <span className="text-[10px] text-zinc-400 shrink-0">{formatDate(c.createdAt)}</span>
                            {c.status === "resolved" && (
                              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5 shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{c.content}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-300 group-hover:text-zinc-500 transition-colors">
                            <span>~{Math.round(c.anchorY ?? 0)}% into document</span>
                            {threadCount > 0 && <span className="text-zinc-400">{threadCount} repl{threadCount === 1 ? "y" : "ies"}</span>}
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50">
              <p className="text-[11px] text-zinc-400 text-center">
                Click any comment to jump to it in the document
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
