"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Empty, Tag, Tooltip } from "antd";
import { useRouter } from "next/navigation";
import { Calendar, ExternalLink, Pencil, Plus, Trash2, Video } from "lucide-react";
import { apiRequest } from "@/lib/api/axiosInstance";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import {
  MeetingFormDrawer,
  type MeetingFormValues,
} from "@/components/features/Meetings/MeetingFormDrawer";

/**
 * Meetings panel for the Lead / Client account detail pages.
 *
 * Uses the shared ``MeetingFormDrawer`` so the create/edit form is
 * identical to the main Meetings module. The account picker is hidden
 * because the meeting's ``client_id`` is implicit on an account page.
 *
 * Talks to ``/{apiBase}/{accountId}/meetings`` endpoints which now
 * accept the full meeting field set (meetingType, summary, attendees,
 * location, generateMeetLink) after the schema extension.
 */

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  durationMinutes?: number | null;
  meetingType?: string;
  status: "scheduled" | "completed" | "cancelled";
  summary?: string | null;
  notes?: string | null;
  attendees?: string[];
  location?: string | null;
  meetLink?: string | null;
  clientId?: string | null;
}

interface Props {
  accountId: string;
  apiBase: string;
  canEdit?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: "blue",
  completed: "green",
  cancelled: "red",
};

const TYPE_LABELS: Record<string, string> = {
  client_meeting: "Client Meeting",
  discovery: "Discovery",
  internal: "Internal",
  review: "Review",
  kickoff: "Kickoff",
  other: "Other",
};

export function AccountMeetingsPanel({ accountId, apiBase, canEdit = true }: Props) {
  const { message, modal } = App.useApp();
  const router = useRouter();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Fetch Google Calendar status so the form can show the Meet link
  // toggle when the user's account is connected.
  useEffect(() => {
    apiRequest<{ data: { connected: boolean } }>({
      url: "/api/v1/meetings/google/status",
      method: "GET",
    })
      .then((r) => setGoogleConnected(r.data?.connected ?? false))
      .catch(() => setGoogleConnected(false));
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ data: Meeting[] }>({
        url: `${apiBase}/${accountId}/meetings`,
        method: "GET",
      });
      setMeetings(res.data ?? []);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) fetchMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, apiBase]);

  const handleOpenCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (m: Meeting) => {
    setEditing(m);
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: MeetingFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        title: values.title,
        scheduledAt: values.meetingDate.toISOString(),
        durationMinutes: values.durationMinutes ?? null,
        meetingType: values.meetingType,
        summary: values.summary ?? null,
        meetingNotes: null,
        attendees: values.attendees ?? [],
        location: values.location ?? null,
        generateMeetLink: values.generateMeetLink ?? false,
        status: values.status,
      };

      if (editing) {
        await apiRequest({
          url: `${apiBase}/${accountId}/meetings/${editing.id}`,
          method: "PUT",
          data: payload,
        });
        message.success("Meeting updated");
      } else {
        await apiRequest({
          url: `${apiBase}/${accountId}/meetings`,
          method: "POST",
          data: payload,
        });
        message.success("Meeting scheduled");
      }

      setDrawerOpen(false);
      setEditing(null);
      await fetchMeetings();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (m: Meeting) => {
    modal.confirm({
      title: "Delete meeting",
      content: `Delete "${m.title}"? This can't be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiRequest({
            url: `${apiBase}/${accountId}/meetings/${m.id}`,
            method: "DELETE",
          });
          message.success("Meeting deleted");
          await fetchMeetings();
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to delete";
          message.error(msg);
        }
      },
    });
  };

  return (
    <>
      <Card
        className="!rounded-xl !border-zinc-200 !shadow-sm"
        title={
          <div className="flex items-center justify-between w-full">
            <span>Meetings</span>
            {canEdit && (
              <Button
                type="primary"
                size="small"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreate}
              >
                Schedule Meeting
              </Button>
            )}
          </div>
        }
      >
        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>
        ) : meetings.length === 0 ? (
          <Empty description="No meetings yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            {canEdit && (
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreate}
              >
                Schedule Meeting
              </Button>
            )}
          </Empty>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="group flex items-start justify-between gap-4 rounded-xl border border-zinc-100 bg-white p-4 hover:border-zinc-200 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => router.push(`${APP_ROUTES.meetings}/${m.id}`)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Date block */}
                  <div className="w-12 shrink-0 text-center rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-1">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium leading-none">
                      {new Date(m.meetingDate).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="text-xl font-semibold text-zinc-900 leading-tight">
                      {new Date(m.meetingDate).getDate()}
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-none">
                      {new Date(m.meetingDate).toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-zinc-900 truncate">{m.title}</span>
                      <Tag
                        color={STATUS_COLOR[m.status] || "default"}
                        className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none"
                      >
                        {m.status}
                      </Tag>
                      {m.meetingType && m.meetingType !== "other" && (
                        <Tag className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none !bg-zinc-50 !text-zinc-500 !border-zinc-200">
                          {TYPE_LABELS[m.meetingType] || m.meetingType}
                        </Tag>
                      )}
                      {m.meetLink && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                          <Video className="w-2.5 h-2.5" /> Meet
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                      <span>
                        {new Date(m.meetingDate).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {m.durationMinutes && <span>· {m.durationMinutes} min</span>}
                      {m.attendees && m.attendees.length > 0 && (
                        <span>· {m.attendees.length} attendee{m.attendees.length !== 1 ? "s" : ""}</span>
                      )}
                      {m.meetLink && (
                        <a
                          href={m.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" /> Join
                        </a>
                      )}
                    </div>

                    {(m.summary || m.notes) && (
                      <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">
                        {m.summary || m.notes}
                      </p>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div
                    className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip title="Edit">
                      <Button
                        type="text"
                        size="small"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEdit(m)}
                      />
                    </Tooltip>
                    <Tooltip title="Delete">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => handleDelete(m)}
                      />
                    </Tooltip>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <MeetingFormDrawer
        open={drawerOpen}
        mode={editing ? "edit" : "create"}
        meeting={editing as never}
        accountId={accountId}
        googleConnected={googleConnected}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={handleClose}
      />
    </>
  );
}
