"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Space, Tag, Card, Row, Col, Statistic, Typography, Drawer, Form, DatePicker, Switch, message } from "antd";
import { Calendar, Plus, Loader2, Video, Clock, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  fetchMeetingsRequest, fetchMeetingStatsRequest, createMeetingRequest, deleteMeetingRequest,
  fetchGoogleStatusRequest,
} from "@/store/modules/meetings/meetingsSlice";
import {
  selectMeetings, selectMeetingsLoading, selectMeetingStats, selectGoogleConnected,
} from "@/store/modules/meetings/meetingsSelectors";
import { APP_ROUTES } from "@/lib/constants/appConstants";

const statusColors: Record<string, string> = {
  scheduled: "blue",
  completed: "green",
  cancelled: "red",
};

const typeLabels: Record<string, string> = {
  client_meeting: "Client Meeting",
  internal: "Internal",
  discovery: "Discovery",
  review: "Review",
  kickoff: "Kickoff",
  other: "Other",
};

export default function MeetingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const meetings = useAppSelector(selectMeetings);
  const loading = useAppSelector(selectMeetingsLoading);
  const stats = useAppSelector(selectMeetingStats);
  const googleConnected = useAppSelector(selectGoogleConnected);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchMeetingsRequest({ search, status: statusFilter }));
    dispatch(fetchMeetingStatsRequest());
    dispatch(fetchGoogleStatusRequest());
  }, [dispatch, search, statusFilter]);

  useEffect(() => {
    if (searchParams.get("google") === "connected") {
      message.success("Google Calendar connected successfully!");
      dispatch(fetchGoogleStatusRequest());
      router.replace(APP_ROUTES.meetings);
    }
  }, [searchParams, dispatch, router]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const meetingDate = values.meetingDate.toISOString();
      dispatch(createMeetingRequest({
        title: values.title,
        meetingType: values.meetingType || "other",
        meetingDate,
        durationMinutes: values.durationMinutes || 60,
        summary: values.summary || null,
        attendees: values.attendees || [],
        location: values.location || null,
        generateMeetLink: values.generateMeetLink || false,
      }));
      setDrawerOpen(false);
      form.resetFields();
      message.success("Meeting created successfully");
    } catch {
      // validation failed
    }
  };

  return (
    <div>
      <PageHeader
        title="Meetings"
        actions={
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setDrawerOpen(true)}>
            New Meeting
          </Button>
        }
      />

      {stats && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card><Statistic title="Total Meetings" value={stats.totalMeetings} prefix={<Calendar className="w-4 h-4" />} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="This Month" value={stats.thisMonth} prefix={<Calendar className="w-4 h-4" />} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="Pending Action Items" value={stats.pendingActionItems} prefix={<Clock className="w-4 h-4" />} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="Types" value={Object.keys(stats.byType).length} prefix={<Users className="w-4 h-4" />} /></Card>
          </Col>
        </Row>
      )}

      <Space className="mb-4">
        <Input.Search placeholder="Search meetings..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 300 }} allowClear />
        <Select
          placeholder="Filter by status" allowClear style={{ width: 160 }}
          value={statusFilter} onChange={setStatusFilter}
          options={[
            { value: "scheduled", label: "Scheduled" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </Space>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">No meetings found</div>
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="group flex items-start gap-4 p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer bg-white"
              onClick={() => router.push(`${APP_ROUTES.meetings}/${meeting.id}`)}
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-5 h-5 text-zinc-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Typography.Text strong className="!text-sm block truncate">{meeting.title}</Typography.Text>
                  <Tag color={statusColors[meeting.status] || "default"} className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none shrink-0">{meeting.status}</Tag>
                  <Tag className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none !bg-zinc-50 !text-zinc-500 !border-zinc-200 shrink-0">
                    {typeLabels[meeting.meetingType] || meeting.meetingType}
                  </Tag>
                  {meeting.meetLink && (
                    <Tag className="!rounded-full !text-[10px] !px-1.5 !py-0 !leading-none !border-purple-200 !text-purple-600 !bg-purple-50 shrink-0">
                      <Video className="w-2.5 h-2.5 inline mr-0.5" />Meet
                    </Tag>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(meeting.meetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {meeting.durationMinutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {meeting.durationMinutes} min
                    </span>
                  )}
                  {meeting.summary && (
                    <span className="truncate max-w-[200px]">{meeting.summary}</span>
                  )}
                </div>
                {meeting.attendees && meeting.attendees.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Users className="w-3 h-3 text-zinc-300" />
                    {meeting.attendees.slice(0, 3).map((email, i) => (
                      <Tag key={i} className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none !bg-zinc-50 !text-zinc-500 !border-zinc-200">
                        {email}
                      </Tag>
                    ))}
                    {meeting.attendees.length > 3 && (
                      <Typography.Text className="text-[10px] text-zinc-400">+{meeting.attendees.length - 3}</Typography.Text>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                {meeting.meetLink && (
                  <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Button size="small" icon={<Video className="w-3 h-3" />} className="!text-zinc-800 !border-zinc-300 !text-xs">
                      Join
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Drawer title="New Meeting" width={520} open={drawerOpen} onClose={() => setDrawerOpen(false)}
        footer={<Space className="w-full justify-end"><Button onClick={() => setDrawerOpen(false)}>Cancel</Button><Button type="primary" onClick={handleCreate}>Create Meeting</Button></Space>}
        destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}>
            <Input placeholder="Meeting title" />
          </Form.Item>
          <Form.Item name="meetingType" label="Type" initialValue="other">
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
          <Form.Item name="durationMinutes" label="Duration (minutes)" initialValue={60}>
            <Input type="number" min={15} max={480} />
          </Form.Item>
          <Form.Item name="summary" label="Summary">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="attendees" label="Attendees">
            <Select mode="tags" placeholder="Type email and press Enter" tokenSeparators={[",", ";", " "]} open={false} />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input placeholder="Room or virtual link" />
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
