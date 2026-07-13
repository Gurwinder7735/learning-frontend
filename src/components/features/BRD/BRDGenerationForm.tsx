"use client";

import { useState } from "react";
import {
  Input,
  Select,
  Button,
  Typography,
  Upload,
  message,
} from "antd";
import { Sparkles, Loader2, UploadCloud, X } from "lucide-react";
import type { UploadFile } from "antd/es/upload/interface";
import type { AccountOption } from "@/types/models/Client";

interface Props {
  clients: AccountOption[];
  clientsLoading: boolean;
  onSubmit: (data: {
    name: string;
    contextText: string;
    clientId?: string;
    clientName?: string;
    files: File[];
  }) => Promise<void>;
  loading: boolean;
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt";
const MAX_FILES = 8;
const MAX_FILE_MB = 20;

export function BRDGenerationForm({ clients, clientsLoading, onSubmit, loading }: Props) {
  const [name, setName] = useState("");
  const [contextText, setContextText] = useState("");
  const [clientId, setClientId] = useState<string | undefined>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const selectedClient = clients.find((c) => c.id === clientId);

  const handleSubmit = async () => {
    if (!name.trim() || !contextText.trim() || loading) return;
    const files = fileList
      .filter((f) => f.originFileObj)
      .map((f) => f.originFileObj as File);
    await onSubmit({
      name: name.trim(),
      contextText: contextText.trim(),
      clientId: clientId || undefined,
      clientName: selectedClient?.companyName || undefined,
      files,
    });
  };

  const beforeUpload = (file: File) => {
    if (fileList.length >= MAX_FILES) {
      message.warning(`Maximum ${MAX_FILES} files allowed`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      message.error(`${file.name} exceeds ${MAX_FILE_MB}MB limit`);
      return Upload.LIST_IGNORE;
    }
    return false; // prevent auto-upload
  };

  const canSubmit = name.trim() && contextText.trim() && !loading;

  return (
    <div className="space-y-5">
      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          BRD Title <span className="text-red-500">*</span>
        </Typography.Text>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. E-Commerce Platform BRD"
          disabled={loading}
        />
      </div>

      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Client (optional)
        </Typography.Text>
        <Select
          value={clientId}
          onChange={setClientId}
          placeholder="Select client"
          allowClear
          showSearch
          disabled={loading}
          loading={clientsLoading}
          style={{ width: "100%" }}
          getPopupContainer={(trigger) => trigger.parentNode}
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          notFoundContent={clientsLoading ? "Loading..." : "No accounts found"}
          options={clients.map((c) => ({
            value: c.id,
            label:
              (c.lifecycleStage ?? c.originStage) === "lead"
                ? `${c.companyName} (Lead)`
                : c.companyName,
          }))}
        />
      </div>

      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Business Context <span className="text-red-500">*</span>
        </Typography.Text>
        <Typography.Text className="text-[11px] text-zinc-400 block mb-2">
          Describe the client's business, the problem they are solving, their goals, and any
          relevant background. The more detail you provide, the better the BRD.
        </Typography.Text>
        <Input.TextArea
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          placeholder="Tell us about the client's business, their pain points, what they want to build, their target users, and any constraints or requirements they have mentioned..."
          rows={8}
          disabled={loading}
          className="!text-sm"
        />
      </div>

      <div>
        <Typography.Text className="text-xs font-medium text-zinc-500 block mb-1">
          Upload Client Documents (optional)
        </Typography.Text>
        <Typography.Text className="text-[11px] text-zinc-400 block mb-2">
          Upload up to {MAX_FILES} documents — PDFs, Word docs, Excel sheets, CSVs, or text files.
          The AI will read and extract insights from all of them.
        </Typography.Text>
        <Upload.Dragger
          multiple
          accept={ACCEPTED_TYPES}
          fileList={fileList}
          beforeUpload={beforeUpload}
          onChange={({ fileList: newList }) => setFileList(newList)}
          disabled={loading}
          showUploadList={{
            showRemoveIcon: true,
            removeIcon: <X className="w-3 h-3" />,
          }}
        >
          <div className="py-4">
            <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              PDF, DOCX, XLSX, CSV, TXT — max {MAX_FILE_MB}MB each, up to {MAX_FILES} files
            </p>
          </div>
        </Upload.Dragger>
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
          {loading ? "Starting generation..." : "Generate BRD"}
        </Button>
      </div>
    </div>
  );
}
