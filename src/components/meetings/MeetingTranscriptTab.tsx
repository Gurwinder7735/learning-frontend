"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Empty, message, Modal, Progress, Tag, Typography } from "antd";
import { Copy, Download, Mic, RefreshCw, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api/axiosInstance";
import { storage } from "@/lib/utils/storage";

/**
 * Recording & Transcript tab embedded on the meeting detail page.
 *
 * Fetches recordings linked to this meeting via
 * ``GET /meeting-recorder?meeting_id=<id>`` and renders them all — usually
 * one, occasionally more if the meeting was re-recorded.
 *
 * We use the shared ``apiRequest`` helper (axios) so tokens and refresh are
 * managed centrally. Audio and SSE endpoints need a bare ``?token=`` query
 * param because ``<audio>`` and ``EventSource`` cannot set headers.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  /** Attributed by backend from the Meet speaker timeline; null when unavailable. */
  speaker: string | null;
}

/** A run of consecutive segments spoken by the same person. */
interface SpeakerRun {
  speaker: string | null;
  segments: TranscriptSegment[];
  startIndex: number;
}

function groupBySpeaker(segments: TranscriptSegment[]): SpeakerRun[] {
  const runs: SpeakerRun[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const last = runs[runs.length - 1];
    if (last && last.speaker != null && last.speaker === seg.speaker) {
      last.segments.push(seg);
    } else {
      runs.push({ speaker: seg.speaker, segments: [seg], startIndex: i });
    }
  }
  return runs;
}

interface RecordingDetail {
  id: string;
  name: string;
  platform: string;
  durationMs: number;
  status: "uploaded" | "queued" | "transcribing" | "transcribed" | "failed";
  language: string | null;
  transcriptProgress: number;
  segmentCount: number;
  queuePosition: number | null;
  meetingId: string | null;
  meetingTitle: string | null;
  transcriptSegments: TranscriptSegment[];
  transcriptError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  meetingId: string;
}

