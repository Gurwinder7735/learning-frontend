"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag, Tabs, Space, Typography, Spin, Modal, Form, Input as AntInput, Select, Drawer, message } from "antd";
import { ArrowLeft, FileText, Edit3, Save, Trash2, Copy, Loader2, CheckCircle, XCircle, PenLine, Send, ShieldCheck, Download } from "lucide-react";
import { MarkdownRenderer } from "@/components/features/ProposalIntelligence/MarkdownRenderer";
import { AgentExecutionPanel } from "@/components/features/ProposalIntelligence/AgentExecutionPanel";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  fetchProposalDetailRequest, clearProposalDetail, updateProposalRequest, deleteProposalRequest,
} from "@/store/modules/proposals/proposalsSlice";
import {
  selectProposalDetail,
} from "@/store/modules/proposals/proposalsSelectors";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { selectClients } from "@/store/modules/clients/clientsSelectors";
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import { storage } from "@/lib/utils/storage";
import type { SignatureStatus } from "@/types/models/Proposal";

const statusColors: Record<string, string> = {
  draft: "default", internal_review: "blue", sent: "purple",
  client_review: "orange", approved: "green", rejected: "red", archived: "default",
};
const statusLabels: Record<string, string> = {
  draft: "Draft", internal_review: "Internal Review", sent: "Sent",
  client_review: "Client Review", approved: "Approved", rejected: "Rejected", archived: "Archived",
};

