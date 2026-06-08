"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag, Card, Tabs, Descriptions, Space, Typography, Empty, Spin, Modal, Form, Input as AntInput, Select, Drawer, List, App, Dropdown } from "antd";
import { ArrowLeft, Building2, Edit3, Trash2, Plus, Phone, Mail, ExternalLink, UserPlus, MoreHorizontal } from "lucide-react";
import { INDUSTRY_OPTIONS, COUNTRY_OPTIONS, getFilteredTimezones } from "@/lib/constants/clientOptions";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import type { Contact } from "@/types/models/Client";
import { fetchClientDetailRequest, clearClientDetail, updateClientRequest, deleteClientRequest, addContactRequest, updateContactRequest, removeContactRequest } from "@/store/modules/clients/clientsSlice";
import { selectClientDetail, selectClientContacts } from "@/store/modules/clients/clientsSelectors";
import { APP_ROUTES } from "@/lib/constants/appConstants";

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
  const [editCountry, setEditCountry] = useState<string>();

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

  return (
    <div>
      <div className="mb-6">
        <Button type="text" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push(APP_ROUTES.clients)} className="!text-zinc-500 hover:!text-zinc-900 !-ml-2 mb-2">
          Back to Clients
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-zinc-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Typography.Title level={3} className="!mb-0 !text-2xl">{client.companyName}</Typography.Title>
                <Tag color={statusColors[client.status] || "default"} className="!rounded-full !px-3 !py-0.5 !text-xs">
                  {client.status.replace("_", " ")}
                </Tag>
              </div>
              <Typography.Text className="text-zinc-500 text-sm">
                {sourceLabels[client.sourceType] || client.sourceType}
                {client.referredBy && <> &middot; Referred by {client.referredBy}</>}
              </Typography.Text>
            </div>
          </div>
          <Space>
            <Button icon={<Edit3 className="w-4 h-4" />} onClick={() => { editForm.setFieldsValue(client); setEditCountry(client.country ?? undefined); setEditDrawerOpen(true); }}>
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
              <div className="space-y-6">
                <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title="Company Information">
                  <Descriptions column={{ xs: 1, sm: 2 }} colon={false} className="[&_.ant-descriptions-item-content]:text-zinc-900">
                    {client.email && <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Email</span>}>{client.email}</Descriptions.Item>}
                    {client.phone && <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Phone</span>}>{client.phone}</Descriptions.Item>}
                    {client.industry && <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Industry</span>}>{client.industry}</Descriptions.Item>}
                    {client.country && <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Country</span>}>{client.country}</Descriptions.Item>}
                    {client.timezone && <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Timezone</span>}>{client.timezone}</Descriptions.Item>}
                    {client.website && (
                      <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Website</span>}>
                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{client.website}</a>
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Source</span>}>{sourceLabels[client.sourceType] || client.sourceType}</Descriptions.Item>
                    {client.referredBy && <Descriptions.Item label={<span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Referred By</span>}>{client.referredBy}</Descriptions.Item>}
                  </Descriptions>
                </Card>

                {client.internalNotes && (
                  <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title="Internal Notes">
                    <Typography.Paragraph className="!text-zinc-700 !whitespace-pre-wrap">{client.internalNotes}</Typography.Paragraph>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: "contacts",
            label: `Contacts (${contacts.length})`,
            children: (
              <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title={
                <div className="flex items-center justify-between w-full">
                  <span>Contacts</span>
                  <Button type="primary" size="small" icon={<UserPlus className="w-4 h-4" />} onClick={() => openContactDrawer()}>
                    Add Contact
                  </Button>
                </div>
              }>
                {contacts.length === 0 ? (
                  <Empty description="No contacts yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => openContactDrawer()}>
                      Add Contact
                    </Button>
                  </Empty>
                ) : (
                  <List
                    dataSource={contacts}
                    renderItem={(contact) => (
                      <List.Item
                        className="!border-zinc-100 !py-4"
                        actions={[
                          <Dropdown key="more" menu={{
                            items: [
                              { key: "edit", icon: <Edit3 className="w-4 h-4" />, label: "Edit", onClick: () => openContactDrawer(contact) },
                              { type: "divider" },
                              { key: "delete", icon: <Trash2 className="w-4 h-4" />, label: "Remove", danger: true, onClick: () => handleDeleteContact(contact) },
                            ],
                          }}>
                            <Button type="text" icon={<MoreHorizontal className="w-4 h-4" />} />
                          </Dropdown>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600 shrink-0">
                              {contact.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          }
                          title={
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900">{contact.fullName}</span>
                              {contact.isPrimary && <Tag color="blue" className="!text-[10px] !px-1.5 !py-0 !leading-none !rounded-full">Primary</Tag>}
                            </div>
                          }
                          description={
                            <div className="space-y-1 mt-1">
                              {contact.designation && <Typography.Text className="!text-xs !text-zinc-500 block">{contact.designation}</Typography.Text>}
                              <div className="flex flex-wrap gap-3">
                                {contact.email && (
                                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                    <Mail className="w-3 h-3" /> {contact.email}
                                  </a>
                                )}
                                {contact.phone && (
                                  <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900">
                                    <Phone className="w-3 h-3" /> {contact.phone}
                                  </a>
                                )}
                                {contact.linkedinProfile && (
                                  <a href={contact.linkedinProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                    <ExternalLink className="w-3 h-3" /> LinkedIn
                                  </a>
                                )}
                              </div>
                              {contact.notes && <Typography.Text className="!text-xs !text-zinc-400 block italic">{contact.notes}</Typography.Text>}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
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
          <Form.Item name="companyName" label="Company Name" rules={[{ required: true, message: "Required" }]}>
            <AntInput />
          </Form.Item>
          <Form.Item name="email" label="Email"><AntInput /></Form.Item>
          <Form.Item name="phone" label="Phone"><AntInput /></Form.Item>
          <Form.Item name="website" label="Website"><AntInput /></Form.Item>
          <Form.Item name="industry" label="Industry">
            <Select showSearch placeholder="Select industry" options={INDUSTRY_OPTIONS} allowClear />
          </Form.Item>
          <Form.Item name="country" label="Country">
            <Select showSearch placeholder="Select country" options={COUNTRY_OPTIONS} allowClear onChange={(val) => { setEditCountry(val); editForm.setFieldValue("timezone", undefined); }} />
          </Form.Item>
          <Form.Item name="timezone" label="Timezone">
            <Select showSearch placeholder={editCountry ? "Select timezone for " + editCountry : "Select a country first"} options={getFilteredTimezones(editCountry)} allowClear disabled={!editCountry} />
          </Form.Item>
          <Form.Item name="sourceType" label="Source">
            <Select options={[
              { value: "referral", label: "Referral" },
              { value: "linkedin", label: "LinkedIn" },
              { value: "upwork", label: "Upwork" },
              { value: "website", label: "Website" },
              { value: "existing_client", label: "Existing Client" },
              { value: "partner", label: "Partner" },
              { value: "cold_outreach", label: "Cold Outreach" },
              { value: "other", label: "Other" },
            ]} />
          </Form.Item>
          <Form.Item name="referredBy" label="Referred By"><AntInput /></Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[
              { value: "active", label: "Active" },
              { value: "on_hold", label: "On Hold" },
              { value: "completed", label: "Completed" },
              { value: "inactive", label: "Inactive" },
            ]} />
          </Form.Item>
          <Form.Item name="internalNotes" label="Internal Notes"><AntInput.TextArea rows={3} /></Form.Item>
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
