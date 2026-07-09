"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Modal, Spin, Typography, message } from "antd";
import {
  ArrowLeft,
  Copy,
  FileSearch,
  Lock,
  LockOpen,
  Pencil,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  fetchFeatureDocDetailRequest,
  setCurrentFeatureDoc,
} from "@/store/modules/sow/sowSlice";
import {
  selectCurrentFeatureDoc,
  selectSOWLoading,
} from "@/store/modules/sow/sowSelectors";
import { BRDContentEditor } from "@/components/features/BRD/BRDContentEditor";
import { SmartContentRenderer } from "@/components/features/BRD/SmartContentRenderer";
import { storage } from "@/lib/utils/storage";
import { APP_ROUTES } from "@/lib/constants/appConstants";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const moduleColors: Record<string, string> = {
  "Auth": "bg-blue-50 text-blue-700 border-blue-200",
  "Core": "bg-purple-50 text-purple-700 border-purple-200",
  "Billing": "bg-amber-50 text-amber-700 border-amber-200",
  "Payments": "bg-amber-50 text-amber-700 border-amber-200",
  "Settings": "bg-zinc-100 text-zinc-600 border-zinc-200",
  "Dashboard": "bg-emerald-50 text-emerald-700 border-emerald-200",
};
function moduleColor(mod: string) {
  return moduleColors[mod] || "bg-zinc-100 text-zinc-600 border-zinc-200";
}

export default function FeatureDocPage() {
  const { sowId, featureId } = useParams() as { sowId: string; featureId: string };
  const dispatch = useAppDispatch();
  const router = useRouter();
  const doc = useAppSelector(selectCurrentFeatureDoc);
  const isLoading = useAppSelector(selectSOWLoading);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchFeatureDocDetailRequest(featureId));
  }, [featureId, dispatch]);

  useEffect(() => {
    if (doc) setEditContent(doc.content || "");
  }, [doc?.id]); // eslint-disable-line

  const authHeaders = () => {
    const token = storage.getAccessToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const handleSave = async () => {
    if (!doc || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/sow/features/${featureId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      dispatch(setCurrentFeatureDoc(json.data));
      setIsEditing(false);
      message.success("Saved");
    } catch {
      message.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!doc?.shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/sow/features/share/${doc.shareToken}`);
    message.success("Share link copied!");
  };

  const handleSetPassword = async (remove = false) => {
    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/sow/features/${featureId}/set-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ password: remove ? null : newPassword }),
      });
      if (!res.ok) throw new Error();
      dispatch(fetchFeatureDocDetailRequest(featureId));
      setPasswordModalOpen(false);
      setNewPassword("");
      message.success(remove ? "Password removed" : "Password set");
    } catch {
      message.error("Failed");
    } finally {
      setSavingPassword(false);
    }
  };

  if (isLoading && !doc) {
    return <div className="flex justify-center items-center py-32"><Spin size="large" /></div>;
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <FileSearch className="w-16 h-16 mb-4 text-zinc-300" />
        <Typography.Text className="text-zinc-500">Feature document not found</Typography.Text>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <div className="mb-4">
        <Link href={`${APP_ROUTES.sow}/${sowId}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Analysis
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {doc.featureModule && (
              <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-0.5 ${moduleColor(doc.featureModule)}`}>
                {doc.featureModule}
              </span>
            )}
            {doc.featureCode && (
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5">
                {doc.featureCode}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-zinc-900">{doc.featureName}</h1>
          {/* Sub-feature list */}
          {doc.subFeatures && doc.subFeatures.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {doc.subFeatures.map((sf, i) => (
                <span key={i} className="text-[11px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5">
                  {sf.code ? `${sf.code}` : sf.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {!isEditing && (
            <Button icon={<Pencil className="w-3.5 h-3.5" />} size="small" onClick={() => setIsEditing(true)}>Edit</Button>
          )}
          {isEditing && (
            <>
              <Button icon={<X className="w-3.5 h-3.5" />} size="small" onClick={() => { setIsEditing(false); setEditContent(doc.content || ""); }} disabled={isSaving}>Cancel</Button>
              <Button icon={<Save className="w-3.5 h-3.5" />} size="small" type="primary" onClick={handleSave} loading={isSaving} className="!bg-zinc-900">Save</Button>
            </>
          )}
          {!isEditing && (
            <>
              <Button icon={<Copy className="w-3.5 h-3.5" />} size="small" onClick={handleCopyShareLink}>Copy Share Link</Button>
              {doc.isPasswordProtected ? (
                <Button icon={<LockOpen className="w-3.5 h-3.5" />} size="small" danger onClick={() => handleSetPassword(true)} loading={savingPassword}>Remove Password</Button>
              ) : (
                <Button icon={<Lock className="w-3.5 h-3.5" />} size="small" onClick={() => setPasswordModalOpen(true)}>Set Password</Button>
              )}
            </>
          )}
        </div>

        <Modal
          title="Set Share Password"
          open={passwordModalOpen}
          onCancel={() => { setPasswordModalOpen(false); setNewPassword(""); }}
          onOk={() => handleSetPassword(false)}
          okText="Set Password"
          confirmLoading={savingPassword}
          okButtonProps={{ disabled: newPassword.length < 4 }}
        >
          <p className="text-sm text-zinc-500 mb-4">Visitors will need this password to open the shared document.</p>
          <Input.Password
            placeholder="Enter a password (min 4 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onPressEnter={() => newPassword.length >= 4 && handleSetPassword(false)}
            autoFocus
          />
        </Modal>
      </div>

      {/* Content */}
      <div className="mb-6">
        {isEditing ? (
          <BRDContentEditor content={editContent} onChange={setEditContent} disabled={isSaving} />
        ) : doc.content ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <SmartContentRenderer content={doc.content} />
          </div>
        ) : (
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-12 text-center">
            <FileSearch className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Content is being generated...</p>
          </div>
        )}
      </div>
    </div>
  );
}
