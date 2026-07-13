"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import {
  Calendar,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { apiRequest } from "@/lib/api/axiosInstance";

/**
 * Meetings panel for the account detail pages.
 *
 * Talks to ``/{apiBase}/{accountId}/meetings`` sibling endpoints —
 * available under both ``/api/v1/leads`` and ``/api/v1/clients``.
 * Behind the scenes both routes proxy the same MeetingModel collection
 * keyed by ``client_id``, so a lead's meetings appear on the client
 * detail page post-conversion and vice versa (same ObjectId).
 */

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  durationMinutes?: number | null;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string | null;
  meetLink?: string | null;
}

interface Props {
  accountId: string;
  /** ``/api/v1/leads`` or ``/api/v1/clients``. */
  apiBase: string;
  canEdit?: boolean;
}

const statusColors: Record<string, string> = {
  scheduled: "blue",
  completed: "green",
  cancelled: "red",
};

export function AccountMeetingsPanel({
  accountId,
  apiBase,
  canEdit = true,
}: Props) {
  const { message, modal } = App.useApp();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

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
    form.resetFields();
    form.setFieldsValue({ durationMinutes: 30 });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (m: Meeting) => {
    setEditing(m);
    form.setFieldsValue({
      title: m.title,
      scheduledAt: dayjs(m.meetingDate),
      durationMinutes: m.durationMinutes ?? 30,
      status: m.status,
      meetingNotes: m.notes ?? "",
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        title: values.title,
        scheduledAt: (values.scheduledAt as dayjs.Dayjs).toISOString(),
        durationMinutes: values.durationMinutes,
        status: values.status,
        meetingNotes: values.meetingNotes,
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
      form.resetFields();
      await fetchMeetings();
    } catch (e) {
      // Validation errors don't have a message; API errors do.
      const msg = e instanceof Error ? e.message : "";
      if (msg) message.error(msg);
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
              className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 bg-white p-4 hover:border-zinc-200 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-900 truncate">
                      {m.title}
                    </span>
                    <Tag
                      color={statusColors[m.status] || "default"}
                      className="!rounded-full !text-[10px] !px-2 !py-0"
                    >
                      {m.status}
                    </Tag>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                    <span>{new Date(m.meetingDate).toLocaleString()}</span>
                    {m.durationMinutes && <span>· {m.durationMinutes} min</span>}
                    {m.meetLink && (
                      <a
                        href={m.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Video className="w-3 h-3" />
                        Join
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {m.notes && (
                    <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                      {m.notes}
                    </p>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
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

      <Drawer
        title={editing ? "Edit meeting" : "Schedule meeting"}
        open={drawerOpen}
        width={480}
        onClose={() => {
          if (!submitting) {
            setDrawerOpen(false);
            setEditing(null);
            form.resetFields();
          }
        }}
        destroyOnClose
        footer={
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setDrawerOpen(false);
                setEditing(null);
                form.resetFields();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="primary" onClick={handleSubmit} loading={submitting}>
              {editing ? "Save" : "Schedule"}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g. Kickoff Call" />
          </Form.Item>
          <Form.Item
            name="scheduledAt"
            label="Date & time"
            rules={[{ required: true, message: "Required" }]}
          >
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="YYYY-MM-DD HH:mm"
              className="!w-full"
            />
          </Form.Item>
          <Form.Item name="durationMinutes" label="Duration (minutes)">
            <InputNumber min={5} max={480} step={5} className="!w-full" />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Status">
              <Input placeholder="scheduled / completed / cancelled" />
            </Form.Item>
          )}
          <Form.Item name="meetingNotes" label="Notes">
            <Input.TextArea rows={4} placeholder="Agenda, links, anything…" />
          </Form.Item>
        </Form>
      </Drawer>
    </Card>
  );
}
