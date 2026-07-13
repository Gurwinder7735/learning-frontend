"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Input, Select, Space, Tag, Card, Row, Col, Statistic, Empty, Typography, Drawer, Form, Modal, Table, App } from "antd";
import { Plus, Search, Target, TrendingUp, PhoneCall, CalendarCheck, FileCheck, CheckCircle2, XCircle, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountFormFields } from "@/components/features/AccountPanels/AccountFormFields";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import type { Lead } from "@/types/models/Lead";
import { fetchLeadsRequest, createLeadRequest, deleteLeadRequest, fetchStatsRequest, clearLeadDetail } from "@/store/modules/leads/leadsSlice";
import { selectLeads, selectLeadsMeta, selectLeadsStats } from "@/store/modules/leads/leadsSelectors";
import { fetchUsersRequest } from "@/store/modules/user/userSlice";
import { selectUsers } from "@/store/modules/user/userSelectors";
import { APP_ROUTES } from "@/lib/constants/appConstants";

const sourceLabels: Record<string, string> = {
  referral: "Referral",
  linkedin: "LinkedIn",
  upwork: "Upwork",
  website: "Website",
  existing_client: "Existing Client",
  partner: "Partner",
  cold_outreach: "Cold Outreach",
  other: "Other",
};

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
  // Post-conversion terminal state — same visual weight as ``won``
  // because it's the successful outcome, just a clearer label.
  converted_to_client: "green",
  lost: "red",
};

