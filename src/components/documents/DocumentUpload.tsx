"use client";

import { useState } from "react";
import { Upload, Button, Input, Checkbox, App } from "antd";
import { Upload as UploadIcon, Inbox } from "lucide-react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { uploadDocumentRequest } from "@/store/modules/documents/documentsSlice";
import type { RcFile } from "antd/es/upload/interface";

interface DocumentUploadProps {
  entityType: string;
  entityId: string;
}

export default function DocumentUpload({ entityType, entityId }: DocumentUploadProps) {
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  const [fileList, setFileList] = useState<RcFile[]>([]);
  const [description, setDescription] = useState("");
  const [isClientUploaded, setIsClientUploaded] = useState(false);

  const MAX_SIZE = 20 * 1024 * 1024;

  const beforeUpload = (file: RcFile): false => {
    const allowed = [
      "application/pdf",
      "image/png", "image/jpeg", "image/gif", "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain", "text/csv",
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg|gif|webp|doc|docx|xls|xlsx|txt|csv)$/i)) {
      message.error(`${file.name} is not a supported file type`);
      return false;
    }
    if (file.size > MAX_SIZE) {
      message.error(`${file.name} exceeds the 20MB limit`);
      return false;
    }
    setFileList([file]);
    return false;
  };

  const handleUpload = () => {
    if (!fileList.length) {
      message.warning("Select a file first");
      return;
    }
    dispatch(uploadDocumentRequest({
      entityType,
      entityId,
      file: fileList[0] as File,
      description: description || undefined,
      isClientUploaded,
    }));
    setFileList([]);
    setDescription("");
    setIsClientUploaded(false);
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
      <Upload.Dragger
        beforeUpload={beforeUpload}
        fileList={fileList.map((f) => ({ uid: f.name, name: f.name, status: "done" as const }))}
        onRemove={() => setFileList([])}
        maxCount={1}
      >
        <p className="text-zinc-400 mb-2 flex justify-center">
          <Inbox className="w-10 h-10" />
        </p>
        <p className="text-sm text-zinc-600">Click or drag a file here to upload</p>
        <p className="text-xs text-zinc-400 mt-1">PDF, PNG, JPG, DOC, XLS, TXT, CSV — max 20MB</p>
      </Upload.Dragger>
      <Input.TextArea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <div className="flex items-center justify-between">
        <Checkbox checked={isClientUploaded} onChange={(e) => setIsClientUploaded(e.target.checked)}>
          Client-shared document
        </Checkbox>
        <Button type="primary" icon={<UploadIcon className="w-4 h-4" />} onClick={handleUpload} disabled={!fileList.length}>
          Upload
        </Button>
      </div>
    </div>
  );
}
