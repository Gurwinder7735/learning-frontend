"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Spin, Tag } from "antd";
import {
  AlertTriangle,
  ArrowRight,
  BookText,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FilePen,
  FileText,
  Hourglass,
  MapPin,
  Signature,
  Target,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { apiRequest } from "@/lib/api/axiosInstance";
import { useAuth } from "@/hooks/useAuth";
import { APP_ROUTES } from "@/lib/constants/appConstants";

// ── Types ──────────────────────────────────────────────────────────────────

interface DashboardData {
  leads: {
    total: number;
    by_stage: Record<string, number>;
    converted_this_month: number;
  };
  clients: {
    total: number;
    active: number;
    new_this_month: number;
    by_source: Record<string, number>;
  };
  meetings: {
    this_month: number;
    upcoming: Array<{
      id: string;
      title: string;
      meeting_date: string;
      client_id?: string | null;
      status: string;
      meet_link?: string | null;
      duration_minutes?: number | null;
    }>;
    pending_action_items: number;
  };
  proposals: { total: number; draft: number; generating: number; completed: number; failed: number };
  brds: { total: number; draft: number; generating: number; completed: number };
  agreements: {
    total: number;
    not_sent: number;
    awaiting_signature: number;
    fully_signed: number;
    declined: number;
  };
  recent_accounts: Array<{
    id: string;
    company_name: string;
    lifecycle_stage: string;
    origin_stage: string;
    status: string;
    lead_status?: string | null;
    country?: string | null;
    created_at: string;
  }>;
  needs_attention: {
    stale_leads: Array<{
      id: string;
      company_name: string;
      lead_status: string;
      last_updated_at: string;
      days_stale: number;
      assigned_to?: string | null;
    }>;
    stuck_deals: Array<{
      id: string;
      company_name: string;
      lead_status: string;
      last_updated_at: string;
      days_stuck: number;
      assigned_to?: string | null;
    }>;
    pending_signatures: Array<{
      id: string;
      name: string;
      client_id?: string | null;
      signing_status: string;
      last_updated_at: string;
      days_waiting: number;
    }>;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const firstName = (name || "").split(" ")[0] || name;
  return `${salutation}, ${firstName}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

const FUNNEL_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "follow_up", label: "Follow Up" },
  { key: "meeting_scheduled", label: "Meeting Scheduled" },
  { key: "discovery", label: "Discovery" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal_in_progress", label: "Proposal In Progress" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "negotiation", label: "Negotiation" },
  { key: "decision_pending", label: "Decision Pending" },
];

const MEETING_STATUS_COLOR: Record<string, string> = {
  scheduled: "blue",
  completed: "green",
  cancelled: "red",
};

const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral", linkedin: "LinkedIn", upwork: "Upwork",
  website: "Website", existing_client: "Existing Client",
  partner: "Partner", cold_outreach: "Cold Outreach", other: "Other",
};

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className={`text-3xl font-bold leading-none ${accent ?? "text-zinc-900"}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-zinc-400 mt-1.5">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [attentionTab, setAttentionTab] = useState<"stale" | "stuck" | "sig">("stale");

  useEffect(() => {
    apiRequest<{ data: DashboardData }>({ url: "/api/v1/dashboard", method: "GET" })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-400">
        Failed to load dashboard data.
      </div>
    );
  }

  const { leads, clients, meetings, proposals, brds, agreements, recent_accounts, needs_attention } = data;

  // Lead funnel — only show stages with > 0 count
  const funnelData = FUNNEL_STAGES.map((s) => ({
    ...s,
    count: leads.by_stage[s.key] ?? 0,
  })).filter((s) => s.count > 0);
  const funnelMax = Math.max(...funnelData.map((s) => s.count), 1);

  // Won/Converted
  const wonConverted =
    (leads.by_stage["won"] ?? 0) + (leads.by_stage["converted_to_client"] ?? 0);

  // Pipeline leads = non-lost, non-converted
  const lost = leads.by_stage["lost"] ?? 0;
  const pipelineLeads = leads.total - lost - wonConverted;

  return (
    <div className="space-y-6 pb-10">
      {/* ── Welcome header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {greeting(user?.name ?? user?.email ?? "")} 👋
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{fmtDate(new Date().toISOString())}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Live data · refreshed on page load</span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<Target className="w-5 h-5 text-blue-500" />}
          label="Pipeline Leads"
          value={pipelineLeads}
          sub={`${leads.total} total leads`}
          accent="text-blue-600"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          label="Converted / mo"
          value={leads.converted_this_month}
          sub="leads → clients"
          accent="text-emerald-600"
        />
        <KpiCard
          icon={<Building2 className="w-5 h-5 text-zinc-500" />}
          label="Active Clients"
          value={clients.active}
          sub={`${clients.new_this_month} new this month`}
        />
        <KpiCard
          icon={<Calendar className="w-5 h-5 text-orange-500" />}
          label="Meetings / mo"
          value={meetings.this_month}
          sub={`${meetings.upcoming.length} upcoming`}
          accent="text-orange-600"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-5 h-5 text-zinc-500" />}
          label="Pending Actions"
          value={meetings.pending_action_items}
          sub="open action items"
        />
        <KpiCard
          icon={<FilePen className="w-5 h-5 text-purple-500" />}
          label="Awaiting Sig."
          value={agreements.awaiting_signature}
          sub={`${agreements.fully_signed} fully signed`}
          accent={agreements.awaiting_signature > 0 ? "text-purple-600" : undefined}
        />
      </div>

      {/* ── Needs Attention ───────────────────────────────────────── */}
      <NeedsAttentionPanel
        data={needs_attention}
        active={attentionTab}
        onTabChange={setAttentionTab}
        onNavigate={(href) => router.push(href)}
      />

      {/* ── Middle row: Lead Funnel + Upcoming Meetings ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Lead funnel */}
        <Card
          className="!rounded-xl !border-zinc-200 !shadow-sm lg:col-span-3"
          title={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-zinc-500" />
                <span>Lead Pipeline</span>
              </div>
              <button
                onClick={() => router.push(APP_ROUTES.leads)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          }
        >
          {funnelData.length === 0 ? (
            <div className="text-center py-10">
              <Target className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No leads in the pipeline yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {funnelData.map((stage) => (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-36 shrink-0 truncate">
                    {stage.label}
                  </span>
                  <div className="flex-1 h-5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-800 transition-all duration-500"
                      style={{ width: `${Math.round((stage.count / funnelMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 w-6 text-right shrink-0">
                    {stage.count}
                  </span>
                </div>
              ))}
              {wonConverted > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-600 w-36 shrink-0">Won / Converted</span>
                  <div className="flex-1 h-5 bg-emerald-50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.round((wonConverted / funnelMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 w-6 text-right shrink-0">
                    {wonConverted}
                  </span>
                </div>
              )}
              {lost > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-red-400 w-36 shrink-0">Lost</span>
                  <div className="flex-1 h-5 bg-red-50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400 transition-all duration-500"
                      style={{ width: `${Math.round((lost / funnelMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-red-400 w-6 text-right shrink-0">
                    {lost}
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Upcoming meetings */}
        <Card
          className="!rounded-xl !border-zinc-200 !shadow-sm lg:col-span-2"
          title={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>Upcoming (7 days)</span>
              </div>
              <button
                onClick={() => router.push(APP_ROUTES.meetings)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          }
        >
          {meetings.upcoming.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No meetings in the next 7 days.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.upcoming.map((m) => {
                const d = new Date(m.meeting_date);
                return (
                  <div
                    key={m.id}
                    onClick={() => router.push(`${APP_ROUTES.meetings}/${m.id}`)}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors group"
                  >
                    {/* Date block */}
                    <div className="w-10 shrink-0 text-center rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 px-1">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-medium leading-none">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </p>
                      <p className="text-lg font-bold text-zinc-900 leading-tight">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-zinc-900 truncate leading-tight">
                        {m.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Tag
                          color={MEETING_STATUS_COLOR[m.status] || "default"}
                          className="!rounded-full !text-[10px] !px-1.5 !py-0 !leading-none"
                        >
                          {m.status}
                        </Tag>
                        <span className="text-[11px] text-zinc-400">
                          {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {m.meet_link && (
                          <Video className="w-3 h-3 text-purple-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Bottom row: Documents pipeline + Recent accounts ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Documents pipeline */}
        <Card
          className="!rounded-xl !border-zinc-200 !shadow-sm lg:col-span-3"
          title={
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              <span>Documents Pipeline</span>
            </div>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            {/* BRDs */}
            <div
              onClick={() => router.push(APP_ROUTES.brd)}
              className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 cursor-pointer hover:border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                  <BookText className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <span className="text-xs font-medium text-zinc-600">BRDs</span>
              </div>
              <p className="text-3xl font-bold text-zinc-900 mb-3">{brds.total}</p>
              <div className="space-y-1.5">
                <StatusPill label="Draft" count={brds.draft} color="zinc" />
                <StatusPill label="Generating" count={brds.generating} color="orange" />
                <StatusPill label="Completed" count={brds.completed} color="green" />
              </div>
            </div>

            {/* Proposals */}
            <div
              onClick={() => router.push(APP_ROUTES.proposals)}
              className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 cursor-pointer hover:border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <span className="text-xs font-medium text-zinc-600">Proposals</span>
              </div>
              <p className="text-3xl font-bold text-zinc-900 mb-3">{proposals.total}</p>
              <div className="space-y-1.5">
                <StatusPill label="Draft" count={proposals.draft} color="zinc" />
                <StatusPill label="Generating" count={proposals.generating} color="orange" />
                <StatusPill label="Completed" count={proposals.completed} color="green" />
              </div>
            </div>

            {/* Agreements */}
            <div
              onClick={() => router.push(APP_ROUTES.agreements)}
              className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 cursor-pointer hover:border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                  <FilePen className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <span className="text-xs font-medium text-zinc-600">Agreements</span>
              </div>
              <p className="text-3xl font-bold text-zinc-900 mb-3">{agreements.total}</p>
              <div className="space-y-1.5">
                <StatusPill label="Not Sent" count={agreements.not_sent} color="zinc" />
                <StatusPill label="Awaiting" count={agreements.awaiting_signature} color="orange" />
                <StatusPill label="Signed" count={agreements.fully_signed} color="green" />
              </div>
            </div>
          </div>

          {/* Source breakdown */}
          {Object.keys(clients.by_source).length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">
                Client Sources
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(clients.by_source)
                  .sort(([, a], [, b]) => b - a)
                  .map(([src, cnt]) => {
                    const total = clients.total || 1;
                    return (
                      <div key={src} className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-800 rounded-full"
                            style={{ width: `${Math.round((cnt / total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-16 shrink-0 truncate">
                          {SOURCE_LABELS[src] || src}
                        </span>
                        <span className="text-xs font-medium text-zinc-900 w-5 text-right shrink-0">
                          {cnt}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </Card>

        {/* Recent accounts */}
        <Card
          className="!rounded-xl !border-zinc-200 !shadow-sm lg:col-span-2"
          title={
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-500" />
              <span>Recent Accounts</span>
            </div>
          }
        >
          {recent_accounts.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No accounts yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recent_accounts.map((acc) => {
                const isClient = acc.lifecycle_stage === "client";
                const href = isClient
                  ? `${APP_ROUTES.clients}/${acc.id}`
                  : `${APP_ROUTES.leads}/${acc.id}`;
                const initials = acc.company_name.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={acc.id}
                    onClick={() => router.push(href)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 truncate">
                          {acc.company_name}
                        </span>
                        <span
                          className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                            isClient
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isClient ? "Client" : "Lead"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {acc.country && (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {acc.country}
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400">
                          {new Date(acc.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => router.push(APP_ROUTES.leads)}
                  className="flex-1 text-xs text-zinc-500 hover:text-zinc-900 text-center py-1.5 rounded-lg border border-zinc-100 hover:border-zinc-200 transition-colors"
                >
                  All Leads
                </button>
                <button
                  onClick={() => router.push(APP_ROUTES.clients)}
                  className="flex-1 text-xs text-zinc-500 hover:text-zinc-900 text-center py-1.5 rounded-lg border border-zinc-100 hover:border-zinc-200 transition-colors"
                >
                  All Clients
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Needs Attention panel ─────────────────────────────────────────────────

function NeedsAttentionPanel({
  data,
  active,
  onTabChange,
  onNavigate,
}: {
  data: DashboardData["needs_attention"];
  active: "stale" | "stuck" | "sig";
  onTabChange: (t: "stale" | "stuck" | "sig") => void;
  onNavigate: (href: string) => void;
}) {
  const stale = data.stale_leads;
  const stuck = data.stuck_deals;
  const sig = data.pending_signatures;
  const totalCount = stale.length + stuck.length + sig.length;

  // Show the panel only when there's actually something to draw attention to.
  if (totalCount === 0) {
    return (
      <Card
        className="!rounded-xl !border-emerald-100 !bg-emerald-50/40 !shadow-sm"
        size="small"
      >
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-900">You're all caught up</p>
            <p className="text-xs text-emerald-700/70">
              No stale leads, stuck deals, or pending signatures right now.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const tabs: Array<{
    key: "stale" | "stuck" | "sig";
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    { key: "stale", label: "Stale Leads", count: stale.length, icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "stuck", label: "Stuck Deals", count: stuck.length, icon: <Hourglass className="w-3.5 h-3.5" /> },
    { key: "sig", label: "Pending Signatures", count: sig.length, icon: <Signature className="w-3.5 h-3.5" /> },
  ];

  return (
    <Card className="!rounded-xl !border-amber-200 !shadow-sm !mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">Needs Attention</p>
            <p className="text-[11px] text-zinc-500 leading-tight">
              {totalCount} item{totalCount !== 1 ? "s" : ""} to review
            </p>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-1">
          {tabs.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  isActive
                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-amber-100 text-amber-700"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab content */}
      {active === "stale" && (
        <AttentionList
          rows={stale.map((l) => ({
            id: l.id,
            title: l.company_name,
            meta: statusLabel(l.lead_status),
            metric: `${l.days_stale} day${l.days_stale !== 1 ? "s" : ""} silent`,
            severity: l.days_stale >= 14 ? "high" : "medium",
            href: `${APP_ROUTES.leads}/${l.id}`,
          }))}
          empty="No stale leads. Nice."
        />
      )}
      {active === "stuck" && (
        <AttentionList
          rows={stuck.map((l) => ({
            id: l.id,
            title: l.company_name,
            meta: `Stuck at ${statusLabel(l.lead_status)}`,
            metric: `${l.days_stuck} day${l.days_stuck !== 1 ? "s" : ""} unchanged`,
            severity: l.days_stuck >= 21 ? "high" : "medium",
            href: `${APP_ROUTES.leads}/${l.id}`,
          }))}
          empty="No stuck deals. Nice."
        />
      )}
      {active === "sig" && (
        <AttentionList
          rows={sig.map((a) => ({
            id: a.id,
            title: a.name,
            meta: statusLabel(a.signing_status),
            metric: `${a.days_waiting} day${a.days_waiting !== 1 ? "s" : ""} waiting`,
            severity: a.days_waiting >= 10 ? "high" : "medium",
            href: `${APP_ROUTES.agreements}/${a.id}`,
          }))}
          empty="No agreements are waiting."
        />
      )}
    </Card>
  );
}

function AttentionList({
  rows,
  empty,
}: {
  rows: Array<{
    id: string;
    title: string;
    meta: string;
    metric: string;
    severity: "medium" | "high";
    href: string;
  }>;
  empty: string;
}) {
  const router = useRouter();
  if (rows.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">{empty}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.id}
          onClick={() => router.push(r.href)}
          className="group flex items-center gap-3 p-3 rounded-lg border border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50/60 cursor-pointer transition-colors"
        >
          {/* Severity dot */}
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              r.severity === "high" ? "bg-red-500" : "bg-amber-500"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{r.title}</p>
            <p className="text-xs text-zinc-400 truncate capitalize">{r.meta}</p>
          </div>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
              r.severity === "high"
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}
          >
            {r.metric}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-600 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Pretty-print a snake_case status.
function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

// ── StatusPill ─────────────────────────────────────────────────────────────

function StatusPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "zinc" | "green" | "orange" | "blue" | "red";
}) {
  const colors = {
    zinc: "bg-zinc-100 text-zinc-600",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="flex items-center justify-between">
      <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors[color]}`}>
        {label}
      </span>
      <span className="text-xs font-semibold text-zinc-900">{count}</span>
    </div>
  );
}
