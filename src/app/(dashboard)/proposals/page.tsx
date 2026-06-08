"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Select,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Drawer,
  Dropdown,
  Modal,
  Slider,
} from "antd";
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Sparkles,
  Trash2,
  MoreHorizontal,
  Loader2,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { storage } from "@/lib/utils/storage";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useDebounce } from "@/hooks/useDebounce";
import {
  fetchProposalsRequest,
  fetchStatsRequest,
  deleteProposalRequest,
} from "@/store/modules/proposals/proposalsSlice";
import {
  selectProposals,
  selectProposalsMeta,
  selectProposalsStats,
} from "@/store/modules/proposals/proposalsSelectors";
import { selectClients, selectClientsMeta } from "@/store/modules/clients/clientsSelectors";
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import { APP_ROUTES } from "@/lib/constants/appConstants";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const statusColors: Record<string, string> = {
  draft: "default",
  internal_review: "blue",
  sent: "purple",
  client_review: "orange",
  approved: "green",
  rejected: "red",
  archived: "default",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  internal_review: "Internal Review",
  sent: "Sent",
  client_review: "Client Review",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

export default function ProposalsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const proposals = useAppSelector(selectProposals);
  const meta = useAppSelector(selectProposalsMeta);
  const stats = useAppSelector(selectProposalsStats);
  const clients = useAppSelector(selectClients);
  const clientsMeta = useAppSelector(selectClientsMeta);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [clientFilter, setClientFilter] = useState<string | undefined>();
  const debouncedSearch = useDebounce(search);

  const [genOpen, setGenOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genName, setGenName] = useState("");
  const [genClientId, setGenClientId] = useState<string | undefined>();
  const [genProjectName, setGenProjectName] = useState("");
  const [genBudget, setGenBudget] = useState<number | undefined>();
  const [genInputText, setGenInputText] = useState("");

  // Generation settings overrides
  const [genHourlyRate, setGenHourlyRate] = useState<number | undefined>();
  const [genAiFactor, setGenAiFactor] = useState<number | undefined>();
  const [genTeamSize, setGenTeamSize] = useState<number | undefined>();
  const [showSettingsOverride, setShowSettingsOverride] = useState(false);

  // Load global defaults
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const token = storage.getAccessToken();
        const res = await fetch(`${API_BASE_URL}/api/v1/proposal-intelligence/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          const d = json.data;
          setGenHourlyRate(d.hourlyRate);
          setGenAiFactor(d.aiEfficiencyFactor);
          setGenTeamSize(d.teamSize);
        }
      } catch {
        /* silent */
      }
    };
    loadDefaults();
  }, [genOpen]);

  useEffect(() => {
    dispatch(
      fetchProposalsRequest({
        search: debouncedSearch,
        status: statusFilter,
        clientId: clientFilter,
        limit: 50,
      })
    );
  }, [debouncedSearch, statusFilter, clientFilter, dispatch]);

  useEffect(() => {
    dispatch(fetchStatsRequest());
    dispatch(fetchClientsRequest({ limit: 200 }));
  }, [dispatch]);

  const handleGenerate = async () => {
    if (!genInputText.trim() || genLoading) return;
    setGenLoading(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/proposal-intelligence/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          inputText: genInputText.trim(),
          name: genName.trim() || undefined,
          clientId: genClientId || undefined,
          projectName: genProjectName.trim() || undefined,
          pricingCost: genBudget || undefined,
          hourlyRate: showSettingsOverride ? genHourlyRate : undefined,
          aiEfficiencyFactor: showSettingsOverride ? genAiFactor : undefined,
          teamSize: showSettingsOverride ? genTeamSize : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const proposalId = json.data?.proposalId;
      setGenOpen(false);
      if (proposalId) {
        router.push(`/proposals/${proposalId}`);
      }
    } catch {
      Modal.error({ title: "Generation failed", content: "Could not start proposal generation." });
    } finally {
      setGenLoading(false);
    }
  };

  const handleDeleteProposal = (id: string, name: string) => {
    Modal.confirm({
      title: "Delete proposal",
      content: `Delete "${name}"?`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => dispatch(deleteProposalRequest(id)),
    });
  };

  return (
    <div>
      <PageHeader
        title="Proposal Studio"
        subtitle="Create, manage, and share professional project proposals."
      />

      {stats && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="Total Proposals"
                value={stats.totalProposals}
                prefix={<FileText className="w-4 h-4 text-zinc-400 mr-1" />}
                valueStyle={{ fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="Draft"
                value={stats.draftCount}
                prefix={<FileText className="w-4 h-4 text-zinc-400 mr-1" />}
                valueStyle={{ fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="Sent"
                value={stats.sentCount}
                prefix={<Send className="w-4 h-4 text-purple-500 mr-1" />}
                valueStyle={{ fontSize: 24, color: "#7c3aed" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="Approved"
                value={stats.approvedCount}
                prefix={<CheckCircle className="w-4 h-4 text-green-500 mr-1" />}
                valueStyle={{ fontSize: 24, color: "#16a34a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
              <Statistic
                title="Rejected"
                value={stats.rejectedCount}
                prefix={<XCircle className="w-4 h-4 text-red-500 mr-1" />}
                valueStyle={{ fontSize: 24, color: "#dc2626" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <Input.Search
          placeholder="Search proposals..."
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 150 }}
          onChange={(val) => setStatusFilter(val)}
          options={[
            { value: "draft", label: "Draft" },
            { value: "internal_review", label: "Internal Review" },
            { value: "sent", label: "Sent" },
            { value: "client_review", label: "Client Review" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <Select
          placeholder="Client"
          allowClear
          showSearch
          style={{ width: 180 }}
          onChange={(val) => setClientFilter(val)}
          loading={clientsMeta.isLoading}
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          notFoundContent={clientsMeta.isLoading ? "Loading..." : "No clients found"}
          options={clients.map((c) => ({ value: c.id, label: c.companyName }))}
        />
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<Sparkles className="w-4 h-4" />}
          onClick={() => setGenOpen(true)}
          className="!bg-indigo-600"
        >
          Generate Proposal
        </Button>
      </div>

      {meta.isLoading && proposals.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <FileText className="w-16 h-16 mb-4 text-zinc-300" />
          <Typography.Text className="text-lg font-medium text-zinc-500">
            No proposals yet
          </Typography.Text>
          <Typography.Text className="text-sm text-zinc-400 mb-4">
            Generate your first AI proposal to get started.
          </Typography.Text>
          <Button
            type="primary"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setGenOpen(true)}
            className="!bg-indigo-600"
          >
            Generate Proposal
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`${APP_ROUTES.proposals}/${proposal.id}`}
              className="block group"
            >
              <Card
                className="!rounded-xl !border-zinc-200 !shadow-sm hover:!shadow-md hover:!border-zinc-300 transition-all !cursor-pointer"
                size="small"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
                    <FileText className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <Typography.Text className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                        {proposal.name}
                      </Typography.Text>
                      <Tag
                        color={statusColors[proposal.status] || "default"}
                        className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none !h-[18px] !flex !items-center shrink-0"
                      >
                        {statusLabels[proposal.status] || proposal.status}
                      </Tag>
                      {proposal.isAiGenerated && !proposal.pricing && (
                        <Tag
                          color="processing"
                          className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none !h-[18px] !flex !items-center shrink-0"
                        >
                          Generating
                        </Tag>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      {proposal.clientName && <span>{proposal.clientName}</span>}
                      {proposal.projectName && <span>Project: {proposal.projectName}</span>}
                    </div>
                  </div>
                  <Space className="shrink-0">
                    {proposal.pricing && proposal.pricing.cost > 0 && (
                      <Typography.Text className="text-xs font-medium text-zinc-600">
                        {proposal.pricing.currency} {proposal.pricing.cost.toLocaleString()}
                      </Typography.Text>
                    )}
                  </Space>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: "delete",
                          label: "Delete",
                          danger: true,
                          icon: <Trash2 className="w-3.5 h-3.5" />,
                          onClick: () => handleDeleteProposal(proposal.id, proposal.name),
                        },
                      ],
                    }}
                    trigger={["click"]}
                  >
                    <Button
                      type="text"
                      size="small"
                      className="!text-zinc-400 hover:!text-zinc-700 -mr-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      icon={<MoreHorizontal className="w-4 h-4" />}
                    />
                  </Dropdown>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Drawer
        title="Generate AI Proposal"
        width={640}
        open={genOpen}
        onClose={() => {
          if (!genLoading) setGenOpen(false);
        }}
        destroyOnClose
      >
        <div className="space-y-5">
          <Typography.Text className="text-sm font-medium text-zinc-700 block">
            Proposal Details
          </Typography.Text>
          <div>
            <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
              Proposal Name
            </Typography.Text>
            <Input
              value={genName}
              onChange={(e) => setGenName(e.target.value)}
              placeholder="e.g. Salon Platform Proposal"
              disabled={genLoading}
            />
          </div>
          <div>
            <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
              Client
            </Typography.Text>
            <Select
              value={genClientId}
              onChange={setGenClientId}
              placeholder="Select client"
              allowClear
              showSearch
              disabled={genLoading}
              loading={clientsMeta.isLoading}
              style={{ width: "100%" }}
              getPopupContainer={(trigger) => trigger.parentNode}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={
                clientsMeta.error
                  ? "Failed to load clients"
                  : clientsMeta.isLoading
                    ? "Loading..."
                    : "No clients found"
              }
              options={clients.map((c) => ({ value: c.id, label: c.companyName }))}
            />
          </div>
          <div>
            <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
              Project Name
            </Typography.Text>
            <Input
              value={genProjectName}
              onChange={(e) => setGenProjectName(e.target.value)}
              placeholder="e.g. Salon Booking Platform"
              disabled={genLoading}
            />
          </div>

          <div className="border-t border-zinc-100 pt-5">
            <Typography.Text className="text-sm font-medium text-zinc-700 block mb-3">
              Client Requirements
            </Typography.Text>
            <Input.TextArea
              value={genInputText}
              onChange={(e) => setGenInputText(e.target.value)}
              placeholder="Describe the client project requirements..."
              rows={8}
              disabled={genLoading}
              className="!text-sm"
            />
          </div>

          <div>
            <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
              Budget
            </Typography.Text>
            <Input
              type="number"
              value={genBudget}
              onChange={(e) => setGenBudget(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 20000"
              prefix="$"
              disabled={genLoading}
              className="!w-48"
            />
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <Button
              type="text"
              className="!p-0 !text-xs !text-zinc-500 hover:!text-zinc-700"
              icon={
                <Settings
                  className={`w-3.5 h-3.5 transition-transform ${showSettingsOverride ? "rotate-45" : ""}`}
                />
              }
              onClick={() => setShowSettingsOverride(!showSettingsOverride)}
            >
              Override Generation Settings
            </Button>
            {showSettingsOverride && (
              <div className="mt-4 space-y-4 pl-1">
                <div>
                  <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
                    Hourly Rate
                  </Typography.Text>
                  <Input
                    type="number"
                    value={genHourlyRate}
                    onChange={(e) =>
                      setGenHourlyRate(e.target.value ? Number(e.target.value) : undefined)
                    }
                    prefix="$"
                    disabled={genLoading}
                    className="!w-40"
                  />
                </div>
                <div>
                  <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
                    AI Efficiency Factor
                  </Typography.Text>
                  <div className="max-w-xs">
                    <Slider
                      min={0.05}
                      max={1.0}
                      step={0.05}
                      value={genAiFactor ?? 0.3}
                      onChange={(val) => setGenAiFactor(val)}
                      disabled={genLoading}
                      tooltip={{
                        formatter: (v) =>
                          `${(v ?? 0.3).toFixed(2)} (${Math.round((1 - (v ?? 0.3)) * 100)}% faster)`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400 max-w-xs">
                    <span>Very fast</span>
                    <span>Traditional</span>
                  </div>
                </div>
                <div>
                  <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
                    Team Size
                  </Typography.Text>
                  <Input
                    type="number"
                    min={1}
                    value={genTeamSize}
                    onChange={(e) =>
                      setGenTeamSize(e.target.value ? Number(e.target.value) : undefined)
                    }
                    disabled={genLoading}
                    className="!w-24"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="primary"
              icon={
                genLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
              onClick={handleGenerate}
              disabled={!genInputText.trim() || genLoading}
              className="!bg-indigo-600"
            >
              {genLoading ? "Starting..." : "Generate"}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