const AGENTS_META = [
  { agentName: "business_analyst", displayName: "Business Analyst", outputFile: "business-analysis.md", tab: "Business Analysis" },
  { agentName: "solution_architect", displayName: "Solution Architect", outputFile: "architecture.md", tab: "Architecture" },
  { agentName: "estimator", displayName: "Technical Estimator", outputFile: "estimation.md", tab: "Estimation" },
  { agentName: "project_manager", displayName: "Project Manager", outputFile: "project-plan.md", tab: "Project Plan" },
  { agentName: "commercial", displayName: "Commercial Agent", outputFile: "commercials.md", tab: "Commercials" },
  { agentName: "composer", displayName: "Proposal Composer", outputFile: "proposal.md", tab: "Proposal" },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AgentStatus = "pending" | "running" | "completed" | "failed";

interface LiveAgent {
  agentName: string;
  displayName: string;
  status: AgentStatus;
  content?: string;
  error?: string;
}

const INITIAL_AGENTS: LiveAgent[] = [
  { agentName: "business_analyst", displayName: "Business Analyst", status: "pending" },
  { agentName: "solution_architect", displayName: "Solution Architect", status: "pending" },
  { agentName: "estimator", displayName: "Technical Estimator", status: "pending" },
  { agentName: "project_manager", displayName: "Project Manager", status: "pending" },
  { agentName: "commercial", displayName: "Commercial Agent", status: "pending" },
  { agentName: "composer", displayName: "Proposal Composer", status: "pending" },
];

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectProposalDetail);
  const clients = useAppSelector(selectClients);

  const proposalId = params.proposalId as string;
  const proposal = detail?.proposal ?? null;

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editForm] = Form.useForm();

  const [aiContent, setAiContent] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [editFile, setEditFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [liveAgents, setLiveAgents] = useState<LiveAgent[]>(INITIAL_AGENTS);
  const [liveStream, setLiveStream] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [signatureStatus, setSignatureStatus] = useState<SignatureStatus | null>(null);
  const [signSending, setSignSending] = useState(false);
  const [internalSigning, setInternalSigning] = useState(false);

  const fetchSignatureStatus = async () => {
    try {
      const token = storage.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.proposals.signatureStatus(proposalId)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setSignatureStatus(json.data);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (proposalId) fetchSignatureStatus();
  }, [proposalId]);

  const handleSendForSigning = async () => {
    setSignSending(true);
    try {
      const token = storage.getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.proposals.sendForSigning(proposalId)}`, { method: "POST", headers });
      if (!res.ok) throw new Error("Failed");
      message.success("Proposal sent for signing");
      await fetchSignatureStatus();
    } catch {
      message.error("Failed to send for signing");
    } finally {
      setSignSending(false);
    }
  };

  const handleSignInternal = async () => {
    setInternalSigning(true);
    try {
      const token = storage.getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.proposals.signInternal(proposalId)}`, {
        method: "POST", headers, body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) throw new Error("Failed");
      message.success("You have signed this proposal");
      await fetchSignatureStatus();
    } catch {
      message.error("Failed to sign");
    } finally {
      setInternalSigning(false);
    }
  };

  useEffect(() => {
    if (proposalId) dispatch(fetchProposalDetailRequest(proposalId));
    return () => { dispatch(clearProposalDetail()); };
  }, [proposalId, dispatch]);

  useEffect(() => {
    dispatch(fetchClientsRequest({ limit: 200 }));
  }, [dispatch]);

  useEffect(() => {
    if (!proposal?.isAiGenerated || !proposal?.proposalJobId) {
      setAiContent({});
      setJobStatus(null);
      return;
    }

    setLiveAgents(INITIAL_AGENTS);
    setLiveStream({});

    let cancelled = false;

    const poll = async () => {
      try {
        const token = storage.getAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/api/v1/proposal-intelligence/jobs/by-proposal/${proposalId}`, { headers });
        if (!res.ok) { setJobStatus("failed"); return; }
        const json = await res.json();
        const jobData = json.data;

        if (jobData.status === "running" || jobData.status === "pending") {
          setJobStatus(jobData.status);
          const updatedAgents = [...INITIAL_AGENTS];
          for (const run of (jobData.agentRuns || []) as Array<{ agentName: string; status: string; content?: string; error?: string }>) {
            const idx = updatedAgents.findIndex((a) => a.agentName === run.agentName);
            if (idx !== -1) {
              updatedAgents[idx] = { ...updatedAgents[idx], status: run.status as AgentStatus, content: run.content, error: run.error };
            }
          }
          setLiveAgents(updatedAgents);
          if (!cancelled) { pollTimerRef.current = setTimeout(poll, 3000); }
        } else if (jobData.status === "completed") {
          setJobStatus("completed");
          await loadAiContent(jobData, headers);
        } else {
          setJobStatus("failed");
        }
      } catch { setJobStatus("failed"); }
    };

    poll();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      abortRef.current?.abort(); // eslint-disable-line react-hooks/exhaustive-deps
    };
  }, [proposal?.isAiGenerated, proposal?.proposalJobId, proposalId]);

  const loadAiContent = async (jobData: Record<string, unknown>, headers: Record<string, string>) => {
    setAiLoading(true);
    try {
      const fileMap: Record<string, string> = {};
      for (const meta of AGENTS_META) {
        const run = ((jobData.agentRuns || []) as Array<Record<string, unknown>>).find((r) => r.agentName === meta.agentName);
        if (run?.content) {
          fileMap[meta.tab] = run.content as string;
        } else {
          try {
            const fileRes = await fetch(`${API_BASE_URL}/api/v1/proposal-intelligence/jobs/${jobData.id}/files/${meta.outputFile}`, { headers });
            if (fileRes.ok) {
              const fileJson = await fileRes.json();
              if (fileJson.data?.content) {
                fileMap[meta.tab] = fileJson.data.content;
              }
            }
          } catch { /* file not available */ }
        }
      }
      if (jobData.inputText) {
        fileMap["Raw Input"] = jobData.inputText as string;
      }
      setAiContent(fileMap);
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  };

  const handleEdit = (tab: string) => {
    setEditFile(tab);
    setEditContent(aiContent[tab] || "");
  };

  const handleSaveEdit = () => {
    if (!editFile) return;
    setAiContent((prev) => ({ ...prev, [editFile]: editContent }));
    setEditFile(null);
  };

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      const data: Record<string, unknown> = {};
      if (values.name) data.name = values.name;
      if (values.clientId !== undefined) data.clientId = values.clientId;
      if (values.projectName !== undefined) data.projectName = values.projectName;
      if (values.status) data.status = values.status;
      if (values.budget !== undefined) {
        data.pricing = {
          type: "fixed",
          cost: Number(values.budget),
        };
      }
      dispatch(updateProposalRequest({ id: proposalId, data }));
      setEditDrawerOpen(false);
    } catch {}
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete proposal", content: `Delete "${proposal?.name}"?`,
      okText: "Delete", okButtonProps: { danger: true },
      onOk: () => { dispatch(deleteProposalRequest(proposalId)); router.push(APP_ROUTES.proposals); },
    });
  };

  const handleStatusChange = (status: string) => {
    dispatch(updateProposalRequest({ id: proposalId, data: { status } }));
  };

  const copyShareLink = () => {
    if (proposal?.shareToken) {
      navigator.clipboard.writeText(`${window.location.origin}/proposals/share/${proposal.shareToken}`);
    }
  };

  const handleDownloadPdf = async () => {
    const token = storage.getAccessToken();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${API_ENDPOINTS.proposals.downloadPdf(proposalId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${proposalId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error("Failed to download PDF");
    }
  };

  if (!proposal) {
    return <div className="flex justify-center items-center py-32"><Spin size="large" /></div>;
  }

  const aiTabItems = AGENTS_META.filter((meta) => aiContent[meta.tab]).map((meta) => ({
    key: meta.tab,
    label: meta.tab,
    children: (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Typography.Text className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
            {meta.outputFile}
          </Typography.Text>
          <Space>
            {editFile === meta.tab ? (
              <>
                <Button size="small" onClick={() => setEditFile(null)}>Cancel</Button>
                <Button size="small" type="primary" icon={<Save className="w-3 h-3" />} onClick={handleSaveEdit}>Save</Button>
              </>
            ) : (
              <Button size="small" icon={<Edit3 className="w-3 h-3" />} onClick={() => handleEdit(meta.tab)}>Edit</Button>
            )}
          </Space>
        </div>
        {editFile === meta.tab ? (
          <AntInput.TextArea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={30}
            className="font-mono text-sm"
          />
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <MarkdownRenderer content={aiContent[meta.tab] || ""} />
          </div>
        )}
      </div>
    ),
  }));

  if (aiContent["Raw Input"]) {
    aiTabItems.push({
      key: "Raw Input",
      label: "Raw Input",
      children: (
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6">
          <pre className="text-sm text-zinc-700 whitespace-pre-wrap font-mono">{aiContent["Raw Input"]}</pre>
        </div>
      ),
    });
  }

  const showAiTabs = Object.keys(aiContent).length > 0;
  const tabItems = showAiTabs ? aiTabItems : [];
  const defaultTab = showAiTabs ? "Proposal" : undefined;

  return (
    <div>
      <div className="mb-6">
        <Button type="text" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push(APP_ROUTES.proposals)} className="!text-zinc-500 hover:!text-zinc-900 !-ml-2 mb-2">Back to Proposals</Button>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7 text-zinc-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Typography.Title level={3} className="!mb-0 !text-2xl !leading-tight">{proposal.name}</Typography.Title>
                <Tag color={statusColors[proposal.status] || "default"} className="!rounded-full !px-3 !py-0.5 !text-xs whitespace-nowrap shrink-0">{statusLabels[proposal.status] || proposal.status}</Tag>
                <Tag className="!rounded-full !px-2 !py-0 !text-xs whitespace-nowrap shrink-0">v{proposal.version}</Tag>
                {proposal.isAiGenerated && <Tag color="purple" className="!rounded-full !px-2 !py-0 !text-xs !border-purple-200 !bg-purple-50 !text-purple-700 whitespace-nowrap shrink-0">AI Generated</Tag>}
                {signatureStatus?.signingStatus === "fully_signed" && (
                  <Tag color="green" className="!rounded-full !px-2 !py-0 !text-xs whitespace-nowrap !inline-flex !items-center !gap-1 shrink-0">
                    <CheckCircle className="w-3 h-3 shrink-0" /> Fully Signed
                  </Tag>
                )}
                {signatureStatus?.signingStatus === "declined" && (
                  <Tag color="red" className="!rounded-full !px-2 !py-0 !text-xs whitespace-nowrap !inline-flex !items-center !gap-1 shrink-0">
                    <XCircle className="w-3 h-3 shrink-0" /> Declined
                  </Tag>
                )}
                {(proposal.isAiGenerated && (jobStatus === "running" || jobStatus === "pending")) && (
                  <Tag color="processing" className="!rounded-full !px-2 !py-0 !text-xs whitespace-nowrap shrink-0">Generating...</Tag>
                )}
              </div>
              <Typography.Text className="text-zinc-500 text-sm block mt-1">
                {proposal.clientName && <>{proposal.clientName} &middot; </>}
                {proposal.projectName && <>Project: {proposal.projectName} &middot; </>}
                Updated {new Date(proposal.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </Typography.Text>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Select value={proposal.status} onChange={handleStatusChange} style={{ width: 150 }}
              options={[
                { value: "draft", label: "Draft" }, { value: "internal_review", label: "Internal Review" },
                { value: "sent", label: "Sent" }, { value: "client_review", label: "Client Review" },
                { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" },
                { value: "archived", label: "Archived" },
              ]} />
            {proposal.shareToken && (
              <Button icon={<Copy className="w-4 h-4" />} onClick={copyShareLink}>Copy Share Link</Button>
            )}
            <Button icon={<Download className="w-4 h-4" />} onClick={handleDownloadPdf}>Download PDF</Button>
            <Button icon={<Edit3 className="w-4 h-4" />} onClick={() => {
              editForm.setFieldsValue({ ...proposal, budget: proposal.pricing?.cost });
              setEditDrawerOpen(true);
            }}>Edit</Button>
            <Button danger icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </div>

      {signatureStatus && (
        <div className="mb-6 bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zinc-500" />
              <Typography.Text className="text-sm font-semibold text-zinc-700">Signature Status</Typography.Text>
            </div>
            <Tag color={
              signatureStatus.signingStatus === "fully_signed" ? "green" :
              signatureStatus.signingStatus === "declined" ? "red" :
              signatureStatus.signingStatus === "awaiting_client" ? "orange" :
              signatureStatus.signingStatus === "partially_signed" ? "purple" : "default"
            } className="!rounded-full !px-3 !py-0.5">
              {signatureStatus.signingStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Tag>
          </div>
          {signatureStatus.signatures.length > 0 && (
            <div className="space-y-2 mb-3">
              {signatureStatus.signatures.map((sig, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <Typography.Text className="text-zinc-700">
                    <strong>{sig.signerName}</strong> ({sig.role === "client" ? "Client" : "Internal"})
                  </Typography.Text>
                  <Typography.Text className="text-zinc-400 text-xs">
                    {new Date(sig.signedAt).toLocaleDateString()}
                  </Typography.Text>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            {signatureStatus.nextExpectedSigner === "send_for_signing" && (
              <Button size="small" type="primary" icon={<Send className="w-3 h-3" />} loading={signSending} onClick={handleSendForSigning}>
                Send for Signing
              </Button>
            )}
            {signatureStatus.nextExpectedSigner === "internal" && (
              <Button size="small" type="primary" icon={<PenLine className="w-3 h-3" />} loading={internalSigning} onClick={handleSignInternal}>
                Sign as Internal
              </Button>
            )}
            {signatureStatus.nextExpectedSigner === "client" && proposal.shareToken && (
              <Button size="small" icon={<Copy className="w-3 h-3" />} onClick={copyShareLink}>
                Copy Share Link
              </Button>
            )}
          </div>
        </div>
      )}

      {proposal.isAiGenerated && jobStatus === "running" ? (
        <div className="max-w-2xl mx-auto py-8">
          <div className="flex items-center gap-3 mb-6">
            <Loader2 className="w-5 h-5 text-zinc-800 animate-spin" />
            <Typography.Text className="text-lg font-medium text-zinc-700">Generating proposal...</Typography.Text>
          </div>
          <AgentExecutionPanel agents={liveAgents} currentStream={liveStream} />
        </div>
      ) : proposal.isAiGenerated && jobStatus === "pending" ? (
        <div className="flex justify-center items-center py-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-zinc-800 animate-spin mx-auto mb-4" />
            <Typography.Text className="text-zinc-500">Starting generation...</Typography.Text>
          </div>
        </div>
      ) : proposal.isAiGenerated && aiLoading ? (
        <div className="flex justify-center items-center py-32"><Spin size="large" /></div>
      ) : (
        <Tabs defaultActiveKey={defaultTab} items={tabItems} />
      )}

      <Drawer title="Edit Proposal" width={480} open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)}
        footer={<Space className="w-full justify-end"><Button onClick={() => setEditDrawerOpen(false)}>Cancel</Button><Button type="primary" onClick={handleUpdate}>Save Changes</Button></Space>}
        destroyOnClose>
        <Form form={editForm} layout="vertical" className="max-w-full">
          <Typography.Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-3">General Information</Typography.Text>
          <Form.Item name="name" label="Proposal Name" rules={[{ required: true, message: "Required" }]}><AntInput /></Form.Item>
          <Form.Item name="clientId" label="Client">
            <Select showSearch allowClear
              filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              options={clients.map((c) => ({ value: c.id, label: c.companyName }))} />
          </Form.Item>
          <Form.Item name="projectName" label="Project Name"><AntInput /></Form.Item>

          <Typography.Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-3 mt-6">Pricing</Typography.Text>
          <Form.Item name="budget" label="Budget"><AntInput type="number" prefix="$" /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
