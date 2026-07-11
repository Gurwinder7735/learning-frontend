"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Button, Tag, Tabs, Space, Typography, Spin, Modal, Form, Input as AntInput, Select, DatePicker, Drawer, message, Divider, List, Checkbox } from "antd";
import { ArrowLeft, Calendar, Edit3, Trash2, Video, ExternalLink, Clock, Users, CheckCircle, Sparkles, X } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import MeetingTranscriptTab from "@/components/meetings/MeetingTranscriptTab";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  fetchMeetingDetailRequest, updateMeetingRequest, deleteMeetingRequest,
  addDecisionRequest, addActionItemRequest, updateActionItemRequest, deleteActionItemRequest,
  deleteDecisionRequest, updateDecisionRequest, generateSummaryRequest,
  clearMeetingDetail, fetchGoogleStatusRequest,
} from "@/store/modules/meetings/meetingsSlice";
import {
  selectMeetingDetail, selectMeetingDetailLoading, selectGoogleConnected,
} from "@/store/modules/meetings/meetingsSelectors";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { storage } from "@/lib/utils/storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Human-friendly labels for the four summary agents. Used in the streaming
 * progress panel — the SSE stream emits ``agentName`` values which we look
 * up here to render a nice display string.
 */
const AGENT_LABELS: Record<string, string> = {
  transcript_cleaner: "Cleaning transcript",
  summary_composer: "Composing summary",
  decisions_extractor: "Extracting decisions",
  action_items_extractor: "Extracting action items",
};
const AGENT_ORDER = [
  "transcript_cleaner",
  "summary_composer",
  "decisions_extractor",
  "action_items_extractor",
];

const statusColors: Record<string, string> = {
  scheduled: "blue", completed: "green", cancelled: "red",
};

