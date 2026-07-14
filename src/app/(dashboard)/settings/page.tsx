"use client";

import { useEffect, useState } from "react";
import { Button, Input, Spin, Switch, message, Upload } from "antd";
import { Save, Calendar, CheckCircle, XCircle, PlugZap, Palette, UploadCloud, Mail, PenLine, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { storage } from "@/lib/utils/storage";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  fetchGoogleStatusRequest, disconnectGoogleRequest,
} from "@/store/modules/meetings/meetingsSlice";
import {
  selectGoogleConnected, selectGoogleEmail, selectMeetingsLoading,
} from "@/store/modules/meetings/meetingsSelectors";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Branding {
  companyName: string;
  tagline: string;
  logoPath: string | null;
  officialSignatoryName: string;
  officialSignatoryTitle: string;
  officialSignatoryEmail: string;
  // SMTP override fields
  smtpServer?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpFromEmail?: string;
  smtpPasswordSet?: boolean;
  smtpUseTls?: boolean;
}

const NAV_ITEMS = [
  { key: "integrations", icon: PlugZap, label: "Integrations" },
  { key: "branding", icon: Palette, label: "Branding" },
  { key: "signatory", icon: PenLine, label: "Signatory" },
  { key: "email", icon: Mail, label: "Email / SMTP" },
];

