"use client";

import { useEffect } from "react";
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { Lock } from "lucide-react";
import type { AccountOption } from "@/types/models/Client";
import type { Meeting } from "@/types/models/Meeting";

/**
 * Shared meeting create / edit drawer used in:
 *   - /meetings list page (create — shows account picker)
 *   - /meetings/[id] detail page (edit — shows account picker)
 *   - AccountMeetingsPanel on lead/client pages (create + edit — account
 *     picker hidden because the account is implicit)
 *
 * Completed-meeting lock:
 *   When editing a meeting whose status is already "completed", the
 *   Date & Time and Duration fields are disabled. A Tooltip on the
 *   lock icon explains why. All other fields stay editable so the user
 *   can add post-meeting notes, fix typos, add attendees, etc.
 */

export interface MeetingFormValues {
  title: string;
  clientId?: string | null;
  meetingType: string;
  meetingDate: dayjs.Dayjs;
  durationMinutes?: number | null;
  summary?: string | null;
  attendees?: string[];
  location?: string | null;
  status?: string;
  generateMeetLink?: boolean;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  /** Pre-fill values for edit mode. */
  meeting?: Meeting | null;
  /** When provided the Account picker is hidden (meeting is on an account page). */
  accountId?: string;
  /** All leads + clients for the account picker. */
  accounts?: AccountOption[];
  accountsLoading?: boolean;
  googleConnected?: boolean;
  submitting?: boolean;
  onSubmit: (values: MeetingFormValues) => void;
  onClose: () => void;
}

const TYPE_OPTIONS = [
  { value: "client_meeting", label: "Client Meeting" },
  { value: "discovery", label: "Discovery" },
  { value: "internal", label: "Internal" },
  { value: "review", label: "Review" },
  { value: "kickoff", label: "Kickoff" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function MeetingFormDrawer({
  open,
  mode,
  meeting,
  accountId,
  accounts = [],
  accountsLoading = false,
  googleConnected = false,
  submitting = false,
  onSubmit,
  onClose,
}: Props) {
  const [form] = Form.useForm<MeetingFormValues>();

  // A completed meeting has its scheduling facts locked.
  const isCompleted = mode === "edit" && meeting?.status === "completed";

  // Pre-fill form when editing or reset when creating.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && meeting) {
      form.setFieldsValue({
        title: meeting.title,
        clientId: meeting.clientId ?? undefined,
        meetingType: meeting.meetingType ?? "other",
        meetingDate: dayjs(meeting.meetingDate),
        durationMinutes: meeting.durationMinutes ?? undefined,
        summary: meeting.summary ?? "",
        attendees: meeting.attendees ?? [],
        location: meeting.location ?? "",
        status: meeting.status,
        generateMeetLink: false,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        meetingType: accountId ? "client_meeting" : "other",
        durationMinutes: 60,
        attendees: [],
      });
    }
  }, [open, mode, meeting, accountId, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      // antd shows inline field errors
    }
  };

  const handleClose = () => {
    if (!submitting) {
      form.resetFields();
      onClose();
    }
  };

  // Lock label shown next to disabled fields.
  const lockedHint = isCompleted ? (
    <Tooltip title="This field cannot be changed on a completed meeting — it is a historical record.">
      <Lock className="w-3 h-3 text-zinc-400 inline ml-1 cursor-help" />
    </Tooltip>
  ) : null;

  return (
    <Drawer
      title={mode === "create" ? "Schedule Meeting" : "Edit Meeting"}
      open={open}
      width={520}
      onClose={handleClose}
      destroyOnClose
      footer={
        <Space className="w-full justify-end">
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleOk} loading={submitting}>
            {mode === "create" ? "Schedule" : "Save Changes"}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        {/* Title */}
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: "Required" }]}
        >
          <Input placeholder="e.g. Kickoff Call" />
        </Form.Item>

        {/* Account picker — hidden when on an account page */}
        {!accountId && (
          <Form.Item name="clientId" label="Account (Lead / Client)">
            <Select
              showSearch
              allowClear
              placeholder="Link to a lead or client (optional)"
              loading={accountsLoading}
              optionFilterProp="label"
              options={accounts.map((a) => ({ value: a.id, label: a.companyName }))}
              notFoundContent={accountsLoading ? "Loading…" : "No accounts found"}
            />
          </Form.Item>
        )}

        {/* Meeting type */}
        <Form.Item name="meetingType" label="Type">
          <Select options={TYPE_OPTIONS} />
        </Form.Item>

        {/* Date & time — locked for completed meetings */}
        <Form.Item
          name="meetingDate"
          label={<span>Date & Time {lockedHint}</span>}
          rules={[{ required: true, message: "Required" }]}
        >
          <DatePicker
            showTime={{ format: "HH:mm" }}
            format="YYYY-MM-DD HH:mm"
            className="!w-full"
            disabled={isCompleted}
          />
        </Form.Item>

        {/* Duration — locked for completed meetings */}
        <Form.Item
          name="durationMinutes"
          label={<span>Duration (minutes) {lockedHint}</span>}
        >
          <InputNumber
            min={5}
            max={720}
            step={5}
            className="!w-full"
            disabled={isCompleted}
            placeholder="60"
          />
        </Form.Item>

        {/* Summary */}
        <Form.Item name="summary" label="Summary / Agenda">
          <Input.TextArea rows={3} placeholder="Agenda, pre-read links, topics to cover…" />
        </Form.Item>

        {/* Attendees */}
        <Form.Item name="attendees" label="Attendees">
          <Select
            mode="tags"
            placeholder="Type email and press Enter"
            tokenSeparators={[",", ";", " "]}
            open={false}
          />
        </Form.Item>

        {/* Location */}
        <Form.Item name="location" label="Location">
          <Input placeholder="Room or virtual link" />
        </Form.Item>

        {/* Status — edit mode only */}
        {mode === "edit" && (
          <Form.Item name="status" label="Status">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        )}

        {/* Google Meet link — only for create / non-completed edit */}
        {googleConnected && !isCompleted && (
          <Form.Item
            name="generateMeetLink"
            label="Generate Google Meet Link"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}
