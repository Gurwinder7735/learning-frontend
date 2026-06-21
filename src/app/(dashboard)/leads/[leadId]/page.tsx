"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag, Card, Tabs, Descriptions, Space, Typography, Empty, Spin, Modal, Form, Input as AntInput, Select, Drawer, App, Timeline, DatePicker, Switch } from "antd";
import DocumentList from "@/components/documents/DocumentList";
import { ArrowLeft, Target, Edit3, Trash2, Plus, Phone, Mail, ExternalLink, Calendar, Clock, MessageSquare, Flag, Save, User, Video, Loader2, FileText } from "lucide-react";
import { COUNTRY_OPTIONS, getFilteredTimezones } from "@/lib/constants/clientOptions";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchLeadDetailRequest, clearLeadDetail, updateLeadRequest, deleteLeadRequest,
  updateLeadStatusRequest, addActivityRequest,
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
import RichTextEditor from "@/components/ui/RichTextEditor";
import { APP_ROUTES } from "@/lib/constants/appConstants";

const statusColors: Record<string, string> = {
  new: "default",
  contacted: "blue",
  meeting_scheduled: "orange",
  proposal_sent: "purple",
  won: "green",
  lost: "red",
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
  { value: "meeting_scheduled", label: "Meeting Scheduled" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
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

  const [salesPrepNotes, setSalesPrepNotes] = useState("");
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

  useEffect(() => {
    if (lead?.salesPrepNotes !== undefined) {
      setSalesPrepNotes(lead.salesPrepNotes ?? "");
    }
  }, [lead?.salesPrepNotes]);

  const handleSaveNotes = useCallback(() => {
    setIsSavingNotes(true);
    dispatch(updateLeadRequest({ id: leadId, data: { salesPrepNotes } }));
    setTimeout(() => setIsSavingNotes(false), 500);
  }, [leadId, salesPrepNotes, dispatch]);

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

  const handleStatusChange = (status: string) => {
    Modal.confirm({
      title: "Update status",
      content: `Change status to "${statusOptions.find((s) => s.value === status)?.label}"?`,
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
              style={{ width: 160 }}
              onChange={handleStatusChange}
              options={statusOptions}
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
              <div className="space-y-6">
                <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title="Contact Information">
                  <Descriptions column={{ xs: 1, sm: 2 }} colon={false} className="[&_.ant-descriptions-item-content]:text-zinc-900">
                    <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Contact Person</span>}>
                      {lead.contactPerson}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Status</span>}>
                      <Tag color={statusColors[lead.status] || "default"} className="!rounded-full">{lead.status.replace("_", " ")}</Tag>
                    </Descriptions.Item>
                    {lead.email && (
                      <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Email</span>}>
                        <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {lead.email}
                        </a>
                      </Descriptions.Item>
                    )}
                    {lead.phone && (
                      <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Phone</span>}>
                        <a href={`tel:${lead.phone}`} className="text-zinc-900 hover:text-zinc-600 inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </a>
                      </Descriptions.Item>
                    )}
                    {lead.linkedinProfile && (
                      <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">LinkedIn</span>}>
                        <a href={lead.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> View Profile
                        </a>
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Source</span>}>
                      {sourceOptions.find((o) => o.value === lead.source)?.label || lead.source}
                    </Descriptions.Item>
                    {lead.country && (
                      <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Country</span>}>
                        {lead.country}
                      </Descriptions.Item>
                    )}
                    {lead.timezone && (
                      <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Timezone</span>}>
                        {lead.timezone}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Created</span>}>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </Descriptions.Item>
                    {lead.assignedTo && (
                      <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Assigned To</span>}>
                        <span className="inline-flex items-center gap-1 text-zinc-900">
                          <User className="w-3 h-3 text-zinc-400" />
                          {usersMap[lead.assignedTo] || "Unknown"}
                        </span>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>

                {lead.clientId && (
                  <Card className="!rounded-xl !border-zinc-200 !shadow-sm !bg-green-50/50" size="small">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Target className="w-4 h-4" />
                      <span>Converted to client</span>
                      <Button type="link" size="small" className="!p-0 !h-auto" onClick={() => router.push(`${APP_ROUTES.clients}/${lead.clientId}`)}>
                        View Client Profile &rarr;
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: "timeline",
            label: `Timeline (${activities.length})`,
            children: (
              <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title={
                <div className="flex items-center justify-between w-full">
                  <span>Activity Timeline</span>
                  <Button type="primary" size="small" icon={<Plus className="w-4 h-4" />} onClick={() => setShowActivityForm(true)}>
                    Add Note
                  </Button>
                </div>
              }>
                {showActivityForm && (
                  <div className="mb-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                    <Form form={activityForm} layout="vertical">
                      <Form.Item name="type" label="Type" initialValue="note" className="!mb-3">
                        <Select
                          options={[
                            { value: "note", label: "Note" },
                            { value: "meeting", label: "Meeting Note" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="content" label="Note" rules={[{ required: true, message: "Required" }]} className="!mb-3">
                        <AntInput.TextArea rows={3} placeholder="What happened?" />
                      </Form.Item>
                      <Space>
                        <Button type="primary" onClick={handleAddActivity}>Add</Button>
                        <Button onClick={() => { setShowActivityForm(false); activityForm.resetFields(); }}>Cancel</Button>
                      </Space>
                    </Form>
                  </div>
                )}

                {activities.length === 0 ? (
                  <Empty description="No activities yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowActivityForm(true)}>
                      Add Activity
                    </Button>
                  </Empty>
                ) : (
                  <Timeline
                    items={activities.map((a) => ({
                      dot: activityTypeIcons[a.type] || <MessageSquare className="w-4 h-4" />,
                      children: (
                        <div className="mb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-sm font-medium text-zinc-900 capitalize">{a.type.replace("_", " ")}</span>
                              {a.createdByName && (
                                <span className="text-xs text-zinc-400 ml-2">by {a.createdByName}</span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-400 shrink-0 ml-4">{new Date(a.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                        </div>
                      ),
                    }))}
                    className="!px-2"
                  />
                )}
              </Card>
            ),
          },
          {
            key: "sales-prep",
            label: "Sales Prep",
            children: (
              <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title={
                <div className="flex items-center justify-between w-full">
                  <span>Sales Preparation Notes</span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<Save className="w-4 h-4" />}
                    onClick={handleSaveNotes}
                    loading={isSavingNotes}
                  >
                    Save
                  </Button>
                </div>
              }>
                <RichTextEditor
                  content={salesPrepNotes}
                  onChange={setSalesPrepNotes}
                  placeholder="Prepare your sales notes here — talking points, key info, objection handling, etc..."
                />
              </Card>
            ),
          },
          {
            key: "documents",
            label: "Documents",
            children: (
              <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title={<span>Documents</span>}>
                <DocumentList entityType="lead" entityId={leadId} />
              </Card>
            ),
          },
          {
            key: "meetings",
            label: `Meetings (${meetings.length})`,
            children: (
              <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title={
                <div className="flex items-center justify-between w-full">
                  <span>Meetings</span>
                  <Button type="primary" size="small" icon={<Plus className="w-4 h-4" />} onClick={() => setMeetingDrawerOpen(true)}>
                    Schedule Meeting
                  </Button>
                </div>
              }>
                {meetings.length === 0 ? (
                  <Empty description="No meetings scheduled" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setMeetingDrawerOpen(true)}>
                      Schedule Meeting
                    </Button>
                  </Empty>
                ) : (
                  <div className="space-y-2">
                    {meetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="group flex items-center gap-4 p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer bg-white"
                        onClick={() => router.push(`${APP_ROUTES.meetings}/${meeting.id}`)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-zinc-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Typography.Text strong className="!text-sm block truncate">{meeting.title}</Typography.Text>
                            {meeting.meetLink && (
                              <Tag className="!rounded-full !text-[10px] !px-1.5 !py-0 !leading-none !border-purple-200 !text-purple-600 !bg-purple-50 shrink-0">
                                <Video className="w-2.5 h-2.5 inline mr-0.5" />Meet
                              </Tag>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Tag color={meeting.status === "completed" ? "green" : meeting.status === "cancelled" ? "red" : "blue"} className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none">
                              {meeting.status.replace("_", " ")}
                            </Tag>
                            <Typography.Text className="text-xs text-zinc-400">
                              {new Date(meeting.meetingDate).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </Typography.Text>
                            {meeting.durationMinutes && (
                              <Typography.Text className="text-xs text-zinc-400">&middot; {meeting.durationMinutes} min</Typography.Text>
                            )}
                            {meeting.attendees && meeting.attendees.length > 0 && (
                              <Typography.Text className="text-xs text-zinc-400">&middot; {meeting.attendees.length} {meeting.attendees.length === 1 ? "attendee" : "attendees"}</Typography.Text>
                            )}
                          </div>
                        </div>
                        <Space size={4} onClick={(e) => e.stopPropagation()} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {meeting.meetLink && (
                            <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer">
                              <Button size="small" icon={<Video className="w-3 h-3" />} className="!text-zinc-800 !border-zinc-300 !text-xs">
                                Join
                              </Button>
                            </a>
                          )}
                          <Button
                            size="small"
                            danger
                            type="text"
                            icon={meetingDeleting === meeting.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            onClick={() => handleDeleteMeeting(meeting.id)}
                          />
                        </Space>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
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
