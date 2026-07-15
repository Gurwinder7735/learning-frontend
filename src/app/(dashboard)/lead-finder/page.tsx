"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Drawer, Typography } from "antd";
import { Target, Plus } from "lucide-react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  jobStarted,
  jobDone,
  jobError,
  leadFound,
  setCurrentJob,
  setAllLeads,
  setAllLeadsLoading,
  setAllLeadsPage,
  setImporting,
  markLeadsImported,
  setError,
} from "@/store/modules/aiLeadFinder/aiLeadFinderSlice";
import { storage } from "@/lib/utils/storage";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiRequest } from "@/lib/api/axiosInstance";
import {
  LeadFinderForm,
  ActiveJobBanner,
  FoundLeadsTable,
} from "@/components/features/AILeadFinder";
import type {
  FoundLead,
  LeadFinderJob,
  LogEntry,
} from "@/store/modules/aiLeadFinder/aiLeadFinderTypes";

const { Text } = Typography;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const PAGE_SIZE = 50;
const LOG_FLUSH_MS = 250;   // how often to push buffered logs to the UI
const LOG_MAX = 600;        // cap the log array to avoid memory growth

let _logId = 0;
function mkLog(message: string, type: LogEntry["type"] = "info"): LogEntry {
  return { id: String(++_logId), message, type, timestamp: new Date().toISOString() };
}

