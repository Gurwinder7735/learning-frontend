"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Input, Select, Space, Tag, Card, Row, Col, Statistic, Empty, Typography, Drawer, Form, Input as AntInput, Modal, Table, App } from "antd";
import { Plus, Search, Target, TrendingUp, PhoneCall, CalendarCheck, FileCheck, CheckCircle2, XCircle, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { COUNTRY_OPTIONS, getFilteredTimezones } from "@/lib/constants/clientOptions";
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
  const [selectedCountry, setSelectedCountry] = useState<string>();
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
      dispatch(createLeadRequest(values));
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
        <a onClick={() => router.push(`${APP_ROUTES.leads}/${record.id}`)} className="text-zinc-900 font-medium hover:text-blue-600 cursor-pointer">
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
          {status.replace("_", " ")}
        </Tag>
      ),
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 120,
      render: (source: string) => (
        <span className="text-sm text-zinc-500">{sourceOptions.find((o) => o.value === source)?.label || source}</span>
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
          placeholder="Status"
          allowClear
          style={{ width: 160 }}
          onChange={(val) => setStatusFilter(val)}
          options={[
            { value: "new", label: "New" },
            { value: "contacted", label: "Contacted" },
            { value: "meeting_scheduled", label: "Meeting Scheduled" },
            { value: "proposal_sent", label: "Proposal Sent" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
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
              onClick: () => router.push(`${APP_ROUTES.leads}/${record.id}`),
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
          <Form.Item name="companyName" label="Company Name" rules={[{ required: true, message: "Required" }]}>
            <AntInput placeholder="e.g. Acme Corp" />
          </Form.Item>
          <Form.Item name="contactPerson" label="Contact Person" rules={[{ required: true, message: "Required" }]}>
            <AntInput placeholder="e.g. Jane Doe" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <AntInput placeholder="jane@acme.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <AntInput placeholder="+1 555-0123" />
          </Form.Item>
          <Form.Item name="linkedinProfile" label="LinkedIn Profile">
            <AntInput placeholder="https://linkedin.com/in/..." />
          </Form.Item>
          <Form.Item name="source" label="Source">
            <Select showSearch placeholder="Select source" options={sourceOptions} allowClear />
          </Form.Item>
          <Form.Item name="country" label="Country">
            <Select showSearch placeholder="Select country" options={COUNTRY_OPTIONS} allowClear onChange={(val) => { setSelectedCountry(val); form.setFieldValue("timezone", undefined); }} />
          </Form.Item>
          <Form.Item name="timezone" label="Timezone">
            <Select showSearch placeholder={selectedCountry ? "Select timezone for " + selectedCountry : "Select a country first"} options={getFilteredTimezones(selectedCountry)} allowClear disabled={!selectedCountry} />
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
    </div>
  );
}
