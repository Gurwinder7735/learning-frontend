"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, InputNumber, Select, Button, Typography, Radio, Alert } from "antd";
import { Sparkles, Loader2 } from "lucide-react";
import type { BRD } from "@/types/models/BRD";
import type { Client } from "@/types/models/Client";
import type {
  ProposalGenerateInput,
  ProposalPaymentType,
} from "@/types/models/Proposal";

/**
 * Drawer body for creating a new proposal.
 *
 * The user picks a *completed* BRD; title and client are auto-filled
 * from it (both remain editable). Commercial inputs are optional —
 * anything left blank is filled in by the AI agents at generation time.
 */
interface Props {
  brds: BRD[];
  brdsLoading: boolean;
  clients: Client[];
  clientsLoading: boolean;
  onSubmit: (data: ProposalGenerateInput) => Promise<void>;
  loading: boolean;
}

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

export function ProposalGenerationForm({
  brds,
  brdsLoading,
  clients,
  clientsLoading,
  onSubmit,
  loading,
}: Props) {
  const [brdId, setBrdId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string | undefined>();
  const [paymentType, setPaymentType] = useState<ProposalPaymentType>("fixed_cost");
  const [equityPercentage, setEquityPercentage] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [advancePercentage, setAdvancePercentage] = useState<number | null>(null);
  const [maxTimelineWeeks, setMaxTimelineWeeks] = useState<number | null>(null);
  const [extraNotes, setExtraNotes] = useState("");

  // Only completed BRDs are eligible — a draft / generating BRD has no
  // content the agents can build on.
  const eligibleBRDs = useMemo(
    () => brds.filter((b) => b.status === "completed"),
    [brds],
  );

  const selectedBRD = eligibleBRDs.find((b) => b.id === brdId);
  const selectedClient = clients.find((c) => c.id === clientId);

  // Auto-fill title + client the first time a BRD is picked. The user
  // can still edit either field afterwards.
  useEffect(() => {
    if (!selectedBRD) return;
    if (!title) setTitle(`${selectedBRD.name} — Proposal`);
    if (!clientId && selectedBRD.clientId) setClientId(selectedBRD.clientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brdId]);

  const canSubmit =
    !loading &&
    !!brdId &&
    !!title.trim() &&
    (paymentType !== "cash_equity" || (equityPercentage != null && equityPercentage >= 0));

  const handleSubmit = async () => {
    if (!canSubmit || !brdId) return;
    await onSubmit({
      brdId,
      title: title.trim(),
      name: title.trim(),
      clientId: clientId || undefined,
      clientName: selectedClient?.companyName || selectedBRD?.clientName || undefined,
      paymentType,
      equityPercentage: paymentType === "cash_equity" ? equityPercentage : null,
      currency,
      maxBudget,
      advancePercentage,
      maxTimelineWeeks,
      extraNotes: extraNotes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-5">
      {/* Source BRD */}
      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Source BRD <span className="text-red-500">*</span>
        </Typography.Text>
        <Select
          value={brdId}
          onChange={setBrdId}
          placeholder="Choose a completed BRD"
          showSearch
          allowClear
          disabled={loading}
          loading={brdsLoading}
          style={{ width: "100%" }}
          getPopupContainer={(trigger) => trigger.parentNode}
          filterOption={(input, option) =>
            (option?.label ?? "").toString().toLowerCase().includes(input.toLowerCase())
          }
          notFoundContent={
            brdsLoading
              ? "Loading..."
              : eligibleBRDs.length === 0
                ? "No completed BRDs — publish a BRD first"
                : "No matching BRDs"
          }
          options={eligibleBRDs.map((b) => ({
            value: b.id,
            label: b.clientName ? `${b.name} — ${b.clientName}` : b.name,
          }))}
        />
        {!brdsLoading && eligibleBRDs.length === 0 && (
          <Alert
            type="warning"
            showIcon
            className="!mt-2"
            message="You need a completed BRD before generating a proposal."
          />
        )}
      </div>

      {/* Title */}
      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Proposal Title <span className="text-red-500">*</span>
        </Typography.Text>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. E-Commerce Platform — Proposal"
          disabled={loading}
        />
      </div>

      {/* Client */}
      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Client
        </Typography.Text>
        <Select
          value={clientId}
          onChange={setClientId}
          placeholder="Select client (auto-filled from BRD)"
          allowClear
          showSearch
          disabled={loading}
          loading={clientsLoading}
          style={{ width: "100%" }}
          getPopupContainer={(trigger) => trigger.parentNode}
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          notFoundContent={clientsLoading ? "Loading..." : "No clients found"}
          options={clients.map((c) => ({ value: c.id, label: c.companyName }))}
        />
      </div>

      {/* Payment type */}
      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Payment Type <span className="text-red-500">*</span>
        </Typography.Text>
        <Typography.Text className="text-[11px] text-zinc-400 block mb-2">
          Payment is always broken into milestones. Choose whether the client
          pays fully in cash or whether some portion is equity.
        </Typography.Text>
        <Radio.Group
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value as ProposalPaymentType)}
          disabled={loading}
        >
          <Radio.Button value="fixed_cost">Fixed Cost (100% cash)</Radio.Button>
          <Radio.Button value="cash_equity">Cash + Equity</Radio.Button>
        </Radio.Group>
      </div>

      {/* Equity % — only when applicable */}
      {paymentType === "cash_equity" && (
        <div>
          <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
            Equity Percentage <span className="text-red-500">*</span>
          </Typography.Text>
          <InputNumber
            value={equityPercentage}
            onChange={(v) => setEquityPercentage(v === null ? null : Number(v))}
            min={0}
            max={100}
            step={0.5}
            precision={2}
            placeholder="e.g. 5"
            disabled={loading}
            addonAfter="%"
            style={{ width: 200 }}
          />
        </div>
      )}

      {/* Currency + Budget */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
            Currency
          </Typography.Text>
          <Select
            value={currency}
            onChange={setCurrency}
            disabled={loading}
            style={{ width: "100%" }}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            getPopupContainer={(trigger) => trigger.parentNode}
          />
        </div>
        <div>
          <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
            Max Budget (optional)
          </Typography.Text>
          <InputNumber
            value={maxBudget}
            onChange={(v) => setMaxBudget(v === null ? null : Number(v))}
            min={0}
            step={1000}
            placeholder="Auto if blank"
            disabled={loading}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Advance % + Timeline */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
            Advance %
          </Typography.Text>
          <InputNumber
            value={advancePercentage}
            onChange={(v) => setAdvancePercentage(v === null ? null : Number(v))}
            min={0}
            max={100}
            step={5}
            placeholder="Auto if blank"
            disabled={loading}
            addonAfter="%"
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
            Max Timeline (weeks)
          </Typography.Text>
          <InputNumber
            value={maxTimelineWeeks}
            onChange={(v) => setMaxTimelineWeeks(v === null ? null : Number(v))}
            min={1}
            step={1}
            placeholder="Auto if blank"
            disabled={loading}
            addonAfter="wks"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Extra Notes (optional)
        </Typography.Text>
        <Typography.Text className="text-[11px] text-zinc-400 block mb-2">
          Anything specific you want the agents to know — negotiation history,
          discount authorised, non-standard terms, competitors, urgency.
        </Typography.Text>
        <Input.TextArea
          value={extraNotes}
          onChange={(e) => setExtraNotes(e.target.value)}
          rows={4}
          placeholder="e.g. Client has a hard board deadline of end of Q2; a 10% discount was authorised if the equity component doesn't work..."
          disabled={loading}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="primary"
          icon={
            loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )
          }
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="!bg-black"
          size="large"
        >
          {loading ? "Starting generation..." : "Generate Proposal"}
        </Button>
      </div>
    </div>
  );
}