export default function LeadFinderPage() {
  const dispatch    = useAppDispatch();
  const currentJob  = useAppSelector((s) => s.aiLeadFinder.currentJob);
  const isRunning   = useAppSelector((s) => s.aiLeadFinder.isRunning);
  const error       = useAppSelector((s) => s.aiLeadFinder.error);
  const isImporting = useAppSelector((s) => s.aiLeadFinder.isImporting);
  const allLeads    = useAppSelector((s) => s.aiLeadFinder.allLeads);
  const allTotal    = useAppSelector((s) => s.aiLeadFinder.allLeadsTotal);
  const allPage     = useAppSelector((s) => s.aiLeadFinder.allLeadsPage);
  const allLoading  = useAppSelector((s) => s.aiLeadFinder.allLeadsLoading);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // ── Log buffering (intentionally NOT in Redux) ─────────────────────────────
  // Raw buffer written by SSE handler — no React state updates per token.
  const logBufRef = useRef<LogEntry[]>([]);
  // Rendered snapshot — updated every LOG_FLUSH_MS by the interval below.
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const pushLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    logBufRef.current.push(mkLog(message, type));
    if (logBufRef.current.length > LOG_MAX) {
      logBufRef.current = logBufRef.current.slice(-LOG_MAX);
    }
  }, []);

  const clearLogs = useCallback(() => {
    logBufRef.current = [];
    setLogs([]);
  }, []);

  // Flush buffer to state every LOG_FLUSH_MS so the UI stays responsive.
  useEffect(() => {
    const id = setInterval(() => {
      if (logBufRef.current.length !== logs.length) {
        setLogs([...logBufRef.current]);
      }
    }, LOG_FLUSH_MS);
    return () => clearInterval(id);
  }, [logs.length]);

  // ── SSE ref + cleanup ─────────────────────────────────────────────────────
  const esRef = useRef<EventSource | null>(null);
  const stopSSE = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);
  useEffect(() => () => stopSSE(), [stopSSE]);

  // ── Load global leads database ─────────────────────────────────────────────
  const loadAllLeads = useCallback(async (page: number) => {
    dispatch(setAllLeadsLoading(true));
    try {
      const skip = (page - 1) * PAGE_SIZE;
      const res = await apiRequest<{ data: { leads: FoundLead[]; total: number } }>({
        method: "GET",
        url: `${API_ENDPOINTS.aiLeadFinder.allLeads}?skip=${skip}&limit=${PAGE_SIZE}`,
      });
      dispatch(setAllLeads({
        leads: res.data.leads ?? [],
        total: res.data.total ?? 0,
        page,
      }));
    } catch { /* ignore */ }
    finally { dispatch(setAllLeadsLoading(false)); }
  }, [dispatch]);

  // ── SSE connection ─────────────────────────────────────────────────────────
  const connectSSE = useCallback(
    (jobId: string) => {
      stopSSE();
      const token = storage.getAccessToken();
      const url =
        `${API_BASE_URL}${API_ENDPOINTS.aiLeadFinder.stream(jobId)}` +
        (token ? `?token=${token}` : "");

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (ev) => {
        try {
          const { type, data } = JSON.parse(ev.data) as {
            type: string;
            data: Record<string, unknown>;
          };

          if (type === "log") {
            // Write directly to ref buffer — ZERO React/Redux state update per token
            pushLog(String(data.message ?? ""), "info");

          } else if (type === "tool_call") {
            pushLog(`🔧 ${data.tool ?? ""}`, "tool");

          } else if (type === "lead_found") {
            pushLog(
              `Lead found: ${data.companyName}${data.email ? ` (${data.email})` : ""}`,
              "lead"
            );
            // leadFound goes to Redux (rare — once per actual lead)
            dispatch(leadFound({
              id:              String(data.id ?? ""),
              jobId:           String(data.jobId ?? jobId),
              companyName:     String(data.companyName ?? ""),
              website:         (data.website as string) || null,
              email:           (data.email as string) || null,
              phone:           (data.phone as string) || null,
              contactPerson:   (data.contactPerson as string) || null,
              linkedinUrl:     (data.linkedinUrl as string) || null,
              industry:        (data.industry as string) || null,
              country:         (data.country as string) || null,
              sourceUrl:       (data.sourceUrl as string) || null,
              confidenceNotes: (data.confidenceNotes as string) || null,
              imported:        false,
              importedLeadId:  null,
              createdAt:       new Date().toISOString(),
            } satisfies FoundLead));

          } else if (type === "done") {
            dispatch(jobDone({
              status: String(data.status ?? "completed"),
              leadsFoundCount: Number(data.leadsFoundCount ?? 0),
            }));
            pushLog(
              `Search ${data.status === "stopped" ? "stopped" : "completed"} — ${data.leadsFoundCount ?? 0} lead(s) found.`,
              "info"
            );
            // Force immediate final flush
            setLogs([...logBufRef.current]);
            stopSSE();

          } else if (type === "error") {
            dispatch(jobError(String(data.message ?? "Unknown error")));
            pushLog(String(data.message ?? "Error"), "error");
            setLogs([...logBufRef.current]);
            stopSSE();
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        pushLog("Connection lost — results saved.", "error");
        setLogs([...logBufRef.current]);
        stopSSE();
      };
    },
    [dispatch, pushLog, stopSSE]
  );

  // ── On mount: load DB + check for running job ──────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function init() {
      await loadAllLeads(1);
      if (!mounted) return;
      try {
        const res = await apiRequest<{ data: LeadFinderJob[] }>({
          method: "GET",
          url: `${API_ENDPOINTS.aiLeadFinder.jobs}?status=running&limit=1`,
        });
        if (!mounted) return;
        const running = res.data?.[0];
        if (running) {
          dispatch(setCurrentJob(running));
          connectSSE(running.id);
        }
      } catch { /* no running job */ }
    }
    init();
    return () => { mounted = false; stopSSE(); };
  }, [dispatch, connectSSE, stopSSE, loadAllLeads]);

  // ── Page change ────────────────────────────────────────────────────────────
  const handlePageChange = useCallback((page: number) => {
    dispatch(setAllLeadsPage(page));
    loadAllLeads(page);
  }, [dispatch, loadAllLeads]);

  // ── Start job ─────────────────────────────────────────────────────────────
  const handleStart = useCallback(
    async (values: {
      targetCountry: string;
      targetIndustry: string;
      serviceOffered: string;
      leadsRequested: number;
    }) => {
      setIsStarting(true);
      dispatch(setError(null));
      clearLogs();
      try {
        const res = await apiRequest<{ data: LeadFinderJob }>({
          method: "POST",
          url: API_ENDPOINTS.aiLeadFinder.jobs,
          data: {
            target_country:  values.targetCountry,
            target_industry: values.targetIndustry,
            service_offered: values.serviceOffered,
            leads_requested: values.leadsRequested,
          },
        });
        dispatch(jobStarted(res.data));
        pushLog(`Search started — looking for ${res.data.leadsRequested} leads in ${res.data.targetCountry} · ${res.data.targetIndustry}`, "info");
        setDrawerOpen(false);
        connectSSE(res.data.id);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to start job";
        dispatch(setError(msg));
      } finally {
        setIsStarting(false);
      }
    },
    [dispatch, connectSSE, clearLogs, pushLog]
  );

  // ── Stop job ──────────────────────────────────────────────────────────────
  const handleStop = useCallback(async () => {
    if (!currentJob) return;
    setIsStopping(true);
    try {
      await apiRequest({
        method: "POST",
        url: API_ENDPOINTS.aiLeadFinder.stopJob(currentJob.id),
      });
      pushLog("Stop signal sent…", "info");
    } catch { /* ignore */ }
    finally { setIsStopping(false); }
  }, [currentJob, pushLog]);

  // ── Import leads ──────────────────────────────────────────────────────────
  const handleImport = useCallback(
    async (leadIds: string[]) => {
      dispatch(setImporting(true));
      try {
        await apiRequest({
          method: "POST",
          url: API_ENDPOINTS.aiLeadFinder.importGlobal,
          data: { lead_ids: leadIds },
        });
        dispatch(markLeadsImported(leadIds));
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Import failed";
        dispatch(setError(msg));
      } finally {
        dispatch(setImporting(false));
      }
    },
    [dispatch]
  );

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#18181b" }}
          >
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 leading-tight">AI Lead Finder</h1>
            <Text style={{ fontSize: 13, color: "#71717a" }}>
              Browse the web · collect B2B leads · import to pipeline
            </Text>
          </div>
        </div>

        <Button
          type="primary"
          icon={<Plus className="w-4 h-4" />}
          disabled={isRunning}
          onClick={() => setDrawerOpen(true)}
          style={{
            background: "#18181b",
            borderColor: "#18181b",
            fontWeight: 600,
            borderRadius: 10,
          }}
        >
          {isRunning ? "Search running…" : "Find Leads"}
        </Button>
      </div>

      {/* ── Error alert ──────────────────────────────────────────────────────── */}
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => dispatch(setError(null))}
          style={{ borderRadius: 10 }}
        />
      )}

      {/* ── Active job banner (collapsible) ──────────────────────────────────── */}
      <ActiveJobBanner logs={logs} onStop={handleStop} isStopping={isStopping} />

      {/* ── Persistent Lead Database table ───────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <FoundLeadsTable
          leads={allLeads}
          total={allTotal}
          page={allPage}
          pageSize={PAGE_SIZE}
          loading={allLoading}
          onImport={handleImport}
          onPageChange={handlePageChange}
          isImporting={isImporting}
        />
      </div>

      {/* ── Find Leads drawer ─────────────────────────────────────────────────── */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "#18181b" }}
            >
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-zinc-900">New Lead Search</span>
          </div>
        }
        placement="right"
        width={460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { padding: "24px" } }}
        footer={null}
      >
        <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
          Describe your target audience and the agent will browse the web,
          generate search queries, visit company pages, and extract contact info.
          Leads appear live in the database table.
        </p>
        <LeadFinderForm onSubmit={handleStart} loading={isStarting} />
      </Drawer>
    </div>
  );
}
