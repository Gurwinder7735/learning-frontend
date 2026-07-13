"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Select, Spin } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  ArrowUpRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api/axiosInstance";
import { PageHeader } from "@/components/ui/PageHeader";

// ── Types ──────────────────────────────────────────────────────────────────

interface ReportsData {
  period: { start: string; end: string };
  funnel: {
    total_new: number;
    active: number;
    converted: number;
    lost: number;
    win_rate: number;
    by_stage: Record<string, number>;
  };
  monthly_trend: Array<{
    month: string;
    month_short: string;
    new_leads: number;
    converted: number;
    lost: number;
  }>;
  source_conversion: Array<{
    source: string;
    total: number;
    converted: number;
    conversion_rate: number;
  }>;
  win_loss: { won: number; lost: number; win_rate: number };
  meeting_activity: Array<{
    week: string;
    scheduled: number;
    completed: number;
    cancelled: number;
  }>;
  doc_pipeline: {
    brds: { total: number; by_status: Record<string, number> };
    proposals: { total: number; by_status: Record<string, number> };
    agreements: { total: number; by_status: Record<string, number> };
  };
  deal_velocity: {
    avg_days: number | null;
    min_days: number | null;
    max_days: number | null;
    sample_size: number;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "180d", label: "Last 6 months" },
  { value: "365d", label: "Last 12 months" },
];

const CHART_COLORS = {
  leads: "#18181b",
  converted: "#16a34a",
  lost: "#ef4444",
  scheduled: "#3b82f6",
  completed: "#16a34a",
  cancelled: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#a1a1aa",
  generating: "#f59e0b",
  completed: "#16a34a",
  failed: "#ef4444",
  archived: "#d4d4d8",
  sent: "#3b82f6",
  fully_signed: "#16a34a",
  awaiting_client: "#f59e0b",
  awaiting_internal: "#8b5cf6",
  partially_signed: "#f97316",
  declined: "#ef4444",
  not_sent: "#a1a1aa",
};

// ── KPI Card ──────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card className="!rounded-xl !border-zinc-200 !shadow-sm" size="small">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-medium text-zinc-400 mb-1">
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

