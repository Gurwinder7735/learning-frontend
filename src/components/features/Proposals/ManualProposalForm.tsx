"use client";

import { useState } from "react";
import { Button, Input, Select, Typography } from "antd";
import { Loader2, Pencil } from "lucide-react";

import type { Client } from "@/types/models/Client";

/**
 * Manual (non-AI) proposal creation form.
 *
 * Deliberately minimal — the user gets an empty document to fill in and
 * everything else (commercial inputs, cover metadata) can be tweaked
 * later on the detail page's "Document Cover" block. Anything more
 * here would be redundant with the standard edit flow.
 */
export interface ManualProposalInput {
  title: string;
  name: string;
  clientId?: string;
  clientName?: string;
}

interface Props {
  clients: Client[];
  clientsLoading: boolean;
  onSubmit: (data: ManualProposalInput) => Promise<void>;
  loading: boolean;
}

export function ManualProposalForm({
  clients,
  clientsLoading,
  onSubmit,
  loading,
}: Props) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string | undefined>();

  const selectedClient = clients.find((c) => c.id === clientId);
  const canSubmit = !loading && !!title.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const trimmed = title.trim();
    await onSubmit({
      title: trimmed,
      name: trimmed,
      clientId: clientId || undefined,
      clientName: selectedClient?.companyName || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Proposal Title <span className="text-red-500">*</span>
        </Typography.Text>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPressEnter={handleSubmit}
          placeholder="e.g. Acme Corp — Rebranding Engagement"
          disabled={loading}
          autoFocus
        />
      </div>

      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Client <span className="text-zinc-300">(optional)</span>
        </Typography.Text>
        <Select
          value={clientId}
          onChange={setClientId}
          placeholder="Select client (can be added later)"
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

      <div className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-50 border border-zinc-100 rounded-xl p-3">
        You&apos;ll land on the editor with an empty document. Set the
        cover metadata (client, prepared-by, version) and payment terms
        on the detail page whenever you&apos;re ready.
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="primary"
          icon={
            loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pencil className="w-4 h-4" />
            )
          }
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="!bg-black"
          size="large"
        >
          {loading ? "Creating..." : "Create Proposal"}
        </Button>
      </div>
    </div>
  );
}
