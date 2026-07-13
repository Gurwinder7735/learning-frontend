"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  MapPin,
  PauseCircle,
  Plus,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountFormFields } from "@/components/features/AccountPanels/AccountFormFields";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useDebounce } from "@/hooks/useDebounce";
import type { Client } from "@/types/models/Client";
import {
  fetchClientsRequest,
  createClientRequest,
  deleteClientRequest,
  fetchStatsRequest,
} from "@/store/modules/clients/clientsSlice";
import {
  selectClients,
  selectClientsMeta,
  selectClientsStats,
} from "@/store/modules/clients/clientsSelectors";
import { APP_ROUTES } from "@/lib/constants/appConstants";

const STATUS_COLOR: Record<string, string> = {
  active: "green",
  on_hold: "orange",
  completed: "blue",
  inactive: "red",
};

const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral",
  linkedin: "LinkedIn",
  upwork: "Upwork",
  website: "Website",
  existing_client: "Existing Client",
  partner: "Partner",
  cold_outreach: "Cold Outreach",
  other: "Other",
};

export default function ClientsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const clients = useAppSelector(selectClients);
  const meta = useAppSelector(selectClientsMeta);
  const stats = useAppSelector(selectClientsStats);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    dispatch(fetchClientsRequest({ search: debouncedSearch, status: statusFilter, limit: 50 }));
  }, [debouncedSearch, statusFilter, dispatch]);

  useEffect(() => {
    dispatch(fetchStatsRequest());
  }, [dispatch]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      dispatch(createClientRequest(values));
      setDrawerOpen(false);
      form.resetFields();
    } catch {
      // validation error — antd shows inline messages
    }
  };

  const handleDelete = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: "Delete client",
      content: `Delete "${client.companyName}"? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => dispatch(deleteClientRequest(client.id)),
    });
  };

  const columns = [
    {
      title: "Company",
      dataIndex: "companyName",
      key: "companyName",
      render: (name: string, record: Client) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-900 truncate">{name}</div>
            {record.email && (
              <div className="text-xs text-zinc-400 truncate">{record.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => (
        <Tag
          color={STATUS_COLOR[status] || "default"}
          className="!rounded-full !px-3 !py-0.5 !text-xs"
        >
          {status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
        </Tag>
      ),
    },
    {
      title: "Industry",
      dataIndex: "industry",
      key: "industry",
      width: 140,
      render: (industry: string) =>
        industry ? (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{industry}</span>
          </div>
        ) : (
          <span className="text-zinc-300">—</span>
        ),
    },
    {
      title: "Country",
      dataIndex: "country",
      key: "country",
      width: 130,
      render: (country: string) =>
        country ? (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{country}</span>
          </div>
        ) : (
          <span className="text-zinc-300">—</span>
        ),
    },
    {
      title: "Source",
      dataIndex: "sourceType",
      key: "sourceType",
      width: 130,
      render: (src: string) => (
        <span className="text-sm text-zinc-500">
          {SOURCE_LABELS[src] || src || "—"}
        </span>
      ),
    },
    {
      title: "Contacts",
      dataIndex: "contactCount",
      key: "contactCount",
      width: 90,
      render: (n: number) => (
        <div className="flex items-center gap-1.5 text-sm text-zinc-500">
          <Users className="w-3.5 h-3.5" />
          <span>{n}</span>
        </div>
      ),
    },
    {
      title: "Since",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 110,
      render: (date: string) => (
        <span className="text-sm text-zinc-400">
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_: unknown, record: Client) => (
        <Tooltip title="Delete">
          <Button
            type="text"
            size="small"
            danger
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={(e) => handleDelete(record, e)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Manage your clients, contacts, and ongoing relationships."
      />

      {stats && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="Total"
                value={stats.totalClients}
                prefix={<Building2 className="w-4 h-4 text-zinc-400 mr-1" />}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="Active"
                value={stats.activeClients}
                prefix={<CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />}
                valueStyle={{ fontSize: 20, color: "#16a34a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="New This Month"
                value={stats.newThisMonth}
                prefix={<TrendingUp className="w-4 h-4 text-blue-500 mr-1" />}
                valueStyle={{ fontSize: 20, color: "#3b82f6" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="On Hold"
                value={
                  clients.filter((c) => c.status === "on_hold").length
                }
                prefix={<PauseCircle className="w-4 h-4 text-orange-500 mr-1" />}
                valueStyle={{ fontSize: 20, color: "#ea580c" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <Input.Search
          placeholder="Search clients..."
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          placeholder="Filter by Status"
          allowClear
          style={{ width: 170 }}
          onChange={(val) => setStatusFilter(val)}
          options={[
            { value: "active", label: "Active" },
            { value: "on_hold", label: "On Hold" },
            { value: "completed", label: "Completed" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setDrawerOpen(true)}
        >
          Add Client
        </Button>
      </div>

      {meta.isLoading && clients.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-zinc-400" />
          </div>
          <Typography.Text className="text-base font-medium text-zinc-600 mb-1 block">
            No clients yet
          </Typography.Text>
          <Typography.Text className="text-sm text-zinc-400 mb-5 block">
            Add your first client to get started.
          </Typography.Text>
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setDrawerOpen(true)}
          >
            Add Client
          </Button>
        </div>
      ) : (
        <Card
          className="!rounded-xl !border-zinc-200 !shadow-sm !overflow-hidden"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={clients}
            columns={columns}
            rowKey="id"
            loading={meta.isLoading}
            pagination={false}
            className="[&_.ant-table-row]:!cursor-pointer"
            onRow={(record) => ({
              onClick: () => router.push(`${APP_ROUTES.clients}/${record.id}`),
            })}
          />
        </Card>
      )}

      <Drawer
        title="Add Client"
        width={560}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          form.resetFields();
        }}
        footer={
          <Space className="w-full justify-end">
            <Button
              onClick={() => {
                setDrawerOpen(false);
                form.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" onClick={handleCreate}>
              Create Client
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ sourceType: "other" }}>
          <AccountFormFields form={form} />
        </Form>
      </Drawer>
    </div>
  );
}
