"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Input, Modal, Tabs } from "antd";
import { Edit3, FileText, Plus, Save, X } from "lucide-react";
import { BRDContentEditor } from "@/components/features/BRD/BRDContentEditor";
import { apiRequest } from "@/lib/api/axiosInstance";

/**
 * Sales Prep / Notes workspace panel.
 *
 * - Default view: rendered HTML (no editor visible).
 * - Click "Edit" on a section → CKEditor mounts for that section only.
 * - Click "Done" → collapses back to the rendered view.
 * - Click "Save" in the card header → persists all sections via the API.
 *
 * Reused for both "Sales Prep" (``notesMode=false``) and "Notes"
 * (``notesMode=true``) tabs by switching the API endpoint and labels.
 */

export interface SalesPrepSection {
  id: string;
  title: string;
  content: string;
}

interface Props {
  accountId: string;
  apiBase: string;
  initialSections: SalesPrepSection[];
  canEdit?: boolean;
  onSaved?: (sections: SalesPrepSection[]) => void;
  notesMode?: boolean;
}

export function AccountSalesPrepPanel({
  accountId,
  apiBase,
  initialSections,
  canEdit = true,
  onSaved,
  notesMode = false,
}: Props) {
  const { message } = App.useApp();

  const [sections, setSections] = useState<SalesPrepSection[]>(initialSections);
  const [activeId, setActiveId] = useState<string | null>(initialSections[0]?.id ?? null);
  // Which section is currently open in the CKEditor. Only one at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const endpoint = notesMode ? "notes" : "sales-prep";
  const cardTitle = notesMode ? "Notes Workspace" : "Sales Prep Workspace";
  const emptyText = notesMode
    ? "No notes yet. Create your first section to start writing."
    : "No sections yet. Create your first section to start taking notes.";

  // Stay in sync when parent re-fetches (e.g. after page load).
  useEffect(() => {
    setSections(initialSections);
    if (initialSections.length > 0 && !activeId) {
      setActiveId(initialSections[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSections.length]);

  const activeSection = sections.find((s) => s.id === activeId);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest({
        url: `${apiBase}/${accountId}/${endpoint}`,
        method: "PATCH",
        data: { sections },
      });
      message.success("Saved");
      onSaved?.(sections);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className="!rounded-xl !border-zinc-200 !shadow-sm"
      title={
        <div className="flex items-center justify-between w-full">
          <span>{cardTitle}</span>
          {canEdit && (
            <Button
              type="primary"
              size="small"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              loading={saving}
              disabled={sections.length === 0}
            >
              Save
            </Button>
          )}
        </div>
      }
    >
      {sections.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500 mb-4">
            {canEdit
              ? emptyText
              : `No ${notesMode ? "notes" : "sales-prep notes"} on this account.`}
          </p>
          {canEdit && (
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                const id = crypto.randomUUID();
                setSections([{ id, title: "New Section", content: "" }]);
                setActiveId(id);
                setEditingId(id);
              }}
            >
              Add First Section
            </Button>
          )}
        </div>
      ) : (
        <Tabs
          type="editable-card"
          activeKey={activeId ?? undefined}
          onChange={(key) => {
            setActiveId(key);
            // Collapse the editor when switching tabs.
            setEditingId(null);
          }}
          hideAdd={!canEdit}
          onEdit={(targetKey, action) => {
            if (!canEdit) return;

            if (action === "add") {
              let nameInput = "";
              Modal.confirm({
                title: "New Section",
                content: (
                  <Input
                    placeholder="Section name (e.g. Chat Notes, Objections)"
                    autoFocus
                    onChange={(e) => { nameInput = e.target.value; }}
                    onPressEnter={() => Modal.destroyAll()}
                  />
                ),
                okText: "Create",
                onOk: () => {
                  const title = nameInput.trim() || "New Section";
                  const id = crypto.randomUUID();
                  setSections((prev) => [...prev, { id, title, content: "" }]);
                  setActiveId(id);
                  // Open the editor immediately for a brand-new section.
                  setEditingId(id);
                },
              });
            } else if (action === "remove") {
              const key = targetKey as string;
              const section = sections.find((s) => s.id === key);
              Modal.confirm({
                title: `Delete "${section?.title ?? "this section"}"?`,
                content: "This will remove the section and its content. Save to persist.",
                okText: "Delete",
                okButtonProps: { danger: true },
                onOk: () => {
                  setSections((prev) => {
                    const next = prev.filter((s) => s.id !== key);
                    if (activeId === key) setActiveId(next[0]?.id ?? null);
                    return next;
                  });
                  if (editingId === key) setEditingId(null);
                },
              });
            }
          }}
          items={sections.map((section) => ({
            key: section.id,
            label: (
              <span
                onDoubleClick={(e) => {
                  if (!canEdit) return;
                  e.stopPropagation();
                  let nameInput = section.title;
                  Modal.confirm({
                    title: "Rename Section",
                    content: (
                      <Input
                        defaultValue={section.title}
                        autoFocus
                        onChange={(e) => { nameInput = e.target.value; }}
                        onPressEnter={() => Modal.destroyAll()}
                      />
                    ),
                    okText: "Rename",
                    onOk: () => {
                      const title = nameInput.trim() || section.title;
                      setSections((prev) =>
                        prev.map((s) => (s.id === section.id ? { ...s, title } : s))
                      );
                    },
                  });
                }}
                title={canEdit ? "Double-click to rename" : undefined}
              >
                {section.title}
              </span>
            ),
            children: (
              <SectionBody
                section={section}
                isEditing={editingId === section.id}
                canEdit={canEdit}
                onEdit={() => setEditingId(section.id)}
                onDone={() => setEditingId(null)}
                onChange={(html) =>
                  setSections((prev) =>
                    prev.map((s) => (s.id === section.id ? { ...s, content: html } : s))
                  )
                }
              />
            ),
          }))}
        />
      )}
    </Card>
  );
}

// ── Per-section view/edit toggle ──────────────────────────────────────────

interface SectionBodyProps {
  section: SalesPrepSection;
  isEditing: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDone: () => void;
  onChange: (html: string) => void;
}

function SectionBody({ section, isEditing, canEdit, onEdit, onDone, onChange }: SectionBodyProps) {
  if (isEditing && canEdit) {
    return (
      <div className="mt-2">
        <div className="flex justify-end mb-2">
          <Button
            size="small"
            icon={<X className="w-3.5 h-3.5" />}
            onClick={onDone}
          >
            Done editing
          </Button>
        </div>
        <BRDContentEditor
          content={section.content}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className="mt-2">
      {section.content ? (
        <div className="relative rounded-lg border border-zinc-100 bg-zinc-50/40 px-4 py-3">
          {/* Edit button — fixed top-right, always same position */}
          {canEdit && (
            <button
              onClick={onEdit}
              className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 hover:bg-white border border-transparent hover:border-zinc-200 rounded-md px-2 py-1 transition-all"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          )}
          <div
            className="prose prose-zinc max-w-none text-sm pr-12"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </div>
      ) : (
        <div className="text-center py-10 rounded-lg border border-dashed border-zinc-200">
          <p className="text-sm text-zinc-400 mb-3">No content yet.</p>
          {canEdit && (
            <Button
              size="small"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={onEdit}
            >
              Start writing
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
