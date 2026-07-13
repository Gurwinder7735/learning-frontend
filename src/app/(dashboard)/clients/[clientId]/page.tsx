"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag, Card, Tabs, Space, Typography, Spin, Modal, Form, Input as AntInput, Select, Drawer, App, Dropdown } from "antd";
import { ArrowLeft, Briefcase, Building2, Calendar, Clock, Edit3, ExternalLink, FileText, Globe, Mail, MapPin, MoreHorizontal, Phone, Plus, Trash2, User, UserPlus } from "lucide-react";
import { AccountFormFields } from "@/components/features/AccountPanels/AccountFormFields";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import type { Contact } from "@/types/models/Client";
import { fetchClientDetailRequest, clearClientDetail, updateClientRequest, deleteClientRequest, addContactRequest, updateContactRequest, removeContactRequest } from "@/store/modules/clients/clientsSlice";
import { selectClientDetail, selectClientContacts } from "@/store/modules/clients/clientsSelectors";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import { AccountTimelinePanel } from "@/components/features/AccountPanels/AccountTimelinePanel";
import { AccountMeetingsPanel } from "@/components/features/AccountPanels/AccountMeetingsPanel";
import {
  AccountSalesPrepPanel,
  type SalesPrepSection,
} from "@/components/features/AccountPanels/AccountSalesPrepPanel";
import DocumentList from "@/components/documents/DocumentList";

const statusColors: Record<string, string> = {
  active: "green",
  on_hold: "orange",
  completed: "blue",
  inactive: "red",
};

const sourceLabels: Record<string, string> = {
  referral: "Referral",
  linkedin: "LinkedIn",
  upwork: "Upwork",
  website: "Website",
  existing_client: "Existing Client",
  partner: "Partner",
  cold_outreach: "Cold Outreach",
  other: "Other",
};

