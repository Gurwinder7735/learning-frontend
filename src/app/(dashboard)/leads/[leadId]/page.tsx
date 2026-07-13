"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag, Card, Tabs, Space, Typography, Spin, Modal, Form, Input as AntInput, Select, Drawer, App, DatePicker, Switch } from "antd";
import DocumentList from "@/components/documents/DocumentList";
import { ArrowLeft, Target, Edit3, Trash2, Plus, Phone, Mail, ExternalLink, Calendar, Clock, MessageSquare, Flag, Save, User, Video, Loader2, FileText, MapPin, X } from "lucide-react";
import { COUNTRY_OPTIONS, getFilteredTimezones } from "@/lib/constants/clientOptions";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchLeadDetailRequest, clearLeadDetail, updateLeadRequest, deleteLeadRequest,
  updateLeadStatusRequest, revertLeadRequest, addActivityRequest,
} from "@/store/modules/leads/leadsSlice";
import { selectLeadDetail, selectLeadActivities, selectLeadMeetings } from "@/store/modules/leads/leadsSelectors";
import { fetchUsersRequest } from "@/store/modules/user/userSlice";
import { selectUsers } from "@/store/modules/user/userSelectors";
import {
  createMeetingRequest as createMeetingSystemRequest,
  deleteMeetingRequest as deleteMeetingSystemRequest,
  fetchGoogleStatusRequest,
} from "@/store/modules/meetings/meetingsSlice";
import { selectGoogleConnected } from "@/store/modules/meetings/meetingsSelectors";
import { BRDContentEditor } from "@/components/features/BRD/BRDContentEditor";
import { apiRequest } from "@/lib/api/axiosInstance";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import type { SalesPrepSection } from "@/types/models/Lead";

const statusColors: Record<string, string> = {
  new: "default",
  contacted: "blue",
  follow_up: "cyan",
  meeting_scheduled: "orange",
  discovery: "geekblue",
  qualified: "lime",
  proposal_in_progress: "gold",
  proposal_sent: "purple",
  negotiation: "magenta",
  decision_pending: "volcano",
  on_hold: "default",
  won: "green",
  lost: "red",
  // Post-conversion terminal status. Kept green to signal the lead
  // journey landed successfully.
  converted_to_client: "green",
};

const sourceOptions = [
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "upwork", label: "Upwork" },
  { value: "website", label: "Website" },
  { value: "existing_client", label: "Existing Client" },
  { value: "partner", label: "Partner" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "meeting_scheduled", label: "Meeting Scheduled" },
  { value: "discovery", label: "Discovery" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_in_progress", label: "Proposal in Progress" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "decision_pending", label: "Decision Pending" },
  { value: "on_hold", label: "On Hold" },
  { value: "lost", label: "Lost" },
  // Terminal — selecting this triggers the /convert endpoint on the
  // backend, which flips lifecycle_stage to "client" on the same
  // record. The old ``won`` value stays supported server-side for
  // backward compatibility.
  { value: "converted_to_client", label: "Converted to Client" },
];

const activityTypeIcons: Record<string, React.ReactNode> = {
  note: <MessageSquare className="w-4 h-4" />,
  status_change: <Flag className="w-4 h-4" />,
  meeting: <Calendar className="w-4 h-4" />,
  document_uploaded: <FileText className="w-4 h-4" />,
};

