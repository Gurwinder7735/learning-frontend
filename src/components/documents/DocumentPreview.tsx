import { useState, useEffect, useRef } from "react";
import { Modal, Image, Spin } from "antd";
import axiosInstance from "@/lib/api/axiosInstance";

interface DocumentPreviewProps {
  doc: {
    id: string;
    originalFilename: string;
    mimeType: string;
    entityType: string;
    entityId: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

export default function DocumentPreview({ doc, open, onClose }: DocumentPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!doc || !open) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
        setBlobUrl(null);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);

    axiosInstance.get(
      `/api/v1/${doc.entityType}s/${doc.entityId}/documents/${doc.id}/preview`,
      { responseType: "blob" },
    ).then((response) => {
      if (cancelled) return;
      const url = URL.createObjectURL(response.data);
      blobUrlRef.current = url;
      setBlobUrl(url);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
        setBlobUrl(null);
      }
    };
  }, [doc, open]);

  return (
    <Modal
      title={doc?.originalFilename ?? ""}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : !blobUrl ? (
        <div className="text-center py-12 text-zinc-500">
          <p>Failed to load preview</p>
        </div>
      ) : doc?.mimeType.startsWith("image/") ? (
        <div className="flex justify-center">
          <Image
            src={blobUrl}
            alt={doc.originalFilename}
            className="max-w-full rounded-lg"
            style={{ maxHeight: "70vh", objectFit: "contain" }}
          />
        </div>
      ) : doc?.mimeType === "application/pdf" ? (
        <iframe
          src={blobUrl}
          className="w-full rounded-lg border border-zinc-200"
          style={{ height: "70vh" }}
          title={doc?.originalFilename}
        />
      ) : (
        <div className="text-center py-12 text-zinc-500">
          <p className="mb-4">Preview not available for this file type</p>
        </div>
      )}
    </Modal>
  );
}