export default function ClientDetailPage() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectClientDetail);
  const contacts = useAppSelector(selectClientContacts);

  const clientId = params.clientId as string;
  const client = detail?.client ?? null;

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm] = Form.useForm();
  const [contactForm] = Form.useForm();

  useEffect(() => {
    if (clientId) {
      dispatch(fetchClientDetailRequest(clientId));
    }
    return () => { dispatch(clearClientDetail()); };
  }, [clientId, dispatch]);

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      dispatch(updateClientRequest({ id: clientId, data: values }));
      setEditDrawerOpen(false);
    } catch {
      // validation failed
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Delete client",
      content: `Are you sure you want to delete ${client?.companyName}? This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => {
        dispatch(deleteClientRequest(clientId));
        router.push(APP_ROUTES.clients);
      },
    });
  };

  const handleContactSubmit = async () => {
    try {
      const values = await contactForm.validateFields();
      if (editingContact) {
        dispatch(updateContactRequest({ clientId, contactId: editingContact.id, data: values }));
      } else {
        dispatch(addContactRequest({ clientId, ...values }));
      }
      setContactDrawerOpen(false);
      setEditingContact(null);
      contactForm.resetFields();
    } catch {
      // validation failed
    }
  };

  const handleDeleteContact = (contact: Contact) => {
    Modal.confirm({
      title: "Remove contact",
      content: `Remove ${contact.fullName} from this client?`,
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: () => dispatch(removeContactRequest({ clientId, contactId: contact.id })),
    });
  };

  const openContactDrawer = (contact?: Contact) => {
    setEditingContact(contact ?? null);
    if (contact) {
      contactForm.setFieldsValue(contact);
    } else {
      contactForm.resetFields();
    }
    setContactDrawerOpen(true);
  };

  if (!client) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spin size="large" />
      </div>
    );
  }

  // Post-merge, a record whose ``origin_stage=lead`` entered the system
  // through the Leads module. Kept as a boolean here — used to gate the
  // "Lead origin" collapsible on Overview and the "Sales Prep" tab
  // below (both invisible on direct-created client records).
  const isFromLead = client.originStage === "lead";

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="mb-6">
        <Button
          type="text"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push(APP_ROUTES.clients)}
          className="!text-zinc-500 hover:!text-zinc-900 !-ml-2 mb-2"
        >
          Back to Clients
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-zinc-500" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <Typography.Title level={3} className="!mb-0 !text-2xl">
                  {client.companyName}
                </Typography.Title>
                <Tag
                  color={statusColors[client.status] || "default"}
                  className="!rounded-full !px-3 !py-0.5 !text-xs"
                >
                  {client.status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </Tag>
              </div>
              <Typography.Text className="text-zinc-500 text-sm">
                {client.industry && <>{client.industry} &middot; </>}
                {sourceLabels[client.sourceType] || client.sourceType}
                {client.country && <> &middot; {client.country}</>}
              </Typography.Text>
            </div>
          </div>

          <Space>
            <Button
              icon={<Edit3 className="w-4 h-4" />}
              onClick={() => { editForm.setFieldsValue(client); setEditDrawerOpen(true); }}
            >
              Edit
            </Button>
            <Button danger icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>
              Delete
            </Button>
          </Space>
        </div>
      </div>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: "Overview",
            children: (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ── Left: company identity card ─────────────────── */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <Card className="!rounded-xl !border-zinc-200 !shadow-sm">
                    {/* Brand block */}
                    <div className="flex flex-col items-center text-center pb-4 border-b border-zinc-100">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
                        <Building2 className="w-8 h-8 text-zinc-400" />
                      </div>
                      <p className="text-base font-semibold text-zinc-900 leading-tight">
                        {client.companyName}
                      </p>
                      {client.industry && (
                        <p className="text-sm text-zinc-500 mt-0.5">{client.industry}</p>
                      )}
                      <Tag
                        color={statusColors[client.status] || "default"}
                        className="!rounded-full !px-3 !py-0.5 !text-xs mt-2"
                      >
                        {client.status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </Tag>
                    </div>

                    {/* Quick-action buttons */}
                    {(client.email || client.phone || client.website) && (
                      <div className="flex gap-2 pt-4 pb-2">
                        {client.email && (
                          <a href={`mailto:${client.email}`} className="flex-1">
                            <Button block icon={<Mail className="w-3.5 h-3.5" />} size="small" className="!rounded-lg !text-xs !border-zinc-200 !text-zinc-600">
                              Email
                            </Button>
                          </a>
                        )}
                        {client.phone && (
                          <a href={`tel:${client.phone}`} className="flex-1">
                            <Button block icon={<Phone className="w-3.5 h-3.5" />} size="small" className="!rounded-lg !text-xs !border-zinc-200 !text-zinc-600">
                              Call
                            </Button>
                          </a>
                        )}
                        {client.website && (
                          <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button block icon={<Globe className="w-3.5 h-3.5" />} size="small" className="!rounded-lg !text-xs !border-zinc-200 !text-zinc-600">
                              Website
                            </Button>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Contact detail rows */}
                    <div className="space-y-3 pt-2">
                      {client.email && (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Email</p>
                            <p className="text-sm text-zinc-800 truncate">{client.email}</p>
                          </div>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Phone</p>
                            <p className="text-sm text-zinc-800">{client.phone}</p>
                          </div>
                        </div>
                      )}
                      {client.website && (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                            <Globe className="w-3.5 h-3.5 text-zinc-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Website</p>
                            <a
                              href={client.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate block"
                            >
                              {client.website.replace(/^https?:\/\//, "")}
                            </a>
                          </div>
                        </div>
                      )}
                      {contacts.length > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Primary Contact</p>
                            <p className="text-sm text-zinc-800">
                              {contacts.find((c) => c.isPrimary)?.fullName ?? contacts[0].fullName}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* ── Right: account details + stats ───────────────── */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title="Account Details">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                      {[
                        { label: "Industry", value: client.industry, icon: <Briefcase className="w-3.5 h-3.5 text-zinc-400" /> },
                        { label: "Country", value: client.country, icon: <MapPin className="w-3.5 h-3.5 text-zinc-400" /> },
                        { label: "Timezone", value: client.timezone, icon: <Clock className="w-3.5 h-3.5 text-zinc-400" /> },
                        { label: "Source", value: sourceLabels[client.sourceType] || client.sourceType, icon: <ExternalLink className="w-3.5 h-3.5 text-zinc-400" /> },
                        { label: "Referred By", value: client.referredBy, icon: <User className="w-3.5 h-3.5 text-zinc-400" /> },
                        {
                          label: "Client Since",
                          value: new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                          icon: <Calendar className="w-3.5 h-3.5 text-zinc-400" />,
                        },
                      ].map(({ label, value, icon }) =>
                        value ? (
                          <div key={label} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                              {icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-0.5">{label}</p>
                              <p className="text-sm text-zinc-800">{value}</p>
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </Card>

                  {/* Internal notes */}
                  {client.internalNotes && (
                    <Card
                      className="!rounded-xl !border-zinc-200 !shadow-sm"
                      title={
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-zinc-500" />
                          <span>Internal Notes</span>
                        </div>
                      }
                    >
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap">{client.internalNotes}</p>
                    </Card>
                  )}

                  {/* Lead-origin strip — only for converted leads */}
                  {isFromLead && (
                    <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title={
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-500" />
                        <span>Lead Origin</span>
                      </div>
                    }>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                        {client.contactPerson && (
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-0.5">Contact Person</p>
                              <p className="text-sm text-zinc-800">{client.contactPerson}</p>
                            </div>
                          </div>
                        )}
                        {client.linkedinProfile && (
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-0.5">LinkedIn</p>
                              <a href={client.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                View Profile
                              </a>
                            </div>
                          </div>
                        )}
                        {client.convertedToClientAt && (
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-0.5">Converted On</p>
                              <p className="text-sm text-zinc-800">
                                {new Date(client.convertedToClientAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
                      <p className="text-2xl font-semibold text-zinc-900">{contacts.length}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Contacts</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
                      <p className="text-2xl font-semibold text-zinc-900">
                        {new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">Member Since</p>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "contacts",
            label: `Contacts (${contacts.length})`,
            children: (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">
                    {contacts.length === 0
                      ? "No contacts yet"
                      : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
                  </p>
                  <Button
                    type="primary"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={() => openContactDrawer()}
                  >
                    Add Contact
                  </Button>
                </div>

                {contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border border-zinc-200 rounded-xl bg-white">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                      <User className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600 mb-1">No contacts yet</p>
                    <p className="text-xs text-zinc-400 mb-4">Add the people you work with at this account.</p>
                    <Button type="primary" size="small" icon={<Plus className="w-4 h-4" />} onClick={() => openContactDrawer()}>
                      Add Contact
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="group flex items-center gap-4 p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all"
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-sm font-semibold text-zinc-600 shrink-0">
                          {contact.fullName.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Name + role */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-zinc-900 truncate">{contact.fullName}</span>
                            {contact.isPrimary && (
                              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                                Primary
                              </span>
                            )}
                          </div>
                          {contact.designation && (
                            <p className="text-xs text-zinc-500 truncate">{contact.designation}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <Mail className="w-3 h-3 shrink-0" /> {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900">
                                <Phone className="w-3 h-3 shrink-0" /> {contact.phone}
                              </a>
                            )}
                            {contact.linkedinProfile && (
                              <a href={contact.linkedinProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <ExternalLink className="w-3 h-3 shrink-0" /> LinkedIn
                              </a>
                            )}
                          </div>
                          {contact.notes && (
                            <p className="text-xs text-zinc-400 italic mt-1 truncate">{contact.notes}</p>
                          )}
                        </div>

                        {/* Actions — reveal on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Dropdown
                            menu={{
                              items: [
                                { key: "edit", icon: <Edit3 className="w-4 h-4" />, label: "Edit", onClick: () => openContactDrawer(contact) },
                                { type: "divider" },
                                { key: "delete", icon: <Trash2 className="w-4 h-4" />, label: "Remove", danger: true, onClick: () => handleDeleteContact(contact) },
                              ],
                            }}
                          >
                            <Button type="text" size="small" icon={<MoreHorizontal className="w-4 h-4" />} />
                          </Dropdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "meetings",
            label: "Meetings",
            children: (
              <AccountMeetingsPanel
                accountId={clientId}
                apiBase="/api/v1/clients"
              />
            ),
          },
          {
            key: "timeline",
            label: "Timeline",
            children: (
              <AccountTimelinePanel
                accountId={clientId}
                apiBase="/api/v1/clients"
              />
            ),
          },
          {
            key: "documents",
            label: "Documents",
            children: (
              <Card className="!rounded-xl !border-zinc-200 !shadow-sm">
                <DocumentList entityType="client" entityId={clientId} />
              </Card>
            ),
          },
          {
            key: "sales-prep",
            label: "Sales Prep",
            children: (
              <AccountSalesPrepPanel
                accountId={clientId}
                apiBase="/api/v1/clients"
                initialSections={(client.salesPrepSections ?? []) as SalesPrepSection[]}
              />
            ),
          },
          {
            key: "notes",
            label: "Notes",
            children: (
              <AccountSalesPrepPanel
                accountId={clientId}
                apiBase="/api/v1/clients"
                initialSections={(client.notesSections ?? []) as SalesPrepSection[]}
                notesMode
              />
            ),
          },
        ]}
      />

      <Drawer
        title="Edit Client"
        width={560}
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); }}
        footer={
          <Space className="w-full justify-end">
            <Button onClick={() => setEditDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={handleUpdate}>Save Changes</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <AccountFormFields form={editForm} />
          {/* Client-only status control. Only meaningful for records
              already in the client lifecycle stage — lead-origin
              records still in ``lead`` stage use ``lead_status`` via
              the status dropdown on the lead detail page. */}
          <Form.Item name="status" label="Status">
            <Select
              options={[
                { value: "active", label: "Active" },
                { value: "on_hold", label: "On Hold" },
                { value: "completed", label: "Completed" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={editingContact ? "Edit Contact" : "Add Contact"}
        width={560}
        open={contactDrawerOpen}
        onClose={() => { setContactDrawerOpen(false); setEditingContact(null); contactForm.resetFields(); }}
        footer={
          <Space className="w-full justify-end">
            <Button onClick={() => { setContactDrawerOpen(false); setEditingContact(null); contactForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" onClick={handleContactSubmit}>{editingContact ? "Save" : "Add Contact"}</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={contactForm} layout="vertical">
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: "Required" }]}>
            <AntInput placeholder="e.g. Jane Doe" />
          </Form.Item>
          <Form.Item name="designation" label="Designation"><AntInput placeholder="e.g. CEO" /></Form.Item>
          <Form.Item name="email" label="Email"><AntInput placeholder="jane@example.com" /></Form.Item>
          <Form.Item name="phone" label="Phone"><AntInput placeholder="+1 555-0123" /></Form.Item>
          <Form.Item name="linkedinProfile" label="LinkedIn Profile"><AntInput placeholder="https://linkedin.com/in/..." /></Form.Item>
          <Form.Item name="notes" label="Notes"><AntInput.TextArea rows={2} /></Form.Item>
          <Form.Item name="isPrimary" label="Primary Contact" valuePropName="checked">
            <Select options={[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ]} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
