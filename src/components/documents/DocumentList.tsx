"use client";

import { useEffect, useState } from "react";
import { Table, Button, Tag, Tooltip, App, Empty, Space, Typography } from "antd";
import { Download, Trash2, Eye, FileText, FileImage, File as FileIcon } from "lucide-react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { fetchDocumentsRequest, deleteDocumentRequest, downloadDocumentFileRequest, clearDocuments } from "@/store/modules/documents/documentsSlice";
import { selectDocuments, selectDocumentsMeta } from "@/store/modules/documents/documentsSelectors";
import DocumentUpload from "./DocumentUpload";
import DocumentPreview from "./DocumentPreview";
import type { Document } from "@/types/models/Document";

interface DocumentListProps {
  entityType: string;
  entityId: string;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="w-4 h-4 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
  return <FileIcon className="w-4 h-4 text-zinc-400" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ entityType, entityId }: DocumentListProps) {
  const { modal } = App.useApp();
  const dispatch = useAppDispatch();
  const documents = useAppSelector(selectDocuments);
  const { isLoading } = useAppSelector(selectDocumentsMeta);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    dispatch(fetchDocumentsRequest({ entityType, entityId }));
    return () => { dispatch(clearDocuments()); };
  }, [entityType, entityId, dispatch]);

  const handleDelete = (doc: Document) => {
    modal.confirm({
      title: "Delete document",
      content: `Are you sure you want to delete "${doc.originalFilename}"?`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => dispatch(deleteDocumentRequest({ entityType, entityId, docId: doc.id })),
    });
  };

  const handleDownload = (doc: Document) => {
    dispatch(downloadDocumentFileRequest({
      entityType,
      entityId,
      docId: doc.id,
      filename: doc.originalFilename,
    }));
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "originalFilename",
      key: "name",
      render: (name: string, record: Document) => (
        <div className="flex items-center gap-2">
          {fileIcon(record.mimeType)}
          <div>
            <Typography.Text className="!text-sm !font-medium block truncate max-w-[300px]">
              {name}
            </Typography.Text>
            <Typography.Text className="!text-xs !text-zinc-400">
              {formatSize(record.fileSize)}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "mimeType",
      key: "type",
      width: 100,
      render: (mime: string) => {
        const label = mime.split("/").pop()?.toUpperCase() || mime;
        return <Tag className="!rounded-full !text-xs">{label}</Tag>;
      },
    },
    {
      title: "Uploaded By",
      key: "uploadedBy",
      width: 160,
      render: (_: unknown, record: Document) => (
        <div className="text-sm text-zinc-600">
          <div>{record.uploadedByName || "Unknown"}</div>
          {record.isClientUploaded && (
            <Tag className="!rounded-full !text-[10px] !text-green-600 !bg-green-50 !border-green-200">
              Client-shared
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "date",
      width: 140,
      render: (date: string) => (
        <Typography.Text className="!text-sm !text-zinc-500">
          {new Date(date).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
          })}
        </Typography.Text>
      ),
    },
    {
      title: "Downloads",
      dataIndex: "downloadCount",
      key: "downloads",
      width: 100,
      render: (count: number) => (
        <Typography.Text className="!text-sm !text-zinc-400">{count}</Typography.Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Document) => (
        <Space size={4}>
          <Tooltip title="Preview">
            <Button
              type="text"
              size="small"
              icon={<Eye className="w-4 h-4" />}
              onClick={() => setPreviewDoc(record)}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button
              type="text"
              size="small"
              icon={<Download className="w-4 h-4" />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <Button type="primary" onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? "Cancel" : "Upload Document"}
        </Button>
      </div>

      {showUpload && (
        <div className="mb-6">
          <DocumentUpload entityType={entityType} entityId={entityId} />
        </div>
      )}

      <Table
        dataSource={documents}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: <Empty description="No documents yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        className="[&_.ant-table-row]:!cursor-default"
      />

      <DocumentPreview
        doc={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
