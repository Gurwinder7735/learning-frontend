"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Space, Tag, Card, Row, Col, Statistic, Typography, message } from "antd";
import { MeetingFormDrawer, type MeetingFormValues } from "@/components/features/Meetings/MeetingFormDrawer";
import { Calendar, Plus, Loader2, Video, Clock, Users, Building2 } from "lucide-react";
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
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import { selectClients, selectClientsMeta } from "@/store/modules/clients/clientsSelectors";
import { fetchLeadsRequest } from "@/store/modules/leads/leadsSlice";
import { selectLeads, selectLeadsMeta } from "@/store/modules/leads/leadsSelectors";
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

  const clients = useAppSelector(selectClients);
  const clientsMeta = useAppSelector(selectClientsMeta);
  const leads = useAppSelector(selectLeads);
  const leadsMeta = useAppSelector(selectLeadsMeta);

  // Unified accounts list for the meeting form's account picker.
  const allAccounts = [
    ...leads
      .filter((l) => l.lifecycleStage !== "client")
      .map((l) => ({ id: l.id, companyName: `${l.companyName} (Lead)`, originStage: "lead" as const })),
    ...clients.map((c) => ({ id: c.id, companyName: c.companyName, originStage: "client" as const })),
  ];
  const accountsLoading = clientsMeta.isLoading || leadsMeta.isLoading;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchMeetingsRequest({ search, status: statusFilter }));
    dispatch(fetchMeetingStatsRequest());
    dispatch(fetchClientsRequest({ limit: 200 }));
    dispatch(fetchLeadsRequest({ limit: 200 }));
    dispatch(fetchGoogleStatusRequest());
  }, [dispatch, search, statusFilter]);

  useEffect(() => {
    if (searchParams.get("google") === "connected") {
      message.success("Google Calendar connected successfully!");
      dispatch(fetchGoogleStatusRequest());
      router.replace(APP_ROUTES.meetings);
    }
  }, [searchParams, dispatch, router]);

  const handleCreate = (values: MeetingFormValues) => {
    const selectedAccount = allAccounts.find((a) => a.id === values.clientId);
    dispatch(createMeetingRequest({
      title: values.title,
      meetingType: values.meetingType || "other",
      meetingDate: values.meetingDate.toISOString(),
      durationMinutes: values.durationMinutes || 60,
      summary: values.summary || null,
      attendees: values.attendees || [],
      location: values.location || null,
      generateMeetLink: values.generateMeetLink || false,
      clientId: values.clientId || null,
      clientName: selectedAccount?.companyName?.replace(" (Lead)", "") || null,
    }));
    setDrawerOpen(false);
    message.success("Meeting created successfully");
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
                <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2 flex-wrap">
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
                  {(meeting.clientName || meeting.clientId) && (
                    <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                      <Building2 className="w-3 h-3" />
                      {meeting.clientName || "Linked Account"}
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

      <MeetingFormDrawer
        open={drawerOpen}
        mode="create"
        accounts={allAccounts}
        accountsLoading={accountsLoading}
        googleConnected={googleConnected}
        submitting={submitting}
        onSubmit={handleCreate}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