/** Consistent label used throughout settings panels. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">
      {children}
    </label>
  );
}

/** Section header — icon + title + description. */
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <Icon className="w-5 h-5 text-zinc-500" />
        <h3 className="text-base font-semibold text-zinc-800 m-0">{title}</h3>
      </div>
      <p className="text-sm text-zinc-400 mt-1">{description}</p>
    </div>
  );
}

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const googleConnected = useAppSelector(selectGoogleConnected);
  const googleEmail = useAppSelector(selectGoogleEmail);
  const loading = useAppSelector(selectMeetingsLoading);

  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState("integrations");

  // Branding state
  const [branding, setBranding] = useState<Branding>({ companyName: "", tagline: "", logoPath: null, officialSignatoryName: "", officialSignatoryTitle: "", officialSignatoryEmail: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const token = storage.getAccessToken();
      try {
        const brandingRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.branding.get}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (brandingRes.ok) {
          const json = await brandingRes.json();
          const d = json.data;
          setBranding({
            companyName: d.companyName || "",
            tagline: d.tagline || "",
            logoPath: d.logoPath || null,
            officialSignatoryName: d.officialSignatoryName || "",
            officialSignatoryTitle: d.officialSignatoryTitle || "",
            officialSignatoryEmail: d.officialSignatoryEmail || "",
          });
        }
      } catch {
        message.error("Failed to load settings");
      } finally {
        setFetching(false);
      }
    };
    fetchAll();
    dispatch(fetchGoogleStatusRequest());
  }, [dispatch]);

  const handleGoogleConnect = async () => {
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.meetings.googleAuth}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        window.location.href = json.data.authUrl;
      } else {
        message.error("Failed to get Google auth URL");
      }
    } catch {
      message.error("Failed to connect Google Calendar");
    }
  };

  const handleGoogleDisconnect = () => {
    dispatch(disconnectGoogleRequest());
    message.success("Google Calendar disconnected");
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const token = storage.getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Save text fields
      const textRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.branding.update}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: branding.companyName,
          tagline: branding.tagline || null,
          official_signatory_name: branding.officialSignatoryName || null,
          official_signatory_title: branding.officialSignatoryTitle || null,
          official_signatory_email: branding.officialSignatoryEmail || null,
        }),
      });
      if (!textRes.ok) throw new Error("Failed to save branding");

      // Upload logo if a new one was selected
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const logoRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.branding.uploadLogo}`, {
          method: "POST",
          headers,
          body: fd,
        });
        if (logoRes.ok) {
          const json = await logoRes.json();
          setBranding((b) => ({ ...b, logoPath: json.data.logoPath || null }));
        }
        setLogoFile(null);
        setLogoPreview(null);
      }

      message.success("Branding saved");
    } catch {
      message.error("Failed to save branding");
    } finally {
      setSavingBranding(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure integrations, pricing defaults, and AI efficiency parameters."
      />

      <div className="flex rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden min-h-[500px]">
        <nav className="w-[220px] shrink-0 border-r border-zinc-100 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`relative w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-white/[0.08] text-black"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                )}
                <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-zinc-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 p-8">
          {activeTab === "integrations" && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <h3 className="text-base font-semibold text-zinc-800 m-0">Google Calendar</h3>
              </div>
              <p className="text-sm text-zinc-400 mt-1 mb-6">
                Sync meetings to Google Calendar and optionally generate Google Meet links.
              </p>

              <div className="flex items-center justify-between p-5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div>
                  <p className="text-sm font-medium text-zinc-700">
                    {googleConnected ? "Connected" : "Not connected"}
                  </p>
                  {googleConnected && googleEmail && (
                    <p className="text-xs text-zinc-500 mt-1">{googleEmail}</p>
                  )}
                  <p className="text-xs text-zinc-400 mt-1">
                    {googleConnected
                      ? "Meetings will automatically sync to your Google Calendar."
                      : "Connect to automatically create calendar events for meetings."}
                  </p>
                </div>
                {googleConnected ? (
                  <Button danger icon={<XCircle className="w-4 h-4" />} onClick={handleGoogleDisconnect} loading={loading}>
                    Disconnect
                  </Button>
                ) : (
                  <Button type="primary" icon={<Calendar className="w-4 h-4" />} onClick={handleGoogleConnect} loading={loading}>
                    Connect
                  </Button>
                )}
              </div>

              {googleConnected && (
                <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Sync is active
                </div>
              )}
            </div>
          )}

          {activeTab === "branding" && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Palette className="w-5 h-5 text-zinc-500" />
                <h3 className="text-base font-semibold text-zinc-800 m-0">Company Branding</h3>
              </div>
              <p className="text-sm text-zinc-400 mt-1 mb-6">
                Your company name and logo appear on all shared BRD documents.
              </p>

              <div className="space-y-6 max-w-md">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">
                    Company Name
                  </label>
                  <Input
                    value={branding.companyName}
                    onChange={(e) => setBranding((b) => ({ ...b, companyName: e.target.value }))}
                    placeholder="e.g. Appmotiv Technologies"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">
                    Tagline <span className="text-zinc-300 font-normal normal-case">(optional)</span>
                  </label>
                  <Input
                    value={branding.tagline}
                    onChange={(e) => setBranding((b) => ({ ...b, tagline: e.target.value }))}
                    placeholder="e.g. Building Digital Products"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-2">
                    Company Logo
                  </label>

                  {/* Current logo preview */}
                  {(logoPreview || branding.logoPath) && (
                    <div className="mb-3 flex items-center gap-3">
                      <div className="w-24 h-12 border border-zinc-200 rounded-lg bg-zinc-50 flex items-center justify-center overflow-hidden">
                        <img
                          src={logoPreview || (branding.logoPath ? `${API_BASE_URL}${branding.logoPath}` : "")}
                          alt="Logo preview"
                          className="max-h-10 max-w-full object-contain"
                        />
                      </div>
                      {logoPreview && (
                        <div className="text-xs text-zinc-500">
                          <p className="font-medium">New logo selected</p>
                          <button
                            className="text-red-500 hover:text-red-700 mt-0.5"
                            onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      {!logoPreview && branding.logoPath && (
                        <p className="text-xs text-zinc-400">Current logo</p>
                      )}
                    </div>
                  )}

                  <Upload.Dragger
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      const preview = URL.createObjectURL(file);
                      setLogoFile(file);
                      setLogoPreview(preview);
                      return false;
                    }}
                    style={{ background: "transparent" }}
                  >
                    <div className="py-3">
                      <UploadCloud className="w-6 h-6 text-zinc-400 mx-auto mb-1" />
                      <p className="text-xs text-zinc-500">
                        Click or drag PNG, JPEG, WebP, or SVG
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Max 5MB</p>
                    </div>
                  </Upload.Dragger>
                </div>

                {/* Preview of how it will appear */}
                {(branding.companyName || logoPreview || branding.logoPath) && (
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-2">
                      Preview — Shared document header
                    </label>
                    <div className="border border-zinc-200 rounded-xl p-4 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(logoPreview || branding.logoPath) ? (
                          <img
                            src={logoPreview || (branding.logoPath ? `${API_BASE_URL}${branding.logoPath}` : "")}
                            alt="Logo"
                            className="h-8 w-auto object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {branding.companyName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 leading-none">
                            {branding.companyName || "Company Name"}
                          </p>
                          {branding.tagline && (
                            <p className="text-[11px] text-zinc-400 leading-none mt-0.5">
                              {branding.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400">Read-only · Confidential</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "signatory" && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <PenLine className="w-5 h-5 text-zinc-500" />
                <h3 className="text-base font-semibold text-zinc-800 m-0">Official Signatory</h3>
              </div>
              <p className="text-sm text-zinc-400 mt-1 mb-6">
                These details appear on signed agreements and legal documents instead of the logged-in user's name.
              </p>
              <div className="space-y-5 max-w-md">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Full Legal Name</label>
                  <Input
                    value={branding.officialSignatoryName}
                    onChange={(e) => setBranding((b) => ({ ...b, officialSignatoryName: e.target.value }))}
                    placeholder="e.g. Gurwinder Singh"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Official Title / Designation</label>
                  <Input
                    value={branding.officialSignatoryTitle}
                    onChange={(e) => setBranding((b) => ({ ...b, officialSignatoryTitle: e.target.value }))}
                    placeholder="e.g. Director, CEO, Managing Partner"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Official Email</label>
                  <Input
                    type="email"
                    value={branding.officialSignatoryEmail}
                    onChange={(e) => setBranding((b) => ({ ...b, officialSignatoryEmail: e.target.value }))}
                    placeholder="e.g. director@company.com"
                  />
                </div>
                {(branding.officialSignatoryName || branding.officialSignatoryTitle) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Preview on Certificate</p>
                    <p className="text-base text-amber-900" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                      {branding.officialSignatoryName || "Name"}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {[branding.officialSignatoryTitle, branding.officialSignatoryEmail].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "email" && (
            <SmtpSettingsPanel branding={branding} onSaved={(updated) => setBranding((b) => ({ ...b, ...updated }))} />
          )}

          {activeTab !== "email" && (
            <div className="flex justify-end mt-8 pt-6 border-t border-zinc-100">
              <Button
                type="primary"
                icon={<Save className="w-4 h-4" />}
                loading={savingBranding}
                onClick={handleSaveBranding}
              >
                {activeTab === "signatory" ? "Save Signatory" : "Save Branding"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SMTP Settings Panel ────────────────────────────────────────────────────

interface SmtpFormState {
  server: string;
  port: string;
  username: string;
  fromEmail: string;
  password: string;
  useTls: boolean;
}

function SmtpSettingsPanel({
  branding,
  onSaved,
}: {
  branding: Branding;
  onSaved: (updated: Partial<Branding>) => void;
}) {
  const [form, setForm] = useState<SmtpFormState>({
    server:    branding.smtpServer   || "",
    port:      branding.smtpPort?.toString() || "",
    username:  branding.smtpUsername  || "",
    fromEmail: branding.smtpFromEmail || "",
    password:  "",
    useTls:    branding.smtpUseTls !== false,
  });
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);

  const set = (key: keyof SmtpFormState) =>
    (value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = storage.getAccessToken();
      const body: Record<string, unknown> = {
        smtp_server:     form.server    || null,
        smtp_port:       form.port      ? parseInt(form.port) : null,
        smtp_username:   form.username  || null,
        smtp_from_email: form.fromEmail || null,
        smtp_use_tls:    form.useTls,
      };
      if (form.password) body.smtp_password = form.password;

      const res = await fetch(`${API_BASE_URL}/api/v1/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");

      onSaved({
        smtpServer:   form.server,
        smtpPort:     form.port ? parseInt(form.port) : undefined,
        smtpUsername: form.username,
        smtpFromEmail: form.fromEmail,
        smtpUseTls:   form.useTls,
        smtpPasswordSet: !!form.password || branding.smtpPasswordSet,
      });
      message.success("SMTP settings saved");
    } catch {
      message.error("Failed to save SMTP settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/branding/test-email`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setTestResult("success");
        message.success("Test email sent — check your inbox");
      } else {
        setTestResult("failed");
        message.error("Test email failed — check SMTP settings");
      }
    } catch {
      setTestResult("failed");
      message.error("Test email failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <SectionHeader
        icon={Mail}
        title="Email / SMTP"
        description="Configure the SMTP server used to send signing invites and notifications. Leave fields empty to use the server defaults."
      />

      <div className="space-y-5 max-w-md">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>SMTP Server</FieldLabel>
            <Input
              value={form.server}
              onChange={(e) => set("server")(e.target.value)}
              placeholder="smtp.hostinger.com"
            />
          </div>
          <div>
            <FieldLabel>Port</FieldLabel>
            <Input
              type="number"
              value={form.port}
              onChange={(e) => set("port")(e.target.value)}
              placeholder="587"
            />
          </div>
        </div>

        <div>
          <FieldLabel>SMTP Username</FieldLabel>
          <Input
            value={form.username}
            onChange={(e) => set("username")(e.target.value)}
            placeholder="contact@company.com"
          />
        </div>

        <div>
          <FieldLabel>From Email (shown to recipient)</FieldLabel>
          <Input
            value={form.fromEmail}
            onChange={(e) => set("fromEmail")(e.target.value)}
            placeholder="noreply@company.com"
          />
        </div>

        <div>
          <FieldLabel>
            Password{" "}
            {branding.smtpPasswordSet && (
              <span className="text-zinc-300 font-normal normal-case">
                (currently set — leave blank to keep)
              </span>
            )}
          </FieldLabel>
          <Input.Password
            value={form.password}
            onChange={(e) => set("password")(e.target.value)}
            placeholder="Enter new password to change"
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={form.useTls}
            onChange={(checked) => set("useTls")(checked)}
            size="small"
          />
          <span className="text-sm text-zinc-700">Use STARTTLS (recommended)</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-zinc-100">
        <Button onClick={handleTest} loading={testing} icon={<Mail className="w-3.5 h-3.5" />}>
          Send Test Email
        </Button>

        {testResult === "success" && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Sent!
          </span>
        )}
        {testResult === "failed" && (
          <span className="inline-flex items-center gap-1 text-sm text-red-500 font-medium">
            <XCircle className="w-4 h-4" /> Failed
          </span>
        )}

        <div className="flex-1" />

        <Button
          type="primary"
          icon={<Save className="w-4 h-4" />}
          loading={saving}
          onClick={handleSave}
        >
          Save SMTP Settings
        </Button>
      </div>
    </div>
  );
}