// ── Section wrapper ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title={title}>
      {children}
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<{ data: ReportsData }>({
        url: `/api/v1/reports?period=${p}`,
        method: "GET",
      });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Analytics and insights across your pipeline." />
        <div className="flex items-center justify-center py-32">
          {loading ? <Spin size="large" /> : (
            <p className="text-zinc-400">Failed to load reports.</p>
          )}
        </div>
      </div>
    );
  }

  const { funnel, monthly_trend, source_conversion, win_loss, meeting_activity, doc_pipeline, deal_velocity } = data;
  const totalMeetings = meeting_activity.reduce((s, w) => s + w.scheduled + w.completed + w.cancelled, 0);
  const completedMeetings = meeting_activity.reduce((s, w) => s + w.completed, 0);

  // Donut data
  const winLossDonut = [
    { name: "Won", value: win_loss.won },
    { name: "Lost", value: win_loss.lost },
  ].filter((d) => d.value > 0);

  // Doc pipeline combined bar
  const docBarData = [
    {
      name: "BRDs",
      draft: doc_pipeline.brds.by_status["draft"] ?? 0,
      generating: doc_pipeline.brds.by_status["generating"] ?? 0,
      completed: doc_pipeline.brds.by_status["completed"] ?? 0,
    },
    {
      name: "Proposals",
      draft: doc_pipeline.proposals.by_status["draft"] ?? 0,
      generating: doc_pipeline.proposals.by_status["generating"] ?? 0,
      completed: doc_pipeline.proposals.by_status["completed"] ?? 0,
    },
    {
      name: "Agreements",
      draft: doc_pipeline.agreements.by_status["draft"] ?? 0,
      generating: doc_pipeline.agreements.by_status["not_sent"] ?? 0,
      completed: doc_pipeline.agreements.by_status["fully_signed"] ?? 0,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header + period selector ───────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Reports</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Analytics across your pipeline, documents, and meetings.
          </p>
        </div>
        <Select
          value={period}
          onChange={setPeriod}
          options={PERIOD_OPTIONS}
          style={{ width: 180 }}
          className="self-center"
        />
      </div>

      {/* ── Summary KPIs ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="New Leads"
          value={funnel.total_new}
          sub="in selected period"
          icon={<Target className="w-5 h-5 text-blue-500" />}
          accent="text-blue-600"
        />
        <KpiCard
          label="Win Rate"
          value={`${funnel.win_rate}%`}
          sub="of closed deals"
          icon={<Trophy className="w-5 h-5 text-amber-500" />}
          accent="text-amber-600"
        />
        <KpiCard
          label="Converted"
          value={funnel.converted}
          sub="leads → clients"
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          accent="text-emerald-600"
        />
        <KpiCard
          label="Lost"
          value={funnel.lost}
          sub="in period"
          icon={<TrendingDown className="w-5 h-5 text-red-400" />}
          accent="text-red-500"
        />
        <KpiCard
          label="Avg. Deal Cycle"
          value={deal_velocity.avg_days !== null ? `${deal_velocity.avg_days}d` : "—"}
          sub={deal_velocity.sample_size > 0 ? `from ${deal_velocity.sample_size} deals` : "no data yet"}
          icon={<Clock className="w-5 h-5 text-zinc-500" />}
        />
        <KpiCard
          label="Meetings Done"
          value={completedMeetings}
          sub={`of ${totalMeetings} total`}
          icon={<Calendar className="w-5 h-5 text-orange-500" />}
          accent="text-orange-600"
        />
      </div>

      {/* ── Monthly Trend + Win/Loss ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Lead Pipeline Trend (6 months)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly_trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="month_short" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
                cursor={{ fill: "#f4f4f5" }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="new_leads" name="New Leads" fill={CHART_COLORS.leads} radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="converted" name="Converted" fill={CHART_COLORS.converted} radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="lost" name="Lost" fill={CHART_COLORS.lost} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Win / Loss donut */}
          <Section title="Win / Loss Breakdown">
            {winLossDonut.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-zinc-400">
                <XCircle className="w-8 h-8 mb-2 text-zinc-300" />
                <p className="text-sm">No closed deals in this period.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={winLossDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      <Cell fill={CHART_COLORS.converted} />
                      <Cell fill={CHART_COLORS.lost} />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-600">Won: {win_loss.won}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="text-zinc-600">Lost: {win_loss.lost}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-900 mt-2">{win_loss.win_rate}%</p>
                <p className="text-xs text-zinc-400">win rate</p>
              </div>
            )}
          </Section>

          {/* Deal velocity */}
          <Section title="Deal Velocity">
            {deal_velocity.avg_days === null ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-zinc-400">
                <Clock className="w-8 h-8 mb-2 text-zinc-300" />
                <p className="text-sm text-center">Not enough data yet. Convert a few leads to see this.</p>
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-zinc-900 leading-none">{deal_velocity.avg_days}</p>
                  <p className="text-sm text-zinc-400 mt-1">days average deal cycle</p>
                  <p className="text-xs text-zinc-400 mt-0.5">from {deal_velocity.sample_size} converted deal{deal_velocity.sample_size !== 1 ? "s" : ""}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                    <p className="text-xl font-bold text-emerald-700">{deal_velocity.min_days}d</p>
                    <p className="text-[11px] text-emerald-600">fastest close</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-3 text-center">
                    <p className="text-xl font-bold text-zinc-700">{deal_velocity.max_days}d</p>
                    <p className="text-[11px] text-zinc-500">longest close</p>
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* ── Source Conversion ─────────────────────────────────────── */}
      <Section title="Lead Source Performance — Total vs Converted">
        {source_conversion.length === 0 ? (
          <div className="text-center py-10 text-zinc-400">No lead data in this period.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={source_conversion}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }} cursor={{ fill: "#f4f4f5" }} />
                <Bar dataKey="total" name="Total Leads" fill="#e4e4e7" radius={[0, 3, 3, 0]} maxBarSize={14} />
                <Bar dataKey="converted" name="Converted" fill={CHART_COLORS.converted} radius={[0, 3, 3, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {source_conversion.map((s) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 w-28 shrink-0">{s.source}</span>
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${s.conversion_rate}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900 w-10 text-right shrink-0">
                    {s.conversion_rate}%
                  </span>
                </div>
              ))}
              <p className="text-[11px] text-zinc-400 pt-1">Conversion rate per source</p>
            </div>
          </div>
        )}
      </Section>

      {/* ── Meeting Activity ──────────────────────────────────────── */}
      <Section title="Meeting Activity by Week">
        {meeting_activity.length === 0 ? (
          <div className="text-center py-10 text-zinc-400">No meetings in this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={meeting_activity} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.completed} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.completed} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.scheduled} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.scheduled} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.completed} fill="url(#colorCompleted)" strokeWidth={2} />
              <Area type="monotone" dataKey="scheduled" name="Scheduled" stroke={CHART_COLORS.scheduled} fill="url(#colorScheduled)" strokeWidth={2} />
              <Area type="monotone" dataKey="cancelled" name="Cancelled" stroke={CHART_COLORS.cancelled} fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Document Pipeline ─────────────────────────────────────── */}
      <Section title="Document Pipeline — BRDs · Proposals · Agreements">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={docBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }} cursor={{ fill: "#f4f4f5" }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="draft" name="Draft / Not Sent" fill="#d4d4d8" radius={[3, 3, 0, 0]} maxBarSize={36} />
              <Bar dataKey="generating" name="In Progress / Awaiting" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={36} />
              <Bar dataKey="completed" name="Completed / Signed" fill={CHART_COLORS.converted} radius={[3, 3, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-4">
            {[
              { label: "BRDs", data: doc_pipeline.brds, completedKey: "completed" },
              { label: "Proposals", data: doc_pipeline.proposals, completedKey: "completed" },
              { label: "Agreements", data: doc_pipeline.agreements, completedKey: "fully_signed" },
            ].map(({ label, data: d, completedKey }) => {
              const done = d.by_status[completedKey] ?? 0;
              const pct = d.total > 0 ? Math.round((done / d.total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-zinc-700">{label}</span>
                    <span className="text-zinc-400">{done} / {d.total} completed ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}
