"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, CornerDownRight, MessageSquare, Send } from "lucide-react";
import type { BRDComment } from "@/types/models/BRD";
import { useViewerName } from "@/hooks/useViewerName";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatRelative(iso: string) {
  const date = new Date(iso);
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " at " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

// ─── BottomCommentThread ──────────────────────────────────────────────────────
// Renders top-level section comments with threaded replies and resolve toggle.
// Co-located with CommentsSection because they share the same data model
// and are never used independently.

interface BottomCommentThreadProps {
  token: string;
  topLevel: BRDComment[];
  allComments: BRDComment[];
  viewerName: string;
  onCommentAdded: (c: BRDComment) => void;
  onCommentUpdated: (c: BRDComment) => void;
  commentsUrl: string;
}

function BottomCommentThread({
  topLevel,
  allComments,
  viewerName,
  onCommentAdded,
  onCommentUpdated,
  commentsUrl,
}: BottomCommentThreadProps) {
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const repliesFor = (parentId: string) =>
    allComments.filter((c) => c.parentId === parentId);

  const handleReply = async (parentId: string) => {
    const content = (replyContent[parentId] ?? "").trim();
    if (!viewerName || !content || replySubmitting) return;
    setReplySubmitting(parentId);
    try {
      const res = await fetch(`${API_BASE_URL}${commentsUrl}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commenter_name: viewerName, content, parent_id: parentId }),
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

  const handleToggleStatus = async (commentId: string) => {
    setTogglingId(commentId);
    try {
      const res = await fetch(
        `${API_BASE_URL}${commentsUrl}/${commentId}/status`,
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

  return (
    <div className="space-y-4">
      {topLevel.map((c) => {
        const replies = repliesFor(c.id);
        const isResolved = c.status === "resolved";

        return (
          <div
            key={c.id}
            className={`bg-white border rounded-2xl overflow-hidden ${
              isResolved ? "border-emerald-100" : "border-zinc-100"
            }`}
          >
            {/* Top-level comment */}
            <div className={`p-5 ${isResolved ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">
                      {c.commenterName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{c.commenterName}</p>
                    <p className="text-xs text-zinc-400">{formatRelative(c.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isResolved && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleStatus(c.id)}
                    disabled={togglingId === c.id}
                    className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 border transition-colors ${
                      isResolved
                        ? "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                        : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {togglingId === c.id ? (
                      <div className="w-3 h-3 border border-zinc-300 border-t-emerald-500 rounded-full animate-spin" />
                    ) : isResolved ? (
                      "Reopen"
                    ) : (
                      "Resolve"
                    )}
                  </button>
                </div>
              </div>

              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap pl-10">
                {c.content}
              </p>
            </div>

            {/* Replies */}
            {replies.length > 0 && (
              <div className="border-t border-zinc-50 bg-zinc-50/50">
                {replies.map((r) => (
                  <div
                    key={r.id}
                    className="flex gap-2.5 px-5 py-3 border-b border-zinc-100 last:border-0"
                  >
                    <CornerDownRight className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                          <span className="text-white text-[8px] font-bold">
                            {r.commenterName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-zinc-800">{r.commenterName}</span>
                        <span className="text-[10px] text-zinc-400">{formatRelative(r.createdAt)}</span>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap pl-7">
                        {r.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form */}
            <div className="border-t border-zinc-100 px-5 py-3 flex gap-2 items-end">
              <textarea
                placeholder={`Reply to ${c.commenterName}...`}
                value={replyContent[c.id] ?? ""}
                onChange={(e) =>
                  setReplyContent((prev) => ({ ...prev, [c.id]: e.target.value }))
                }
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply(c.id);
                }}
                className="flex-1 border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2 text-xs outline-none focus:border-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 resize-none transition-colors"
              />
              <button
                onClick={() => handleReply(c.id)}
                disabled={!(replyContent[c.id] ?? "").trim() || replySubmitting === c.id}
                className="flex items-center justify-center w-7 h-7 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 transition-colors disabled:opacity-40 shrink-0"
              >
                {replySubmitting === c.id ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CommentsSection ──────────────────────────────────────────────────────────

interface Props {
  token: string;
  initialComments: BRDComment[];
  onCommentAdded: (c: BRDComment) => void;
  /** Override the base API URL for comments (defaults to BRD endpoint). */
  commentApiBase?: string;
}

export function CommentsSection({ token, initialComments, onCommentAdded, commentApiBase }: Props) {
  const commentsUrl = commentApiBase ?? `/api/v1/brd/brds/share/${token}/comments`;
  const [localComments, setLocalComments] = useState<BRDComment[]>(initialComments);
  const { viewerName, saveViewerName } = useViewerName(token);
  const [nameInput, setNameInput] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    setLocalComments(initialComments);
  }, [initialComments.length]); // eslint-disable-line

  const effectiveName = viewerName || nameInput.trim();
  const topLevelComments = localComments.filter((c) => !c.parentId);

  const handleSubmit = async () => {
    if (!effectiveName || !content.trim()) return;
    if (!viewerName && nameInput.trim()) saveViewerName(nameInput.trim());

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${API_BASE_URL}${commentsUrl}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commenter_name: effectiveName, content: content.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.detail || "Failed to post comment");
        return;
      }
      const newComment = json.data as BRDComment;
      setLocalComments((prev) => [...prev, newComment]);
      onCommentAdded(newComment);
      setContent("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentUpdated = (updated: BRDComment) =>
    setLocalComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

  const handleReplyAdded = (reply: BRDComment) => {
    setLocalComments((prev) => [...prev, reply]);
    onCommentAdded(reply);
  };

  return (
    <section className="border-t border-zinc-100 mt-16 pt-12 pb-20 print:hidden">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <MessageSquare className="w-5 h-5 text-zinc-600" />
          <h2 className="text-base font-bold text-zinc-900">
            Comments{" "}
            {topLevelComments.length > 0 && (
              <span className="text-zinc-400 font-normal">({topLevelComments.length})</span>
            )}
          </h2>
        </div>

        {/* Compose form */}
        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 mb-8">
          {viewerName ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
              <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                <span className="text-white text-[9px] font-bold">
                  {viewerName.charAt(0).toUpperCase()}
                </span>
              </div>
              Commenting as{" "}
              <span className="font-semibold text-zinc-800">{viewerName}</span>
            </div>
          ) : (
            <div className="mb-4">
              <label className="text-xs text-zinc-500 block mb-1">
                Your name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full border border-zinc-200 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
              />
            </div>
          )}

          <div className="mb-3">
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
              disabled={!effectiveName || !content.trim() || submitting}
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

        {/* Comment threads */}
        {topLevelComments.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No comments yet. Be the first to leave feedback.</p>
          </div>
        ) : (
          <BottomCommentThread
            token={token}
            topLevel={topLevelComments}
            allComments={localComments}
            viewerName={effectiveName}
            onCommentAdded={handleReplyAdded}
            onCommentUpdated={handleCommentUpdated}
            commentsUrl={commentsUrl}
          />
        )}
      </div>
    </section>
  );
}
