"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Drawer, Modal, message, Tooltip } from "antd";
import {
  FileText,
  Sparkles,
  Loader2,
  Building2,
  Clock,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Lock,
  Globe,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  fetchProposalsRequest,
} from "@/store/modules/proposals/proposalsSlice";
import {
  selectProposals,
  selectProposalsLoading,
} from "@/store/modules/proposals/proposalsSelectors";
import { fetchBRDsRequest } from "@/store/modules/brd/brdSlice";
import { selectBRDs, selectBRDLoading } from "@/store/modules/brd/brdSelectors";
import {
  selectClients,
  selectClientsMeta,
} from "@/store/modules/clients/clientsSelectors";
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import { ProposalGenerationForm } from "@/components/features/Proposals/ProposalGenerationForm";
import { storage } from "@/lib/utils/storage";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import type { Proposal, ProposalGenerateInput } from "@/types/models/Proposal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Date helpers ────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Card left-border accent by status.
const accentClass: Record<string, string> = {
  completed: "border-l-emerald-500",
  generating: "border-l-blue-500",
  failed: "border-l-red-400",
  draft: "border-l-zinc-300",
  archived: "border-l-zinc-200",
};

// ─── Card ────────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  onDelete,
}: {
  proposal: Proposal;
  onDelete: (p: Proposal) => void;
}) {
  const isGenerating = proposal.status === "generating";
  const isCompleted = proposal.status === "completed";
  const isFailed = proposal.status === "failed";
  const isPublished = !!proposal.publishedVersionLabel;

  return (
    <div
      className={`relative group bg-white rounded-2xl border-l-4 border border-zinc-100 ${
        accentClass[proposal.status] || "border-l-zinc-300"
      } hover:border-zinc-200 hover:shadow-md transition-all duration-200`}
    >
      <Link
        href={`${APP_ROUTES.proposals}/${proposal.id}`}
        className="block p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors leading-snug line-clamp-2">
              {proposal.title || proposal.name}
            </h3>
            {proposal.brdName && (
              <p className="text-[11px] text-zinc-400 mt-1 truncate">
                Based on: {proposal.brdName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isGenerating && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Generating
              </span>
            )}
            {isFailed && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                <AlertCircle className="w-2.5 h-2.5" />
                Failed
              </span>
            )}
            {isCompleted && isPublished && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <Globe className="w-2.5 h-2.5" />
                v{proposal.publishedVersionLabel} live
              </span>
            )}
            {isCompleted && !isPublished && (
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">
                Not published
              </span>
            )}
          </div>
        </div>

        {proposal.clientName ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-3">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {proposal.clientName}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 italic mb-3">
            No client assigned
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-50 pt-3 mt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(proposal.createdAt)}
            </span>
            <span className="text-zinc-300">•</span>
            <span>
              {proposal.paymentType === "cash_equity"
                ? `${proposal.currency} + ${proposal.equityPercentage ?? 0}% equity`
                : proposal.currency}
            </span>
            {proposal.isPasswordProtected && (
              <Tooltip title="Password protected">
                <Lock className="w-3 h-3 text-zinc-400" />
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isCompleted && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span className="text-zinc-300">{formatTime(proposal.createdAt)}</span>
          </div>
        </div>
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(proposal);
        }}
        className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
        title="Delete proposal"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const proposals = useAppSelector(selectProposals);
  const isLoading = useAppSelector(selectProposalsLoading);
  const brds = useAppSelector(selectBRDs);
  const brdsLoading = useAppSelector(selectBRDLoading);
  const clients = useAppSelector(selectClients);
  const clientsMeta = useAppSelector(selectClientsMeta);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    dispatch(fetchProposalsRequest());
    dispatch(fetchBRDsRequest());
    dispatch(fetchClientsRequest({ limit: 200 }));
  }, [dispatch]);

  const handleDelete = (proposal: Proposal) => {
    Modal.confirm({
      title: "Delete Proposal",
      content: `Delete "${proposal.title || proposal.name}"? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = storage.getAccessToken();
          const res = await fetch(
            `${API_BASE_URL}${API_ENDPOINTS.proposals.delete(proposal.id)}`,
            {
              method: "DELETE",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );
          if (!res.ok) throw new Error();
          message.success("Proposal deleted");
          dispatch(fetchProposalsRequest());
        } catch {
          message.error("Failed to delete proposal");
        }
      },
    });
  };

  const handleGenerate = async (data: ProposalGenerateInput) => {
    setGenerating(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.proposals.generate}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || err?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const proposalId = json.data?.proposalId;
      setDrawerOpen(false);
      message.success("Proposal generation started!");
      if (proposalId) router.push(`${APP_ROUTES.proposals}/${proposalId}`);
    } catch (e: unknown) {
      Modal.error({
        title: "Generation failed",
        content: e instanceof Error ? e.message : "Could not start generation.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const completedCount = proposals.filter((p) => p.status === "completed").length;
  const publishedCount = proposals.filter((p) => p.publishedVersionLabel).length;
  const generatingCount = proposals.filter(
    (p) => p.status === "generating",
  ).length;

  return (
    <div>
      <PageHeader
        title="Proposals"
        subtitle="Generate professional, milestone-based client proposals from any completed BRD."
      />

      {proposals.length > 0 && (
        <div className="flex items-center gap-6 mb-6 text-xs text-zinc-500">
          <span>
            <strong className="text-zinc-800 font-semibold">
              {proposals.length}
            </strong>{" "}
            total
          </span>
          <span>
            <strong className="text-emerald-700 font-semibold">
              {publishedCount}
            </strong>{" "}
            published
          </span>
          <span>
            <strong className="text-zinc-700 font-semibold">{completedCount}</strong>{" "}
            completed
          </span>
          {generatingCount > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <strong>{generatingCount}</strong> generating
            </span>
          )}
          <div className="flex-1" />
          <Button
            type="primary"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setDrawerOpen(true)}
            className="!bg-zinc-900"
          >
            Generate Proposal
          </Button>
        </div>
      )}

      {isLoading && proposals.length === 0 ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
            <FileText className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-bold text-zinc-700 mb-1">
            No proposals yet
          </h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">
            Pick a completed BRD, add commercial inputs, and let the AI pipeline
            draft a professional client-ready proposal.
          </p>
          <Button
            type="primary"
            size="large"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setDrawerOpen(true)}
            className="!bg-zinc-900"
          >
            Generate your first proposal
          </Button>
        </div>
      ) : (
        <>
          {generatingCount > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                In Progress
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {proposals
                  .filter((p) => p.status === "generating")
                  .map((p) => (
                    <ProposalCard key={p.id} proposal={p} onDelete={handleDelete} />
                  ))}
              </div>
            </div>
          )}

          {proposals.filter((p) => p.status !== "generating").length > 0 && (
            <div>
              {generatingCount > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                  All Proposals
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {proposals
                  .filter((p) => p.status !== "generating")
                  .map((p) => (
                    <ProposalCard key={p.id} proposal={p} onDelete={handleDelete} />
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      <Drawer
        title="Generate AI Proposal"
        width={720}
        open={drawerOpen}
        onClose={() => {
          if (!generating) setDrawerOpen(false);
        }}
        destroyOnClose
      >
        <ProposalGenerationForm
          brds={brds}
          brdsLoading={brdsLoading}
          clients={clients}
          clientsLoading={clientsMeta.isLoading}
          onSubmit={handleGenerate}
          loading={generating}
        />
      </Drawer>
    </div>
  );
}