export default function MeetingTranscriptTab({ meetingId }: Props) {
  const [recordings, setRecordings] = useState<RecordingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The list endpoint returns list items, not full detail. We follow up
      // per-item to hydrate transcript segments so this tab is a
      // self-contained view.
      const listRes = await apiRequest<{ data: RecordingDetail[] }>({
        url: `/api/v1/meeting-recorder`,
        params: { meeting_id: meetingId },
      });
      const listItems = (listRes.data ?? []) as RecordingDetail[];
      // Fetch details in parallel — usually a small list.
      const detailed = await Promise.all(
        listItems.map(async (item) => {
          try {
            const res = await apiRequest<{ data: RecordingDetail }>({
              url: `/api/v1/meeting-recorder/${item.id}`,
            });
            return res.data;
          } catch {
            return item;
          }
        }),
      );
      setRecordings(detailed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void load();
    // Poll every 15s so `queued` / `transcribing` states advance without a
    // manual refresh. Detail-level SSE handles per-segment updates.
    const id = window.setInterval(load, 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && recordings.length === 0) {
    return <div className="text-center py-10 text-zinc-500">Loading recordings…</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }
  if (recordings.length === 0) {
    return (
      <Empty
        image={<Mic className="w-10 h-10 text-zinc-300 mx-auto" />}
        description={
          <div>
            <div className="text-zinc-700 font-medium mb-1">No recording yet</div>
            <div className="text-xs text-zinc-500">
              Start the Apex Meeting Recorder Chrome extension on your Google Meet, Microsoft Teams, or Zoom tab. The recording will attach automatically.
            </div>
          </div>
        }
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-6">
      {recordings.map((rec) => (
        <RecordingBlock key={rec.id} recording={rec} onChanged={load} />
      ))}
    </div>
  );
}

// ─── Per-recording block ────────────────────────────────────────────────────

function RecordingBlock({
  recording,
  onChanged,
}: {
  recording: RecordingDetail;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<RecordingDetail>(recording);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => setDetail(recording), [recording]);

  // Build a token-embedded audio URL. Refresh it whenever the recording id
  // changes (also picks up any post-login token rotation on remount).
  useEffect(() => {
    const token = storage.getAccessToken();
    if (!token) return;
    setAudioSrc(`${API_BASE}/api/v1/meeting-recorder/${detail.id}/audio?token=${encodeURIComponent(token)}`);
  }, [detail.id]);

  // Live progress via SSE while transcribing.
  useEffect(() => {
    if (detail.status !== "transcribing") return;
    const token = storage.getAccessToken();
    if (!token) return;
    const es = new EventSource(
      `${API_BASE}/api/v1/meeting-recorder/${detail.id}/transcript-stream?token=${encodeURIComponent(token)}`,
    );
    es.onmessage = (ev) => {
      try {
        const evt = JSON.parse(ev.data);
        if (evt.type === "segment" && evt.segment) {
          setDetail((prev) => ({
            ...prev,
            transcriptSegments: [...prev.transcriptSegments, evt.segment],
            transcriptProgress: evt.progress ?? prev.transcriptProgress,
          }));
        } else if (evt.type === "done" || evt.type === "error") {
          es.close();
          onChanged();
        }
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.id, detail.status]);

  const handleSeek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    void audioRef.current.play();
  };

  const handleReTranscribe = async () => {
    try {
      const res = await apiRequest<{ data: RecordingDetail }>({
        url: `/api/v1/meeting-recorder/${detail.id}/re-transcribe`,
        method: "POST",
      });
      setDetail(res.data);
      message.success("Re-transcription queued.");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to re-transcribe");
    }
  };

  const handleDetach = () => {
    Modal.confirm({
      title: "Detach this recording?",
      content: "The recording will remain in your Apex library but will no longer appear on this meeting.",
      okText: "Detach",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiRequest({
            url: `/api/v1/meeting-recorder/${detail.id}`,
            method: "PATCH",
            data: { meeting_id: null },
          });
          message.success("Recording detached.");
          onChanged();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Detach failed");
        }
      },
    });
  };

  const handleCopy = async () => {
    const text = detail.transcriptSegments.map((s) => s.text).join(" ");
    try {
      await navigator.clipboard.writeText(text);
      message.success("Transcript copied.");
    } catch {
      message.error("Clipboard write failed.");
    }
  };

  const handleExport = () => {
    const text = detail.transcriptSegments
      .map((s) => `[${formatTimestamp(s.start)}] ${s.text}`)
      .join("\n");
    const blob = new Blob([`${detail.name}\n\n${text}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitize(detail.name)}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusTag = useMemo(() => {
    switch (detail.status) {
      case "queued":
        return (
          <Tag color="orange">
            Queued
            {detail.queuePosition != null && detail.queuePosition > 0
              ? ` · ${detail.queuePosition} ahead`
              : ""}
          </Tag>
        );
      case "transcribing":
        return <Tag color="orange">Transcribing · {Math.round(detail.transcriptProgress * 100)}%</Tag>;
      case "transcribed":
        return <Tag color="green">Transcribed</Tag>;
      case "failed":
        return <Tag color="red">Failed</Tag>;
      default:
        return <Tag>Uploaded</Tag>;
    }
  }, [detail.status, detail.transcriptProgress, detail.queuePosition]);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Typography.Text className="font-semibold text-zinc-900 text-base truncate">
              {detail.name}
            </Typography.Text>
            {statusTag}
            <Tag color="blue">{platformLabel(detail.platform)}</Tag>
          </div>
          <Typography.Text className="text-xs text-zinc-500">
            {formatDuration(detail.durationMs)}
            {detail.language && <> · Language: {detail.language}</>}
            {detail.transcriptSegments.length > 0 && <> · {detail.transcriptSegments.length} segments</>}
          </Typography.Text>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="small" icon={<Copy className="w-3 h-3" />} onClick={handleCopy} disabled={detail.transcriptSegments.length === 0}>Copy</Button>
          <Button size="small" icon={<Download className="w-3 h-3" />} onClick={handleExport} disabled={detail.transcriptSegments.length === 0}>Export</Button>
          <Button size="small" icon={<RefreshCw className="w-3 h-3" />} onClick={handleReTranscribe}>Re-transcribe</Button>
          <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} onClick={handleDetach}>Detach</Button>
        </div>
      </div>

      {audioSrc && (
        <div className="mb-4">
          <audio
            ref={audioRef}
            controls
            src={audioSrc}
            preload="metadata"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            className="w-full"
          />
        </div>
      )}

      {detail.status === "transcribing" && (
        <Progress
          percent={Math.round(detail.transcriptProgress * 100)}
          size="small"
          strokeColor="#0f172a"
          className="mb-4"
        />
      )}

      {detail.status === "failed" && detail.transcriptError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          Transcription failed: {detail.transcriptError}
        </div>
      )}

      {detail.transcriptSegments.length === 0 && detail.status !== "transcribing" ? (
        <div className="text-center py-6 text-zinc-500 text-sm">
          {detail.status === "queued" ? "Queued for transcription…" : "No transcript yet."}
        </div>
      ) : (
        <TranscriptList
          segments={detail.transcriptSegments}
          currentTime={currentTime}
          onSeek={handleSeek}
        />
      )}
    </div>
  );
}

/**
 * Groups consecutive same-speaker segments with a single name header. When
 * no segment has a speaker (missing timeline / unattributed transcript), we
 * skip headers entirely and fall back to the flat list — identical to the
 * pre-diarization UI.
 */
function TranscriptList({
  segments,
  currentTime,
  onSeek,
}: {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (s: number) => void;
}) {
  const runs = useMemo(() => groupBySpeaker(segments), [segments]);
  const hasAnySpeaker = segments.some((s) => s.speaker != null);

  return (
    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-zinc-100">
      {runs.map((run) => (
        <div key={run.startIndex} className="border-b border-zinc-50 last:border-b-0">
          {hasAnySpeaker && run.speaker && (
            <div className="px-3 py-2 text-xs font-bold text-zinc-800 bg-zinc-50 border-b border-zinc-100">
              {run.speaker}
            </div>
          )}
          {run.segments.map((seg, offset) => {
            const absoluteIndex = run.startIndex + offset;
            const isActive = currentTime >= seg.start && currentTime < seg.end;
            return (
              <button
                key={absoluteIndex}
                type="button"
                onClick={() => onSeek(seg.start)}
                className={`flex gap-3 w-full text-left py-2 px-3 hover:bg-zinc-50 transition-colors ${
                  isActive ? "bg-sky-50 border-l-2 border-l-sky-500" : ""
                }`}
              >
                <span className="font-mono text-[11px] text-zinc-500 min-w-[52px] pt-[3px]">
                  {formatTimestamp(seg.start)}
                </span>
                <span className="text-sm text-zinc-800 leading-relaxed">{seg.text}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function platformLabel(platform: string): string {
  switch (platform) {
    case "google-meet": return "Google Meet";
    case "teams": return "Microsoft Teams";
    case "zoom": return "Zoom";
    default: return platform;
  }
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatTimestamp(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 80) || "recording";
}