const typeLabels: Record<string, string> = {
  client_meeting: "Client Meeting", internal: "Internal", discovery: "Discovery",
  review: "Review", kickoff: "Kickoff", other: "Other",
};

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectMeetingDetail);
  const loading = useAppSelector(selectMeetingDetailLoading);
  const googleConnected = useAppSelector(selectGoogleConnected);

  const meetingId = params.meetingId as string;
  const meeting = detail?.meeting ?? null;

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [decisionText, setDecisionText] = useState("");
  const [actionTitle, setActionTitle] = useState("");

  // AI summary streaming state — orthogonal to Redux because per-token
  // updates would flood the store. Only the final result (via detail refetch)
  // ends up in Redux.
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, "pending" | "running" | "completed" | "failed">>({});
  const esRef = useRef<EventSource | null>(null);

  // Inline decision editing. Only one decision can be in edit-mode at a
  // time; ``editingDecisionId`` holds the id, ``editingDecisionText``
  // buffers the draft HTML until Save.
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [editingDecisionText, setEditingDecisionText] = useState("");

  // Action item edit modal.
  const [editingActionItemId, setEditingActionItemId] = useState<string | null>(null);
  const [actionItemForm] = Form.useForm();

  useEffect(() => {
    if (meetingId) dispatch(fetchMeetingDetailRequest(meetingId));
    dispatch(fetchGoogleStatusRequest());
    return () => {
      dispatch(clearMeetingDetail());
      esRef.current?.close();
    };
  }, [meetingId, dispatch]);

  /** Open an SSE stream and drive the agent-status UI. Refetches the meeting
   * on `done` so the newly-created decisions / action items / summary land in
   * the current view without a manual reload. */
  const subscribeToJob = (jobId: string) => {
    const token = storage.getAccessToken();
    if (!token) {
      message.error("Sign in expired. Please refresh and try again.");
      return;
    }
    esRef.current?.close();
    const url = `${API_BASE_URL}${API_ENDPOINTS.meetings.summaryJobStream(jobId)}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    setIsGenerating(true);
    setAgentStatuses(Object.fromEntries(AGENT_ORDER.map((n) => [n, "pending"])) as Record<string, "pending">);
    setCurrentAgent(null);

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { type, data } = payload;
        if (type === "agent_start") {
          setCurrentAgent(data.agentName);
          setAgentStatuses((prev) => ({ ...prev, [data.agentName]: "running" }));
        } else if (type === "agent_complete") {
          setAgentStatuses((prev) => ({ ...prev, [data.agentName]: "completed" }));
          setCurrentAgent(null);
        } else if (type === "agent_error") {
          setAgentStatuses((prev) => ({ ...prev, [data.agentName]: "failed" }));
        } else if (type === "done") {
          es.close();
          setIsGenerating(false);
          setCurrentAgent(null);
          message.success(
            `Summary generated: ${data.decisionsAdded ?? 0} decisions, ${data.actionItemsAdded ?? 0} action items.`,
          );
          dispatch(fetchMeetingDetailRequest(meetingId));
        } else if (type === "error") {
          es.close();
          setIsGenerating(false);
          setCurrentAgent(null);
          message.error("Summary generation failed: " + (data?.message ?? "Unknown error"));
        }
      } catch {
        /* ignore token / parse noise */
      }
    };
    es.onerror = () => {
      es.close();
      setIsGenerating(false);
      setCurrentAgent(null);
    };
  };

  const handleGenerateSummary = async () => {
    // POST directly (not via Redux) so we can pipe the returned jobId into
    // the SSE subscription. Using Redux for this would need a saga side-
    // channel; going direct here is simpler and matches the Agreements flow.
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.meetings.generateSummary(meetingId)}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `Request failed (${res.status})`);
      }
      const json = await res.json();
      const jobId: string | undefined = json?.data?.jobId;
      if (!jobId) throw new Error("Missing jobId in response");
      message.info("Generating summary — this usually takes 20–60 seconds.");
      subscribeToJob(jobId);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to start generation");
    }
  };

  const handleDeleteDecision = (decisionId: string) => {
    Modal.confirm({
      title: "Delete this decision?",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => dispatch(deleteDecisionRequest({ meetingId, decisionId })),
    });
  };

  const handleStartEditDecision = (id: string, text: string) => {
    setEditingDecisionId(id);
    setEditingDecisionText(text);
  };

  const handleCancelEditDecision = () => {
    setEditingDecisionId(null);
    setEditingDecisionText("");
  };

  const handleSaveDecision = () => {
    if (!editingDecisionId || !editingDecisionText.trim() || editingDecisionText === "<p></p>") return;
    dispatch(updateDecisionRequest({
      meetingId,
      decisionId: editingDecisionId,
      decision: editingDecisionText,
    }));
    setEditingDecisionId(null);
    setEditingDecisionText("");
  };

  const handleOpenActionItemEdit = (item: {
    id: string; title: string; owner?: string | null; dueDate?: string | null; status: string;
  }) => {
    setEditingActionItemId(item.id);
    actionItemForm.setFieldsValue({
      title: item.title,
      owner: item.owner ?? "",
      dueDate: item.dueDate ? dayjs(item.dueDate) : null,
      status: item.status,
    });
  };

  const handleSaveActionItem = async () => {
    if (!editingActionItemId) return;
    try {
      const values = await actionItemForm.validateFields();
      dispatch(updateActionItemRequest({
        meetingId,
        itemId: editingActionItemId,
        data: {
          title: values.title,
          // Send null explicitly when the user cleared the field so the
          // backend clears it too.
          owner: values.owner ? values.owner : null,
          dueDate: values.dueDate ? values.dueDate.toISOString() : null,
          status: values.status,
        },
      }));
      setEditingActionItemId(null);
    } catch {
      /* validation error already surfaces via antd */
    }
  };

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      const data: Record<string, unknown> = {};
      if (values.title) data.title = values.title;
      if (values.meetingType) data.meetingType = values.meetingType;
      if (values.status) data.status = values.status;
      if (values.summary !== undefined) data.summary = values.summary;
      if (values.meetingDate) data.meetingDate = values.meetingDate.toISOString();
      if (values.durationMinutes) data.durationMinutes = values.durationMinutes;
      if (values.attendees !== undefined) {
        data.attendees = values.attendees || [];
      }
      if (values.location !== undefined) data.location = values.location;
      dispatch(updateMeetingRequest({ id: meetingId, data }));
      setEditDrawerOpen(false);
    } catch {}
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete meeting", content: `Delete "${meeting?.title}"?`,
      okText: "Delete", okButtonProps: { danger: true },
      onOk: () => { dispatch(deleteMeetingRequest(meetingId)); router.push(APP_ROUTES.meetings); },
    });
  };

  const handleStatusChange = (status: string) => {
    dispatch(updateMeetingRequest({ id: meetingId, data: { status } }));
  };

  const handleAddDecision = () => {
    if (!decisionText.trim()) return;
    dispatch(addDecisionRequest({ meetingId, decision: decisionText.trim() }));
    setDecisionText("");
  };

  const handleAddActionItem = () => {
    if (!actionTitle.trim()) return;
    dispatch(addActionItemRequest({ meetingId, title: actionTitle.trim() }));
    setActionTitle("");
  };

  const handleToggleActionItem = (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    dispatch(updateActionItemRequest({ meetingId, itemId, data: { status: newStatus } }));
  };

  const handleDeleteActionItem = (itemId: string) => {
    dispatch(deleteActionItemRequest({ meetingId, itemId }));
  };

  if (loading || !meeting) {
    return <div className="flex justify-center items-center py-32"><Spin size="large" /></div>;
  }

  const tabItems = [
    {
      key: "overview",
      label: "Overview",
      children: (
        <div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-zinc-400" />
              <div>
                <Typography.Text className="text-sm text-zinc-500">Date & Time</Typography.Text>
                <Typography.Text className="block font-medium">
                  {new Date(meeting.meetingDate).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </Typography.Text>
              </div>
            </div>
            {meeting.durationMinutes && (
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-zinc-400" />
                <div>
                  <Typography.Text className="text-sm text-zinc-500">Duration</Typography.Text>
                  <Typography.Text className="block font-medium">{meeting.durationMinutes} minutes</Typography.Text>
                </div>
              </div>
            )}
            {meeting.attendees && meeting.attendees.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-zinc-400" />
                <div>
                  <Typography.Text className="text-sm text-zinc-500">Attendees</Typography.Text>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {meeting.attendees.map((email, i) => (
                      <Tag key={i} className="!rounded-full">{email}</Tag>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {meeting.location && (
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-zinc-400" />
                <div>
                  <Typography.Text className="text-sm text-zinc-500">Location</Typography.Text>
                  <Typography.Text className="block font-medium">{meeting.location}</Typography.Text>
                </div>
              </div>
            )}
          </div>

          {/* Manual summary — set at meeting creation / edited via the Edit
              drawer. AI content lives in the dedicated "AI Summary" tab so
              the two don't collide here. */}
          {meeting.summary && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6">
              <Typography.Text className="text-sm font-semibold text-zinc-700 block mb-2">Summary</Typography.Text>
              <div
                className="prose prose-zinc prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: meeting.summary }}
              />
            </div>
          )}

          {meeting.meetLink && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-zinc-800" />
                  <Typography.Text strong className="text-zinc-900">Google Meet Link</Typography.Text>
                </div>
                <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer">
                  <Button type="primary" icon={<ExternalLink className="w-4 h-4" />} className="!bg-black">Join Meeting</Button>
                </a>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <Typography.Text className="text-sm font-semibold text-zinc-700 block mb-4">Status</Typography.Text>
            <Select value={meeting.status} onChange={handleStatusChange} style={{ width: 200 }}
              options={[
                { value: "scheduled", label: "Scheduled" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" },
              ]} />
            <Divider />
            <Typography.Text className="text-xs text-zinc-400">
              Created {new Date(meeting.createdAt).toLocaleDateString()} &middot;
              Updated {new Date(meeting.updatedAt).toLocaleDateString()}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      // AI-generated summary lives in its own tab so the manual summary
      // on the Overview stays undisturbed. Also hosts the Generate /
      // Regenerate + Apply-to-Overview controls.
      key: "aiSummary",
      label: (
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> AI Summary
        </span>
      ),
      children: (
        <div>
          {!meeting.aiSummary && !isGenerating && (
            <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 text-center">
              <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <Typography.Text className="text-base font-semibold text-zinc-800 block">No AI summary yet</Typography.Text>
              <Typography.Text className="text-sm text-zinc-500 block mt-1 max-w-md mx-auto">
                Generate a concise summary, decisions, and action items from this meeting&apos;s transcript
                (or from the meeting notes if no recording exists).
              </Typography.Text>
              <Button
                type="primary"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleGenerateSummary}
                className="!bg-purple-700 hover:!bg-purple-800 !mt-4"
                loading={isGenerating}
              >
                Generate summary with AI
              </Button>
            </div>
          )}

          {meeting.aiSummary && (
            <div className="bg-white border border-zinc-200 rounded-xl">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <Typography.Text strong>AI-generated summary</Typography.Text>
                </div>
                <Button
                  size="small"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={handleGenerateSummary}
                  loading={isGenerating}
                >
                  Regenerate
                </Button>
              </div>
              <div
                className="prose prose-zinc max-w-none px-5 py-4"
                dangerouslySetInnerHTML={{ __html: meeting.aiSummary }}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "decisions",
      label: `Decisions (${detail?.decisions.length || 0})`,
      children: (
        <div>
          <div className="mb-4">
            {/* TipTap RichTextEditor — lighter than CKEditor and matches the
                scale of single-decision entries. Content is stored as HTML. */}
            <RichTextEditor
              content={decisionText}
              onChange={setDecisionText}
              placeholder="Enter a decision..."
              minHeight={120}
            />
            <div className="flex justify-end mt-2">
              <Button
                type="primary"
                onClick={handleAddDecision}
                disabled={!decisionText.trim() || decisionText === "<p></p>" || decisionText === "<p>&nbsp;</p>"}
              >
                Add decision
              </Button>
            </div>
          </div>
          <List
            dataSource={detail?.decisions || []}
            renderItem={(item) => {
              const isEditing = editingDecisionId === item.id;
              return (
              <List.Item
                actions={isEditing ? [] : [
                  <Button
                    key="edit"
                    size="small"
                    icon={<Edit3 className="w-3 h-3" />}
                    onClick={() => handleStartEditDecision(item.id, item.decision)}
                  />,
                  <Button
                    key="delete"
                    size="small"
                    danger
                    icon={<Trash2 className="w-3 h-3" />}
                    onClick={() => handleDeleteDecision(item.id)}
                  />,
                ]}
              >
                <div className="flex items-start gap-3 w-full">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.aiGenerated && (
                        <Tag color="purple" className="!rounded-full !text-[10px] !px-2 !py-0 !leading-4">
                          <Sparkles className="w-2.5 h-2.5 inline mr-0.5" /> AI
                        </Tag>
                      )}
                    </div>
                    {isEditing ? (
                      <div>
                        <RichTextEditor
                          content={editingDecisionText}
                          onChange={setEditingDecisionText}
                          placeholder="Edit decision..."
                          minHeight={100}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button size="small" onClick={handleCancelEditDecision}>Cancel</Button>
                          <Button size="small" type="primary" onClick={handleSaveDecision}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-zinc prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.decision }} />
                        <Typography.Text className="text-xs text-zinc-400 block mt-1">
                          {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </Typography.Text>
                      </>
                    )}
                  </div>
                </div>
              </List.Item>
              );
            }}
          />
        </div>
      ),
    },
    {
      key: "actionItems",
      label: `Action Items (${detail?.actionItems.length || 0})`,
      children: (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AntInput value={actionTitle} onChange={(e) => setActionTitle(e.target.value)}
              placeholder="Enter an action item..." className="flex-1" />
            <Button type="primary" onClick={handleAddActionItem} disabled={!actionTitle.trim()}>Add</Button>
          </div>
          <List
            dataSource={detail?.actionItems || []}
            renderItem={(item) => (
              <List.Item actions={[
                <Button
                  key="edit"
                  size="small"
                  icon={<Edit3 className="w-3 h-3" />}
                  onClick={() => handleOpenActionItemEdit(item)}
                />,
                <Button key="delete" size="small" danger icon={<Trash2 className="w-3 h-3" />} onClick={() => handleDeleteActionItem(item.id)} />
              ]}>
                <div className="flex items-start gap-3 w-full">
                  <Checkbox checked={item.status === "completed"} onChange={() => handleToggleActionItem(item.id, item.status)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Typography.Text delete={item.status === "completed"} className={item.status === "completed" ? "text-zinc-400" : ""}>
                        {item.title}
                      </Typography.Text>
                      {item.aiGenerated && (
                        <Tag color="purple" className="!rounded-full !text-[10px] !px-2 !py-0 !leading-4">
                          <Sparkles className="w-2.5 h-2.5 inline mr-0.5" /> AI
                        </Tag>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1">
                      {item.owner && <Typography.Text className="text-xs text-zinc-400">Owner: {item.owner}</Typography.Text>}
                      {item.dueDate && <Typography.Text className="text-xs text-zinc-400">Due: {new Date(item.dueDate).toLocaleDateString()}</Typography.Text>}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      ),
    },
    {
      key: "recording",
      label: "Recording & Transcript",
      children: <MeetingTranscriptTab meetingId={meetingId} />,
    },
    {
      key: "activity",
      label: "Activity",
      children: (
        <List
          dataSource={detail?.activities || []}
          renderItem={(item) => (
            <List.Item>
              <div className="w-full">
                <Typography.Text className="text-sm font-medium text-zinc-700">{item.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</Typography.Text>
                <Typography.Text className="text-xs text-zinc-500 block">{item.description}</Typography.Text>
                <Typography.Text className="text-xs text-zinc-400 block mt-1">
                  {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Button type="text" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push(APP_ROUTES.meetings)} className="!text-zinc-500 hover:!text-zinc-900 !-ml-2 mb-2">Back to Meetings</Button>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
              <Calendar className="w-7 h-7 text-zinc-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Typography.Title level={3} className="!mb-0 !text-2xl !leading-tight">{meeting.title}</Typography.Title>
                <Tag color={statusColors[meeting.status] || "default"} className="!rounded-full !px-3 !py-0.5 !text-xs">{meeting.status}</Tag>
                <Tag className="!rounded-full !px-2 !py-0 !text-xs">{typeLabels[meeting.meetingType] || meeting.meetingType}</Tag>
                {meeting.meetLink && <Tag color="purple" className="!rounded-full !px-2 !py-0 !text-xs"><Video className="w-3 h-3 inline mr-1" />Meet</Tag>}
              </div>
              <Typography.Text className="text-zinc-500 text-sm block mt-1">
                {new Date(meeting.meetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Typography.Text>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {meeting.meetLink && (
              <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer">
                <Button icon={<Video className="w-4 h-4" />} className="!text-zinc-800 !border-zinc-300">Join Meet</Button>
              </a>
            )}
            {/* Generate / Regenerate button lives on the AI Summary tab so
                the two summary sources (manual vs AI) don't collide here. */}
            <Button icon={<Edit3 className="w-4 h-4" />} onClick={() => {
              editForm.setFieldsValue({ ...meeting, meetingDate: dayjs(meeting.meetingDate) });
              setEditDrawerOpen(true);
            }}>Edit</Button>
            <Button danger icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </div>

      {/* AI generation progress — a compact panel showing which agent is
          running. Auto-hides when the job completes and the summary lands. */}
      {isGenerating && (
        <div className="bg-white border border-purple-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <Typography.Text strong className="text-purple-900">Generating meeting summary</Typography.Text>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {AGENT_ORDER.map((name) => {
              const status = agentStatuses[name] ?? "pending";
              const isActive = status === "running" || currentAgent === name;
              return (
                <div key={name} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
                  status === "completed" ? "bg-green-50 border-green-200 text-green-800" :
                  status === "failed" ? "bg-red-50 border-red-200 text-red-800" :
                  isActive ? "bg-purple-50 border-purple-200 text-purple-800" :
                  "bg-zinc-50 border-zinc-200 text-zinc-500"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>{AGENT_LABELS[name] ?? name}</span>
                  {isActive && <Spin size="small" className="ml-auto" />}
                  {status === "completed" && <CheckCircle className="w-3 h-3 ml-auto" />}
                  {status === "failed" && <X className="w-3 h-3 ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Tabs items={tabItems} />

      {/* Action item edit modal — fields mirror the create form plus
          status. Save dispatches ``updateActionItemRequest`` which was
          already wired up for the toggle-complete flow. */}
      <Modal
        title="Edit action item"
        open={editingActionItemId != null}
        onCancel={() => setEditingActionItemId(null)}
        onOk={handleSaveActionItem}
        okText="Save"
        destroyOnClose
      >
        <Form form={actionItemForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}>
            <AntInput.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>
          <Form.Item name="owner" label="Owner">
            <AntInput placeholder="Person responsible (optional)" />
          </Form.Item>
          <Form.Item name="dueDate" label="Due date">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[
              { value: "pending", label: "Pending" },
              { value: "in_progress", label: "In progress" },
              { value: "completed", label: "Completed" },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Edit Meeting"
        width={520}
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        footer={
          <Space className="w-full justify-end">
            <Button onClick={() => setEditDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={handleUpdate}>Save Changes</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Required" }]}><AntInput /></Form.Item>
          <Form.Item name="meetingType" label="Type">
            <Select options={[
              { value: "client_meeting", label: "Client Meeting" },
              { value: "internal", label: "Internal" },
              { value: "discovery", label: "Discovery" },
              { value: "review", label: "Review" },
              { value: "kickoff", label: "Kickoff" },
              { value: "other", label: "Other" },
            ]} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[
              { value: "scheduled", label: "Scheduled" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]} />
          </Form.Item>
          <Form.Item name="meetingDate" label="Date & Time"><DatePicker showTime className="w-full" /></Form.Item>
          <Form.Item name="durationMinutes" label="Duration (minutes)"><AntInput type="number" min={15} /></Form.Item>
          <Form.Item name="summary" label="Summary"><AntInput.TextArea rows={3} /></Form.Item>
          <Form.Item name="attendees" label="Attendees">
            <Select mode="tags" placeholder="Type email and press Enter" tokenSeparators={[",", ";", " "]} open={false} />
          </Form.Item>
          <Form.Item name="location" label="Location"><AntInput /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