export default function LeadDetailPage() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAdmin, user } = useAuth();
  const detail = useAppSelector(selectLeadDetail);
  const activities = useAppSelector(selectLeadActivities);
  const meetings = useAppSelector(selectLeadMeetings);
  const allUsers = useAppSelector(selectUsers);
  const googleConnected = useAppSelector(selectGoogleConnected);

  const leadId = params.leadId as string;
  const lead = detail?.lead ?? null;

  const usersMap = useMemo(() => {
    const map: Record<string, string> = {};
    allUsers.forEach((u) => { map[u.id] = u.name || u.email; });
    return map;
  }, [allUsers]);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editCountry, setEditCountry] = useState<string>();

  const [activityForm] = Form.useForm();
  const [showActivityForm, setShowActivityForm] = useState(false);

  const [meetingDrawerOpen, setMeetingDrawerOpen] = useState(false);
  const [meetingForm] = Form.useForm();

  const [salesPrepSections, setSalesPrepSections] = useState<SalesPrepSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [meetingDeleting, setMeetingDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (leadId) {
      dispatch(fetchLeadDetailRequest(leadId));
      dispatch(fetchGoogleStatusRequest());
    }
    return () => { dispatch(clearLeadDetail()); };
  }, [leadId, dispatch]);

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchUsersRequest({ pageSize: 100 }));
    }
  }, [isAdmin, dispatch]);

  // Canonical-home redirect. If the loaded lead has already been
  // converted (``lifecycleStage=client``), the client detail page is
  // the canonical home for the account — everything the lead detail
  // used to show is now available there under the new tabs. We
  // ``router.replace`` (rather than ``push``) so the browser Back
  // button doesn't bounce the user right back to /leads/{id}.
  useEffect(() => {
    if (lead && lead.lifecycleStage === "client") {
      router.replace(`${APP_ROUTES.clients}/${lead.id}`);
    }
  }, [lead?.id, lead?.lifecycleStage, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lead?.salesPrepSections !== undefined) {
      const secs = lead.salesPrepSections ?? [];
      setSalesPrepSections(secs);
      if (secs.length > 0 && !activeSectionId) setActiveSectionId(secs[0].id);
    }
  }, [lead?.id]); // eslint-disable-line

  const handleSaveNotes = useCallback(async () => {
    setIsSavingNotes(true);
    try {
      const res = await apiRequest<{ data: { salesPrepSections: SalesPrepSection[] } }>({
        url: `/api/v1/leads/${leadId}/sales-prep`,
        method: "PATCH",
        data: { sections: salesPrepSections },
      });
      const saved = res.data?.salesPrepSections ?? salesPrepSections;
      setSalesPrepSections(saved);
      message.success("Saved");
    } catch {
      message.error("Failed to save");
    } finally {
      setIsSavingNotes(false);
    }
  }, [leadId, salesPrepSections]);

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      dispatch(updateLeadRequest({ id: leadId, data: values }));
      setEditDrawerOpen(false);
    } catch {
      // validation failed
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete lead",
      content: `Are you sure you want to delete ${lead?.companyName}? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => {
        dispatch(deleteLeadRequest(leadId));
        router.push(APP_ROUTES.leads);
      },
    });
  };

  /**
   * Three transitions can happen from the status dropdown:
   *
   *   1. Forward conversion — currently in lead-stage, target is
   *      ``converted_to_client``. Confirms as "Convert to client".
   *   2. Revert — record is already converted and the user picks any
   *      non-terminal lead status. This will unpublish the record
   *      from the Clients view (same ObjectId; downstream artefacts
   *      stay linked). Confirmed via a distinct danger-styled modal.
   *   3. Plain funnel move — regular status update within lead-stage.
   */
  const handleStatusChange = (status: string) => {
    if (!lead) return;
    const label = statusOptions.find((s) => s.value === status)?.label ?? status;
    const isCurrentlyConverted = lead.lifecycleStage === "client";
    const isTargetTerminal = status === "converted_to_client" || status === "won";

    // Path 1 — forward conversion.
    if (!isCurrentlyConverted && isTargetTerminal) {
      Modal.confirm({
        title: "Convert to client?",
        content:
          "The account will appear in the Clients module. Documents, " +
          "meetings, and BRDs linked to this lead will follow the same " +
          "record.",
        okText: "Convert",
        okButtonProps: { className: "bg-emerald-600" },
        onOk: () => dispatch(updateLeadStatusRequest({ id: leadId, status })),
      });
      return;
    }

    // Path 2 — revert. The account is currently client-stage and the
    // user picked a lead status. Route through the dedicated revert
    // endpoint via ``revertLeadRequest`` for a clearer audit trail.
    if (isCurrentlyConverted && !isTargetTerminal) {
      Modal.confirm({
        title: "Revert this lead?",
        content: (
          <div className="space-y-2 text-sm">
            <p>
              This account will move back to <strong>{label}</strong> in the
              Leads module and disappear from the Clients view.
            </p>
            <p className="text-zinc-500">
              The record itself and everything linked to it &mdash;
              documents, meetings, BRDs, proposals, agreements, SOWs
              &mdash; stay attached. Nothing is deleted, only the
              lifecycle marker changes.
            </p>
          </div>
        ),
        okText: "Revert",
        okType: "danger",
        onOk: () => dispatch(revertLeadRequest({ id: leadId, status })),
      });
      return;
    }

    // Path 3 — plain in-lead status change. Or "stay converted" (a
    // no-op the user is warned about but permitted).
    Modal.confirm({
      title: "Update status",
      content: `Change status to "${label}"?`,
      okText: "Update",
      onOk: () => dispatch(updateLeadStatusRequest({ id: leadId, status })),
    });
  };

  const handleAddActivity = async () => {
    try {
      const values = await activityForm.validateFields();
      dispatch(addActivityRequest({ leadId, ...values }));
      setShowActivityForm(false);
      activityForm.resetFields();
    } catch {
      // validation failed
    }
  };

  const handleCreateMeeting = async () => {
    try {
      const values = await meetingForm.validateFields();
      const meetingDate = values.meetingDate.toISOString();
      dispatch(createMeetingSystemRequest({
        title: values.title,
        leadId,
        meetingDate,
        meetingType: values.meetingType || "discovery",
        durationMinutes: values.durationMinutes || 60,
        summary: values.summary || null,
        attendees: values.attendees?.length ? values.attendees : (lead?.email ? [lead.email] : []),
        location: values.location || null,
        generateMeetLink: values.generateMeetLink || false,
      }));
      setMeetingDrawerOpen(false);
      meetingForm.resetFields();
      setTimeout(() => dispatch(fetchLeadDetailRequest(leadId)), 500);
    } catch {
      // validation failed
    }
  };

  const handleDeleteMeeting = (meetingId: string) => {
    Modal.confirm({
      title: "Delete meeting",
      content: "Are you sure?",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        setMeetingDeleting(meetingId);
        dispatch(deleteMeetingSystemRequest(meetingId));
        setTimeout(() => {
          dispatch(fetchLeadDetailRequest(leadId));
          setMeetingDeleting(null);
        }, 500);
      },
    });
  };

  if (!lead) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button type="text" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push(APP_ROUTES.leads)} className="!text-zinc-500 hover:!text-zinc-900 !-ml-2 mb-2">
          Back to Leads
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
              <Target className="w-7 h-7 text-zinc-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Typography.Title level={3} className="!mb-0 !text-2xl">{lead.companyName}</Typography.Title>
                <Tag color={statusColors[lead.status] || "default"} className="!rounded-full !px-3 !py-0.5 !text-xs">
                  {lead.status.replace("_", " ")}
                </Tag>
              </div>
              <Typography.Text className="text-zinc-500 text-sm">{lead.contactPerson}</Typography.Text>
            </div>
          </div>
          <Space>
            <Select
              value={lead.status}
              style={{ width: 220 }}
              onChange={handleStatusChange}
              options={statusOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
              }
              className="[&_.ant-select-selector]:!rounded-lg"
            />
            <Button icon={<Edit3 className="w-4 h-4" />} onClick={() => { editForm.setFieldsValue(lead); setEditCountry(lead.country ?? undefined); setEditDrawerOpen(true); }}>
              Edit
            </Button>
            <Button danger icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>
              Delete
            </Button>
          </Space>
        </div>
      </div>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: "Overview",
            children: (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ── Primary contact card ──────────────────────────── */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <Card className="!rounded-xl !border-zinc-200 !shadow-sm">
                    {/* Avatar + name */}
                    <div className="flex flex-col items-center text-center pb-4 border-b border-zinc-100">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
                        <User className="w-8 h-8 text-zinc-400" />
                      </div>
                      <p className="text-base font-semibold text-zinc-900 leading-tight">
                        {lead.contactPerson || "—"}
                      </p>
                      <p className="text-sm text-zinc-500 mt-0.5">{lead.companyName}</p>
                      <Tag
                        color={statusColors[lead.status] || "default"}
                        className="!rounded-full !px-3 !py-0.5 !text-xs mt-2"
                      >
                        {lead.status.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </Tag>
                    </div>

                    {/* Quick-action buttons */}
                    <div className="flex gap-2 pt-4 pb-2">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="flex-1">
                          <Button
                            block
                            icon={<Mail className="w-3.5 h-3.5" />}
                            size="small"
                            className="!rounded-lg !text-xs !border-zinc-200 !text-zinc-600"
                          >
                            Email
                          </Button>
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="flex-1">
                          <Button
                            block
                            icon={<Phone className="w-3.5 h-3.5" />}
                            size="small"
                            className="!rounded-lg !text-xs !border-zinc-200 !text-zinc-600"
                          >
                            Call
                          </Button>
                        </a>
                      )}
                      {lead.linkedinProfile && (
                        <a href={lead.linkedinProfile} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button
                            block
                            icon={<ExternalLink className="w-3.5 h-3.5" />}
                            size="small"
                            className="!rounded-lg !text-xs !border-zinc-200 !text-zinc-600"
                          >
                            LinkedIn
                          </Button>
                        </a>
                      )}
                    </div>

                    {/* Contact detail rows */}
                    <div className="space-y-3 pt-2">
                      {lead.email && (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Email</p>
                            <p className="text-sm text-zinc-800 truncate">{lead.email}</p>
                          </div>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Phone</p>
                            <p className="text-sm text-zinc-800">{lead.phone}</p>
                          </div>
                        </div>
                      )}
                      {lead.linkedinProfile && (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">LinkedIn</p>
                            <a
                              href={lead.linkedinProfile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate block"
                            >
                              View Profile
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* ── Account details ───────────────────────────────── */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title="Account Details">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                      {[
                        {
                          label: "Source",
                          value: sourceOptions.find((o) => o.value === lead.source)?.label || lead.source,
                          icon: <Flag className="w-3.5 h-3.5 text-zinc-400" />,
                        },
                        {
                          label: "Country",
                          value: lead.country,
                          icon: <MapPin className="w-3.5 h-3.5 text-zinc-400" />,
                        },
                        {
                          label: "Timezone",
                          value: lead.timezone,
                          icon: <Clock className="w-3.5 h-3.5 text-zinc-400" />,
                        },
                        {
                          label: "Assigned To",
                          value: lead.assignedTo ? (usersMap[lead.assignedTo] || "Unknown") : null,
                          icon: <User className="w-3.5 h-3.5 text-zinc-400" />,
                        },
                        {
                          label: "Created",
                          value: new Date(lead.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          }),
                          icon: <Calendar className="w-3.5 h-3.5 text-zinc-400" />,
                        },
                        {
                          label: "Last Updated",
                          value: new Date(lead.updatedAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          }),
                          icon: <Clock className="w-3.5 h-3.5 text-zinc-400" />,
                        },
                      ].map(({ label, value, icon }) =>
                        value ? (
                          <div key={label} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                              {icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-0.5">
                                {label}
                              </p>
                              <p className="text-sm text-zinc-800">{value}</p>
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </Card>

                  {/* Quick stats strip */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
                      <p className="text-2xl font-semibold text-zinc-900">{meetings.length}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Meetings</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
                      <p className="text-2xl font-semibold text-zinc-900">{activities.length}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Activities</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
                      <p className="text-2xl font-semibold text-zinc-900">{salesPrepSections.length}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Prep Sections</p>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "timeline",
            label: `Timeline (${activities.length})`,
            children: (
              <div className="space-y-4">
                {/* Add note form — shown inline above the list */}
                {showActivityForm ? (
                  <Card className="!rounded-xl !border-zinc-200 !shadow-sm">
                    <p className="text-sm font-medium text-zinc-800 mb-3">New Activity</p>
                    <Form form={activityForm} layout="vertical">
                      <Form.Item name="type" label="Type" initialValue="note" className="!mb-3">
                        <Select
                          options={[
                            { value: "note", label: "Note" },
                            { value: "call", label: "Call" },
                            { value: "email", label: "Email" },
                            { value: "meeting", label: "Meeting Note" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="content" label="What happened?" rules={[{ required: true, message: "Required" }]} className="!mb-4">
                        <AntInput.TextArea rows={3} placeholder="Add context, outcome, next steps…" />
                      </Form.Item>
                      <div className="flex gap-2">
                        <Button type="primary" onClick={handleAddActivity}>Save</Button>
                        <Button onClick={() => { setShowActivityForm(false); activityForm.resetFields(); }}>Cancel</Button>
                      </div>
                    </Form>
                  </Card>
                ) : (
                  <div className="flex justify-end">
                    <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowActivityForm(true)}>
                      Add Note
                    </Button>
                  </div>
                )}

                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border border-zinc-200 rounded-xl bg-white">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600 mb-1">No activity yet</p>
                    <p className="text-xs text-zinc-400 mb-4">Log a call, note, or meeting to start the trail.</p>
                    <Button type="primary" size="small" icon={<Plus className="w-4 h-4" />} onClick={() => setShowActivityForm(true)}>
                      Add First Note
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-[19px] top-0 bottom-0 w-px bg-zinc-200" />
                    <div className="space-y-1">
                      {activities.map((a, idx) => {
                        const typeLabel = a.type.replace(/_/g, " ");
                        const typeColors: Record<string, string> = {
                          note: "bg-zinc-100 text-zinc-500",
                          call: "bg-blue-50 text-blue-500",
                          email: "bg-indigo-50 text-indigo-500",
                          meeting: "bg-orange-50 text-orange-500",
                          status_change: "bg-emerald-50 text-emerald-600",
                          document_uploaded: "bg-purple-50 text-purple-500",
                        };
                        return (
                          <div key={idx} className="flex gap-4 pb-5 relative">
                            {/* Icon bubble */}
                            <div className={`w-10 h-10 rounded-full border-2 border-white ring-1 ring-zinc-200 flex items-center justify-center shrink-0 z-10 ${typeColors[a.type] || "bg-zinc-100 text-zinc-500"}`}>
                              {activityTypeIcons[a.type] || <MessageSquare className="w-4 h-4" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1.5">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-medium text-zinc-900 capitalize">{typeLabel}</span>
                                {a.createdByName && (
                                  <span className="text-xs text-zinc-400">· {a.createdByName}</span>
                                )}
                                <span className="ml-auto text-xs text-zinc-400 shrink-0">
                                  {new Date(a.createdAt).toLocaleDateString("en-US", {
                                    month: "short", day: "numeric",
                                  })}{" "}
                                  <span className="text-zinc-300">·</span>{" "}
                                  {new Date(a.createdAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {a.content && (
                                <div className="bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2.5 text-sm text-zinc-700 whitespace-pre-wrap">
                                  {a.content}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "sales-prep",
            label: "Sales Prep",
            children: (
              <Card
                className="!rounded-xl !border-zinc-200 !shadow-sm"
                title={
                  <div className="flex items-center justify-between w-full">
                    <span>Sales Prep Workspace</span>
                    <Button
                      type="primary"
                      size="small"
                      icon={<Save className="w-4 h-4" />}
                      onClick={handleSaveNotes}
                      loading={isSavingNotes}
                      disabled={salesPrepSections.length === 0}
                    >
                      Save
                    </Button>
                  </div>
                }
              >
                {salesPrepSections.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-6 h-6 text-zinc-400" />
                    </div>
                    <p className="text-sm text-zinc-500 mb-4">No sections yet. Create your first section to start taking notes.</p>
                    <Button
                      type="primary"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        const id = crypto.randomUUID();
                        setSalesPrepSections([{ id, title: "New Section", content: "" }]);
                        setActiveSectionId(id);
                        setEditingSectionId(id);
                      }}
                    >
                      Add First Section
                    </Button>
                  </div>
                ) : (
                  <Tabs
                    type="editable-card"
                    activeKey={activeSectionId ?? undefined}
                    onChange={(key) => {
                      setActiveSectionId(key);
                      setEditingSectionId(null);
                    }}
                    onEdit={(targetKey, action) => {
                      if (action === "add") {
                        let nameInput = "";
                        Modal.confirm({
                          title: "New Section",
                          content: (
                            <AntInput
                              placeholder="Section name (e.g. Chat Notes, Objections)"
                              autoFocus
                              onChange={(e) => { nameInput = e.target.value; }}
                              onPressEnter={() => Modal.destroyAll()}
                            />
                          ),
                          okText: "Create",
                          onOk: () => {
                            const title = nameInput.trim() || "New Section";
                            const id = crypto.randomUUID();
                            setSalesPrepSections((prev) => [...prev, { id, title, content: "" }]);
                            setActiveSectionId(id);
                            setEditingSectionId(id);
                          },
                        });
                      } else if (action === "remove") {
                        const key = targetKey as string;
                        const section = salesPrepSections.find((s) => s.id === key);
                        Modal.confirm({
                          title: `Delete "${section?.title ?? "this section"}"?`,
                          content: "This will remove the section and its content. Save to persist.",
                          okText: "Delete",
                          okButtonProps: { danger: true },
                          onOk: () => {
                            setSalesPrepSections((prev) => {
                              const next = prev.filter((s) => s.id !== key);
                              if (activeSectionId === key) setActiveSectionId(next[0]?.id ?? null);
                              return next;
                            });
                            if (editingSectionId === key) setEditingSectionId(null);
                          },
                        });
                      }
                    }}
                    items={salesPrepSections.map((section) => ({
                      key: section.id,
                      label: (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            let nameInput = section.title;
                            Modal.confirm({
                              title: "Rename Section",
                              content: (
                                <AntInput
                                  defaultValue={section.title}
                                  autoFocus
                                  onChange={(e) => { nameInput = e.target.value; }}
                                  onPressEnter={() => Modal.destroyAll()}
                                />
                              ),
                              okText: "Rename",
                              onOk: () => {
                                const title = nameInput.trim() || section.title;
                                setSalesPrepSections((prev) =>
                                  prev.map((s) => s.id === section.id ? { ...s, title } : s)
                                );
                              },
                            });
                          }}
                          title="Double-click to rename"
                        >
                          {section.title}
                        </span>
                      ),
                      children: (
                        <div className="mt-2">
                          {editingSectionId === section.id ? (
                            <>
                              <div className="flex justify-end mb-2">
                                <Button size="small" icon={<X className="w-3.5 h-3.5" />} onClick={() => setEditingSectionId(null)}>
                                  Done editing
                                </Button>
                              </div>
                              <BRDContentEditor
                                content={section.content}
                                onChange={(html) =>
                                  setSalesPrepSections((prev) =>
                                    prev.map((s) => s.id === section.id ? { ...s, content: html } : s)
                                  )
                                }
                              />
                            </>
                          ) : section.content ? (
                            <div className="relative rounded-lg border border-zinc-100 bg-zinc-50/40 px-4 py-3">
                              {/* Fixed top-right Edit button — never moves with content length */}
                              <button
                                onClick={() => setEditingSectionId(section.id)}
                                className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 hover:bg-white border border-transparent hover:border-zinc-200 rounded-md px-2 py-1 transition-all"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <div
                                className="prose prose-zinc max-w-none text-sm pr-12"
                                dangerouslySetInnerHTML={{ __html: section.content }}
                              />
                            </div>
                          ) : (
                            <div className="text-center py-10 rounded-lg border border-dashed border-zinc-200">
                              <p className="text-sm text-zinc-400 mb-3">No content yet.</p>
                              <Button
                                size="small"
                                icon={<Edit3 className="w-3.5 h-3.5" />}
                                onClick={() => setEditingSectionId(section.id)}
                              >
                                Start writing
                              </Button>
                            </div>
                          )}
                        </div>
                      ),
                    }))}
                  />
                )}
              </Card>
            ),
          },
          {
            key: "documents",
            label: "Documents",
            children: (
              <Card
                className="!rounded-xl !border-zinc-200 !shadow-sm"
                title={
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span>Documents</span>
                  </div>
                }
              >
                <DocumentList entityType="lead" entityId={leadId} />
              </Card>
            ),
          },
          {
            key: "meetings",
            label: `Meetings (${meetings.length})`,
            children: (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">
                    {meetings.length === 0
                      ? "No meetings scheduled yet"
                      : `${meetings.length} meeting${meetings.length !== 1 ? "s" : ""}`}
                  </p>
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setMeetingDrawerOpen(true)}
                  >
                    Schedule Meeting
                  </Button>
                </div>

                {meetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border border-zinc-200 rounded-xl bg-white">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                      <Calendar className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600 mb-1">No meetings yet</p>
                    <p className="text-xs text-zinc-400 mb-4">Schedule a discovery call or follow-up.</p>
                    <Button type="primary" size="small" icon={<Plus className="w-4 h-4" />} onClick={() => setMeetingDrawerOpen(true)}>
                      Schedule Meeting
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {meetings.map((meeting) => {
                      const date = new Date(meeting.meetingDate);
                      const isPast = date < new Date();
                      const statusColor =
                        meeting.status === "completed" ? "green"
                        : meeting.status === "cancelled" ? "red"
                        : "blue";

                      return (
                        <div
                          key={meeting.id}
                          className="group flex items-start gap-4 p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => router.push(`${APP_ROUTES.meetings}/${meeting.id}`)}
                        >
                          {/* Date block */}
                          <div className="shrink-0 w-12 text-center rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-1">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium leading-none">
                              {date.toLocaleDateString("en-US", { month: "short" })}
                            </p>
                            <p className="text-xl font-semibold text-zinc-900 leading-tight">
                              {date.getDate()}
                            </p>
                            <p className="text-[10px] text-zinc-400 leading-none">
                              {date.toLocaleDateString("en-US", { weekday: "short" })}
                            </p>
                          </div>

                          {/* Body */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-medium text-zinc-900 truncate">{meeting.title}</span>
                              {meeting.meetLink && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                                  <Video className="w-2.5 h-2.5" /> Meet
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tag
                                color={statusColor}
                                className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none"
                              >
                                {meeting.status.replace(/_/g, " ")}
                              </Tag>
                              <span className="text-xs text-zinc-400">
                                {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {meeting.durationMinutes && (
                                <span className="text-xs text-zinc-400">· {meeting.durationMinutes} min</span>
                              )}
                              {meeting.attendees && meeting.attendees.length > 0 && (
                                <span className="text-xs text-zinc-400">
                                  · {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions — reveal on row hover */}
                          <Space
                            size={4}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5"
                          >
                            {meeting.meetLink && (
                              <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer">
                                <Button
                                  size="small"
                                  icon={<Video className="w-3 h-3" />}
                                  className="!text-xs !border-zinc-200 !text-zinc-700"
                                >
                                  Join
                                </Button>
                              </a>
                            )}
                            <Button
                              size="small"
                              danger
                              type="text"
                              icon={
                                meetingDeleting === meeting.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />
                              }
                              onClick={() => handleDeleteMeeting(meeting.id)}
                            />
                          </Space>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      <Drawer
        title="Edit Lead"
        width={560}
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); }}
        footer={
          <Space className="w-full justify-end">
            <Button onClick={() => setEditDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={handleUpdate}>Save Changes</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="companyName" label="Company Name" rules={[{ required: true, message: "Required" }]}>
            <AntInput />
          </Form.Item>
          <Form.Item name="contactPerson" label="Contact Person" rules={[{ required: true, message: "Required" }]}>
            <AntInput />
          </Form.Item>
          <Form.Item name="email" label="Email"><AntInput /></Form.Item>
          <Form.Item name="phone" label="Phone"><AntInput /></Form.Item>
          <Form.Item name="linkedinProfile" label="LinkedIn Profile"><AntInput /></Form.Item>
          <Form.Item name="source" label="Source">
            <Select showSearch placeholder="Select source" options={sourceOptions} allowClear />
          </Form.Item>
          <Form.Item name="country" label="Country">
            <Select showSearch placeholder="Select country" options={COUNTRY_OPTIONS} allowClear onChange={(val) => { setEditCountry(val); editForm.setFieldValue("timezone", undefined); }} />
          </Form.Item>
          <Form.Item name="timezone" label="Timezone">
            <Select showSearch placeholder={editCountry ? "Select timezone for " + editCountry : "Select a country first"} options={getFilteredTimezones(editCountry)} allowClear disabled={!editCountry} />
          </Form.Item>
          {isAdmin && (
            <Form.Item name="assignedTo" label="Assigned To">
              <Select
                showSearch
                placeholder="Assign to user"
                allowClear
                optionFilterProp="label"
                options={allUsers.map((u) => ({ value: u.id, label: u.name || u.email }))}
              />
            </Form.Item>
          )}
        </Form>
      </Drawer>

      <Drawer
        title="Schedule Meeting"
        width={520}
        open={meetingDrawerOpen}
        onClose={() => { setMeetingDrawerOpen(false); meetingForm.resetFields(); }}
        footer={
          <Space className="w-full justify-end">
            <Button onClick={() => { setMeetingDrawerOpen(false); meetingForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" onClick={handleCreateMeeting}>Schedule</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={meetingForm} layout="vertical" initialValues={{
          title: lead?.contactPerson ? `Discovery Call with ${lead.contactPerson}` : "",
          meetingType: "discovery",
          durationMinutes: 60,
        }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}>
            <AntInput placeholder="Meeting title" />
          </Form.Item>
          <Form.Item name="meetingType" label="Type">
            <Select options={[
              { value: "client_meeting", label: "Client Meeting" },
              { value: "internal", label: "Internal" },
              { value: "discovery", label: "Discovery" },
              { value: "review", label: "Review" },
              { value: "kickoff", label: "Kickoff" },
              { value: "other", label: "Other" },
            ]} />
          </Form.Item>
          <Form.Item name="meetingDate" label="Date & Time" rules={[{ required: true, message: "Required" }]}>
            <DatePicker showTime className="w-full" />
          </Form.Item>
          <Form.Item name="durationMinutes" label="Duration (minutes)">
            <AntInput type="number" min={15} max={480} placeholder="60" />
          </Form.Item>
          <Form.Item name="summary" label="Summary">
            <AntInput.TextArea rows={3} placeholder="Meeting agenda or notes" />
          </Form.Item>
          <Form.Item name="attendees" label="Attendees">
            <Select mode="tags" placeholder="Type email and press Enter" tokenSeparators={[",", ";", " "]} open={false} />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <AntInput placeholder="Room or virtual link" />
          </Form.Item>
          {googleConnected && (
            <Form.Item name="generateMeetLink" label="Generate Google Meet Link" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </div>
  );
}
