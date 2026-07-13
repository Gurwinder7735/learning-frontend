"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Empty, Form, Input, Space, Timeline, Select } from "antd";
import {
  Calendar,
  FileText,
  Flag,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  UserPlus,
} from "lucide-react";
import { apiRequest } from "@/lib/api/axiosInstance";

/**
 * Shared timeline panel for the Lead / Client account detail pages.
 *
 * Consumes the sibling ``POST /{apiBase}/{accountId}/activities`` +
 * ``GET /{apiBase}/{accountId}/activities`` endpoints. The backend
 * ``activities`` collection is unified across both modules, so the
 * same panel component works with either ``apiBase="/api/v1/leads"``
 * or ``apiBase="/api/v1/clients"`` — only the URL prefix changes.
 *
 * Doesn't dispatch into Redux — the timeline is a page-scoped view
 * that re-fetches on mount / after add. Same pattern as the BRD /
 * proposals / agreements / SOW pages.
 */

// Same activity → icon mapping the lead detail page uses, extended
// with the ``lead_reverted`` action from the revert flow so the
// timeline can render it distinctly.
const activityTypeIcons: Record<string, React.ReactNode> = {
  note: <MessageSquare className="w-4 h-4" />,
  status_change: <Flag className="w-4 h-4" />,
  meeting: <Calendar className="w-4 h-4" />,
  meeting_scheduled: <Calendar className="w-4 h-4" />,
  meeting_completed: <Calendar className="w-4 h-4" />,
  meeting_cancelled: <Calendar className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  lead_created: <UserPlus className="w-4 h-4" />,
  lead_converted: <Flag className="w-4 h-4" />,
  lead_reverted: <Flag className="w-4 h-4" />,
  document_uploaded: <FileText className="w-4 h-4" />,
};

// Timeline-only activity types the "Add Activity" form supports.
// Client-side audit actions (``client_created``, ``contact_added`` …)
// are backend-emitted only and shouldn't appear in the picker.
const ACTIVITY_TYPES = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
];

// Actions we treat as "timeline-worthy" — filters out backend-only
// audit chatter so the panel stays focused on user-facing activity.
const TIMELINE_ACTIONS = new Set([
  "note",
  "status_change",
  "meeting_scheduled",
  "meeting_completed",
  "meeting_cancelled",
  "email",
  "call",
  "lead_created",
  "lead_converted",
  "lead_reverted",
]);

interface Activity {
  id: string;
  // Backends serialize either ``type`` (lead-timeline shape) or
  // ``action`` (client-audit shape) — panel accepts both.
  type?: string;
  action?: string;
  content?: string;
  description?: string;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

interface Props {
  accountId: string;
  /** ``/api/v1/leads`` or ``/api/v1/clients``. */
  apiBase: string;
  /** When ``false`` the "Add note" button is hidden. Read-only mode. */
  canEdit?: boolean;
}

export function AccountTimelinePanel({ accountId, apiBase, canEdit = true }: Props) {
  const { message } = App.useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ data: Activity[] }>({
        url: `${apiBase}/${accountId}/activities`,
        method: "GET",
      });
      const items = (res.data ?? []).filter((a) => {
        const key = (a.type || a.action || "").toString();
        return TIMELINE_ACTIONS.has(key);
      });
      setActivities(items);
    } catch {
      // Best-effort — an empty timeline is fine as a fallback.
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, apiBase]);

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await apiRequest({
        url: `${apiBase}/${accountId}/activities`,
        method: "POST",
        data: values,
      });
      form.resetFields();
      setShowForm(false);
      await fetchActivities();
      message.success("Note added");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      className="!rounded-xl !border-zinc-200 !shadow-sm"
      title={
        <div className="flex items-center justify-between w-full">
          <span>Timeline</span>
          {canEdit && !showForm && (
            <Button
              type="primary"
              size="small"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowForm(true)}
            >
              Add Note
            </Button>
          )}
        </div>
      }
    >
      {showForm && (
        <div className="mb-4 p-4 bg-zinc-50 rounded-lg border border-zinc-100">
          <Form form={form} layout="vertical" size="small">
            <Form.Item name="type" label="Type" initialValue="note" className="!mb-3">
              <Select options={ACTIVITY_TYPES} />
            </Form.Item>
            <Form.Item
              name="content"
              label="Note"
              rules={[{ required: true, message: "Required" }]}
              className="!mb-3"
            >
              <Input.TextArea rows={3} placeholder="What happened?" />
            </Form.Item>
            <Space>
              <Button type="primary" onClick={handleAdd} loading={submitting}>
                Add
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>
      ) : activities.length === 0 ? (
        <Empty description="No activity yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          {canEdit && (
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowForm(true)}
            >
              Add Activity
            </Button>
          )}
        </Empty>
      ) : (
        <Timeline
          items={activities.map((a) => {
            const kind = (a.type || a.action || "note").toString();
            const label = kind.replace(/_/g, " ");
            const body = a.content || a.description || "";
            return {
              dot: activityTypeIcons[kind] || <MessageSquare className="w-4 h-4" />,
              children: (
                <div className="mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-medium text-zinc-900 capitalize">
                        {label}
                      </span>
                      {a.createdByName && (
                        <span className="text-xs text-zinc-400 ml-2">
                          by {a.createdByName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0 ml-4">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {body && (
                    <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">
                      {body}
                    </p>
                  )}
                </div>
              ),
            };
          })}
          className="!px-2"
        />
      )}
    </Card>
  );
}