export default function LeadsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAdmin, user } = useAuth();
  const leads = useAppSelector(selectLeads);
  const meta = useAppSelector(selectLeadsMeta);
  const stats = useAppSelector(selectLeadsStats);
  const allUsers = useAppSelector(selectUsers);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const debouncedSearch = useDebounce(search);

  const usersMap = useMemo(() => {
    const map: Record<string, string> = {};
    allUsers.forEach((u) => { map[u.id] = u.name || u.email; });
    return map;
  }, [allUsers]);

  useEffect(() => {
    dispatch(fetchLeadsRequest({ search: debouncedSearch, status: statusFilter, limit: 50 }));
  }, [debouncedSearch, statusFilter, dispatch]);

  useEffect(() => {
    dispatch(fetchStatsRequest());
  }, [dispatch]);

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchUsersRequest({ pageSize: 100 }));
    }
  }, [isAdmin, dispatch]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      // The unified form uses ``sourceType`` (matching the backend
      // ``ClientModel.source_type``). The Leads endpoint also accepts
      // a legacy ``source`` alias — we still send ``source`` here for
      // any downstream code that reads that key, without depending on
      // the alias to be honoured.
      const payload = { ...values, source: values.sourceType };
      dispatch(createLeadRequest(payload));
      setDrawerOpen(false);
      form.resetFields();
    } catch {
      // validation failed
    }
  };

  const handleDelete = (lead: Lead) => {
    Modal.confirm({
      title: "Delete lead",
      content: `Are you sure you want to delete ${lead.companyName}? This action cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => dispatch(deleteLeadRequest(lead.id)),
    });
  };

  const columns = [
    {
      title: "Company",
      dataIndex: "companyName",
      key: "companyName",
      render: (name: string, record: Lead) => (
        // Converted records live on the client detail page — same
        // ObjectId, different canonical home. The Leads list still
        // shows them (with the "converted_to_client" status pill) but
        // the click routes to /clients/{id}.
        <a
          onClick={() =>
            router.push(
              record.lifecycleStage === "client"
                ? `${APP_ROUTES.clients}/${record.id}`
                : `${APP_ROUTES.leads}/${record.id}`,
            )
          }
          className="text-zinc-900 font-medium hover:text-blue-600 cursor-pointer"
        >
          {name}
        </a>
      ),
    },
    {
      title: "Contact",
      dataIndex: "contactPerson",
      key: "contactPerson",
      render: (person: string, record: Lead) => (
        <div>
          <div className="text-sm text-zinc-900">{person}</div>
          {record.email && <div className="text-xs text-zinc-400">{record.email}</div>}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status: string) => (
        <Tag color={statusColors[status] || "default"} className="!rounded-full !px-3 !py-0.5 !text-xs">
          {status.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
        </Tag>
      ),
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 120,
      render: (source: string) => (
        <span className="text-sm text-zinc-500">{sourceLabels[source] || source}</span>
      ),
    },
    {
      title: "Country",
      dataIndex: "country",
      key: "country",
      width: 120,
      render: (country: string) => country && <span className="text-sm text-zinc-500">{country}</span>,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date: string) => <span className="text-sm text-zinc-500">{new Date(date).toLocaleDateString()}</span>,
    },
    ...(isAdmin ? [{
      title: "Assigned To",
      dataIndex: "assignedTo",
      key: "assignedTo",
      width: 150,
      render: (assignedTo: string | null) => assignedTo ? (
        <span className="text-sm text-zinc-500 inline-flex items-center gap-1">
          <User className="w-3 h-3" /> {usersMap[assignedTo] || "Unknown"}
        </span>
      ) : (
        <span className="text-sm text-zinc-400">—</span>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader title="Lead Management" subtitle="Track and manage your sales pipeline from prospect to client." />

      {stats && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} sm={4}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic title="Total" value={stats.total} prefix={<Target className="w-4 h-4 text-zinc-400 mr-1" />} valueStyle={{ fontSize: 20 }} />
            </Card>
          </Col>
          <Col xs={12} sm={4}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic title="New" value={stats.newCount} prefix={<TrendingUp className="w-4 h-4 text-blue-500 mr-1" />} valueStyle={{ fontSize: 20, color: "#3b82f6" }} />
            </Card>
          </Col>
          <Col xs={12} sm={4}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic title="Contacted" value={stats.contactedCount} prefix={<PhoneCall className="w-4 h-4 text-zinc-700 mr-1" />} valueStyle={{ fontSize: 20 }} />
            </Card>
          </Col>
          <Col xs={12} sm={4}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic title="Meeting" value={stats.meetingScheduledCount} prefix={<CalendarCheck className="w-4 h-4 text-orange-500 mr-1" />} valueStyle={{ fontSize: 20 }} />
            </Card>
          </Col>
          <Col xs={12} sm={4}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic title="Won" value={stats.wonCount} prefix={<CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />} valueStyle={{ fontSize: 20, color: "#16a34a" }} />
            </Card>
          </Col>
          <Col xs={12} sm={4}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic title="Lost" value={stats.lostCount} prefix={<XCircle className="w-4 h-4 text-red-500 mr-1" />} valueStyle={{ fontSize: 20, color: "#dc2626" }} />
            </Card>
          </Col>
        </Row>
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <Input.Search
          placeholder="Search leads..."
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          placeholder="Filter by Status"
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
          }
          style={{ width: 220 }}
          onChange={(val) => setStatusFilter(val)}
          options={[
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
            // Legacy value kept for filtering older data; new records
            // land on ``converted_to_client``.
            { value: "won", label: "Won (legacy)" },
            { value: "converted_to_client", label: "Converted to Client" },
          ]}
        />
        <div className="flex-1" />
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setDrawerOpen(true)}>
          Add Lead
        </Button>
      </div>

      {meta.isLoading && leads.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Target className="w-16 h-16 mb-4 text-zinc-300" />
          <Typography.Text className="text-lg font-medium text-zinc-500">No leads yet</Typography.Text>
          <Typography.Text className="text-sm text-zinc-400 mb-4">Add your first lead to start tracking your pipeline.</Typography.Text>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setDrawerOpen(true)}>
            Add Lead
          </Button>
        </div>
      ) : (
        <Card className="!rounded-xl !border-zinc-200 !shadow-sm !overflow-hidden" bodyStyle={{ padding: 0 }}>
          <Table
            dataSource={leads}
            columns={columns}
            rowKey="id"
            loading={meta.isLoading}
            pagination={false}
            className="[&_.ant-table-row]:!cursor-pointer"
            onRow={(record) => ({
              onClick: () =>
                router.push(
                  record.lifecycleStage === "client"
                    ? `${APP_ROUTES.clients}/${record.id}`
                    : `${APP_ROUTES.leads}/${record.id}`,
                ),
            })}
          />
        </Card>
      )}

      <Drawer
        title="Add Lead"
        width={560}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields(); }}
        footer={
          <Space className="w-full justify-end">
            <Button onClick={() => { setDrawerOpen(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" onClick={handleCreate}>Create Lead</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <AccountFormFields
            form={form}
            userOptions={
              isAdmin
                ? allUsers.map((u) => ({ value: u.id, label: u.name || u.email }))
                : undefined
            }
          />
        </Form>
      </Drawer>
    </div>
  );
}
