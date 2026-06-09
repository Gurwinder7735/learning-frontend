"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Button, Tag, Tabs, Space, Typography, Spin, Modal, Form, Input as AntInput, Select, DatePicker, Drawer, message, Divider, List, Checkbox } from "antd";
import { ArrowLeft, Calendar, Edit3, Trash2, Video, ExternalLink, Clock, Users, CheckCircle } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  fetchMeetingDetailRequest, updateMeetingRequest, deleteMeetingRequest,
  addDecisionRequest, addActionItemRequest, updateActionItemRequest, deleteActionItemRequest,
  clearMeetingDetail, fetchGoogleStatusRequest,
} from "@/store/modules/meetings/meetingsSlice";
import {
  selectMeetingDetail, selectMeetingDetailLoading, selectGoogleConnected,
} from "@/store/modules/meetings/meetingsSelectors";
import { APP_ROUTES } from "@/lib/constants/appConstants";

const statusColors: Record<string, string> = {
  scheduled: "blue", completed: "green", cancelled: "red",
};

const typeLabels: Record<string, string> = {
  client_meeting: "Client Meeting", internal: "Internal", discovery: "Discovery",
  review: "Review", kickoff: "Kickoff", other: "Other",
};

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectMeetingDetail);
  const loading = useAppSelector(selectMeetingDetailLoading);
  const googleConnected = useAppSelector(selectGoogleConnected);

  const meetingId = params.meetingId as string;
  const meeting = detail?.meeting ?? null;

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [decisionText, setDecisionText] = useState("");
  const [actionTitle, setActionTitle] = useState("");

  useEffect(() => {
    if (meetingId) dispatch(fetchMeetingDetailRequest(meetingId));
    dispatch(fetchGoogleStatusRequest());
    return () => { dispatch(clearMeetingDetail()); };
  }, [meetingId, dispatch]);

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      const data: Record<string, unknown> = {};
      if (values.title) data.title = values.title;
      if (values.meetingType) data.meetingType = values.meetingType;
      if (values.status) data.status = values.status;
      if (values.summary !== undefined) data.summary = values.summary;
      if (values.meetingDate) data.meetingDate = values.meetingDate.toISOString();
      if (values.durationMinutes) data.durationMinutes = values.durationMinutes;
      if (values.attendees !== undefined) {
        data.attendees = values.attendees || [];
      }
      if (values.location !== undefined) data.location = values.location;
      dispatch(updateMeetingRequest({ id: meetingId, data }));
      setEditDrawerOpen(false);
    } catch {}
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete meeting", content: `Delete "${meeting?.title}"?`,
      okText: "Delete", okButtonProps: { danger: true },
      onOk: () => { dispatch(deleteMeetingRequest(meetingId)); router.push(APP_ROUTES.meetings); },
    });
  };

  const handleStatusChange = (status: string) => {
    dispatch(updateMeetingRequest({ id: meetingId, data: { status } }));
  };

  const handleAddDecision = () => {
    if (!decisionText.trim()) return;
    dispatch(addDecisionRequest({ meetingId, decision: decisionText.trim() }));
    setDecisionText("");
  };

  const handleAddActionItem = () => {
    if (!actionTitle.trim()) return;
    dispatch(addActionItemRequest({ meetingId, title: actionTitle.trim() }));
    setActionTitle("");
  };

  const handleToggleActionItem = (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    dispatch(updateActionItemRequest({ meetingId, itemId, data: { status: newStatus } }));
  };

  const handleDeleteActionItem = (itemId: string) => {
    dispatch(deleteActionItemRequest({ meetingId, itemId }));
  };

  if (loading || !meeting) {
    return <div className="flex justify-center items-center py-32"><Spin size="large" /></div>;
  }

  const tabItems = [
    {
      key: "overview",
      label: "Overview",
      children: (
        <div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-zinc-400" />
              <div>
                <Typography.Text className="text-sm text-zinc-500">Date & Time</Typography.Text>
                <Typography.Text className="block font-medium">
                  {new Date(meeting.meetingDate).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </Typography.Text>
              </div>
            </div>
            {meeting.durationMinutes && (
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-zinc-400" />
                <div>
                  <Typography.Text className="text-sm text-zinc-500">Duration</Typography.Text>
                  <Typography.Text className="block font-medium">{meeting.durationMinutes} minutes</Typography.Text>
                </div>
              </div>
            )}
            {meeting.attendees && meeting.attendees.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-zinc-400" />
                <div>
                  <Typography.Text className="text-sm text-zinc-500">Attendees</Typography.Text>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {meeting.attendees.map((email, i) => (
                      <Tag key={i} className="!rounded-full">{email}</Tag>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {meeting.location && (
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-zinc-400" />
                <div>
                  <Typography.Text className="text-sm text-zinc-500">Location</Typography.Text>
                  <Typography.Text className="block font-medium">{meeting.location}</Typography.Text>
                </div>
              </div>
            )}
          </div>

          {meeting.summary && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6">
              <Typography.Text className="text-sm font-semibold text-zinc-700 block mb-2">Summary</Typography.Text>
              <Typography.Text className="text-zinc-600">{meeting.summary}</Typography.Text>
            </div>
          )}

          {meeting.meetLink && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-zinc-800" />
                  <Typography.Text strong className="text-zinc-900">Google Meet Link</Typography.Text>
                </div>
                <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer">
                  <Button type="primary" icon={<ExternalLink className="w-4 h-4" />} className="!bg-black">Join Meeting</Button>
                </a>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <Typography.Text className="text-sm font-semibold text-zinc-700 block mb-4">Status</Typography.Text>
            <Select value={meeting.status} onChange={handleStatusChange} style={{ width: 200 }}
              options={[
                { value: "scheduled", label: "Scheduled" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" },
              ]} />
            <Divider />
            <Typography.Text className="text-xs text-zinc-400">
              Created {new Date(meeting.createdAt).toLocaleDateString()} &middot;
              Updated {new Date(meeting.updatedAt).toLocaleDateString()}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      key: "decisions",
      label: `Decisions (${detail?.decisions.length || 0})`,
      children: (
        <div>
          <div className="mb-4">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <RichTextEditor
                  content={decisionText}
                  onChange={setDecisionText}
                  placeholder="Enter a decision..."
                  minHeight={120}
                />
              </div>
              <Button type="primary" onClick={handleAddDecision} disabled={!decisionText.trim() || decisionText === "<p></p>"} className="!mt-1">Add</Button>
            </div>
          </div>
          <List
            dataSource={detail?.decisions || []}
            renderItem={(item) => (
              <List.Item>
                <div className="flex items-start gap-3 w-full">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="prose prose-zinc prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.decision }} />
                    <Typography.Text className="text-xs text-zinc-400 block mt-1">
                      {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Typography.Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      ),
    },
    {
      key: "actionItems",
      label: `Action Items (${detail?.actionItems.length || 0})`,
      children: (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AntInput value={actionTitle} onChange={(e) => setActionTitle(e.target.value)}
              placeholder="Enter an action item..." className="flex-1" />
            <Button type="primary" onClick={handleAddActionItem} disabled={!actionTitle.trim()}>Add</Button>
          </div>
          <List
            dataSource={detail?.actionItems || []}
            renderItem={(item) => (
              <List.Item actions={[
                <Button key="delete" size="small" danger icon={<Trash2 className="w-3 h-3" />} onClick={() => handleDeleteActionItem(item.id)} />
              ]}>
                <div className="flex items-start gap-3 w-full">
                  <Checkbox checked={item.status === "completed"} onChange={() => handleToggleActionItem(item.id, item.status)} />
                  <div className="flex-1">
                    <Typography.Text delete={item.status === "completed"} className={item.status === "completed" ? "text-zinc-400" : ""}>
                      {item.title}
                    </Typography.Text>
                    <div className="flex gap-3 mt-1">
                      {item.owner && <Typography.Text className="text-xs text-zinc-400">Owner: {item.owner}</Typography.Text>}
                      {item.dueDate && <Typography.Text className="text-xs text-zinc-400">Due: {new Date(item.dueDate).toLocaleDateString()}</Typography.Text>}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      ),
    },
    {
      key: "activity",
      label: "Activity",
      children: (
        <List
          dataSource={detail?.activities || []}
          renderItem={(item) => (
            <List.Item>
              <div className="w-full">
                <Typography.Text className="text-sm font-medium text-zinc-700">{item.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</Typography.Text>
                <Typography.Text className="text-xs text-zinc-500 block">{item.description}</Typography.Text>
                <Typography.Text className="text-xs text-zinc-400 block mt-1">
                  {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Button type="text" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push(APP_ROUTES.meetings)} className="!text-zinc-500 hover:!text-zinc-900 !-ml-2 mb-2">Back to Meetings</Button>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
              <Calendar className="w-7 h-7 text-zinc-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Typography.Title level={3} className="!mb-0 !text-2xl !leading-tight">{meeting.title}</Typography.Title>
                <Tag color={statusColors[meeting.status] || "default"} className="!rounded-full !px-3 !py-0.5 !text-xs">{meeting.status}</Tag>
                <Tag className="!rounded-full !px-2 !py-0 !text-xs">{typeLabels[meeting.meetingType] || meeting.meetingType}</Tag>
                {meeting.meetLink && <Tag color="purple" className="!rounded-full !px-2 !py-0 !text-xs"><Video className="w-3 h-3 inline mr-1" />Meet</Tag>}
              </div>
              <Typography.Text className="text-zinc-500 text-sm block mt-1">
                {new Date(meeting.meetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Typography.Text>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {meeting.meetLink && (
              <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer">
                <Button icon={<Video className="w-4 h-4" />} className="!text-zinc-800 !border-zinc-300">Join Meet</Button>
              </a>
            )}
            <Button icon={<Edit3 className="w-4 h-4" />} onClick={() => {
              editForm.setFieldsValue({ ...meeting, meetingDate: dayjs(meeting.meetingDate) });
              setEditDrawerOpen(true);
            }}>Edit</Button>
            <Button danger icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </div>

      <Tabs items={tabItems} />

      <Drawer
        title="Edit Meeting"
        width={520}
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        footer={
          <Space className="w-full justify-end">
            <Button onClick={() => setEditDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={handleUpdate}>Save Changes</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}><AntInput /></Form.Item>
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
          <Form.Item name="status" label="Status">
            <Select options={[
              { value: "scheduled", label: "Scheduled" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]} />
          </Form.Item>
          <Form.Item name="meetingDate" label="Date & Time"><DatePicker showTime className="w-full" /></Form.Item>
          <Form.Item name="durationMinutes" label="Duration (minutes)"><AntInput type="number" min={15} /></Form.Item>
          <Form.Item name="summary" label="Summary"><AntInput.TextArea rows={3} /></Form.Item>
          <Form.Item name="attendees" label="Attendees">
            <Select mode="tags" placeholder="Type email and press Enter" tokenSeparators={[",", ";", " "]} open={false} />
          </Form.Item>
          <Form.Item name="location" label="Location"><AntInput /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
