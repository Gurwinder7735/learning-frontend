"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Tag, Typography, Drawer, Modal, message } from "antd";
import { BookText, Sparkles, Loader2, Building2, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { fetchBRDsRequest } from "@/store/modules/brd/brdSlice";
import { selectBRDs, selectBRDLoading } from "@/store/modules/brd/brdSelectors";
import { selectClients, selectClientsMeta } from "@/store/modules/clients/clientsSelectors";
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import { BRDGenerationForm } from "@/components/features/BRD/BRDGenerationForm";
import { storage } from "@/lib/utils/storage";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import type { BRD } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const statusColors: Record<string, string> = {
  draft: "default",
  generating: "processing",
  completed: "green",
  failed: "red",
  archived: "default",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  generating: "Generating...",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BRDPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const brds = useAppSelector(selectBRDs);
  const isLoading = useAppSelector(selectBRDLoading);
  const clients = useAppSelector(selectClients);
  const clientsMeta = useAppSelector(selectClientsMeta);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    dispatch(fetchBRDsRequest());
    dispatch(fetchClientsRequest({ limit: 200 }));
  }, [dispatch]);

  const handleGenerate = async (formData: {
    name: string;
    contextText: string;
    clientId?: string;
    clientName?: string;
    files: File[];
  }) => {
    setGenerating(true);
    try {
      const token = storage.getAccessToken();
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("context_text", formData.contextText);
      if (formData.clientId) fd.append("client_id", formData.clientId);
      if (formData.clientName) fd.append("client_name", formData.clientName);
      formData.files.forEach((f) => fd.append("files", f));

      const res = await fetch(`${API_BASE_URL}/api/v1/brd/generate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const brdId = json.data?.brdId;
      setDrawerOpen(false);
      message.success("BRD generation started!");
      if (brdId) router.push(`${APP_ROUTES.brd}/${brdId}`);
    } catch {
      Modal.error({ title: "Generation failed", content: "Could not start BRD generation. Please try again." });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="BRD Studio"
        subtitle="Generate AI-powered Business Requirements Documents from client context and uploaded files."
      />

      <div className="mb-4 flex items-center justify-between">
        <div />
        <Button
          type="primary"
          icon={<Sparkles className="w-4 h-4" />}
          onClick={() => setDrawerOpen(true)}
          className="!bg-black"
        >
          Generate BRD
        </Button>
      </div>

      {isLoading && brds.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : brds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <BookText className="w-16 h-16 mb-4 text-zinc-300" />
          <Typography.Text className="text-lg font-medium text-zinc-500 block">
            No BRDs yet
          </Typography.Text>
          <Typography.Text className="text-sm text-zinc-400 block mb-4">
            Upload client documents and generate your first AI Business Requirements Document.
          </Typography.Text>
          <Button
            type="primary"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setDrawerOpen(true)}
            className="!bg-black"
          >
            Generate BRD
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {brds.map((brd: BRD) => (
            <Link key={brd.id} href={`${APP_ROUTES.brd}/${brd.id}`} className="block group">
              <Card
                className="!rounded-xl !border-zinc-200 !shadow-sm hover:!shadow-md hover:!border-zinc-300 transition-all !cursor-pointer"
                size="small"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
                    <BookText className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Typography.Text className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors truncate max-w-[240px]">
                        {brd.name}
                      </Typography.Text>
                      <Tag
                        color={statusColors[brd.status] || "default"}
                        className="!rounded-full !text-[10px] !px-2 !py-0 !leading-none !h-[18px] !flex !items-center shrink-0"
                      >
                        {statusLabels[brd.status] || brd.status}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                      {brd.clientName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {brd.clientName}
                        </span>
                      )}
                      {brd.documentIds.length > 0 && (
                        <span>{brd.documentIds.length} document{brd.documentIds.length !== 1 ? "s" : ""}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(brd.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {brd.status === "completed" && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    {brd.status === "generating" && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Drawer
        title="Generate AI Business Requirements Document"
        width={680}
        open={drawerOpen}
        onClose={() => { if (!generating) setDrawerOpen(false); }}
        destroyOnClose
      >
        <BRDGenerationForm
          clients={clients}
          clientsLoading={clientsMeta.isLoading}
          onSubmit={handleGenerate}
          loading={generating}
        />
      </Drawer>
    </div>
  );
}
