"use client";

import { useEffect, useState } from "react";
import { Button, Input, Select, Typography, Spin, message, Slider } from "antd";
import { Save, Calendar, CheckCircle, XCircle, DollarSign, Zap, PlugZap } from "lucide-react";
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

interface Settings {
  hourlyRate: number;
  aiEfficiencyFactor: number;
  currency: string;
  teamSize: number;
}

const NAV_ITEMS = [
  { key: "integrations", icon: PlugZap, label: "Integrations" },
  { key: "pricing", icon: DollarSign, label: "Pricing" },
  { key: "ai-efficiency", icon: Zap, label: "AI Efficiency" },
];

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const googleConnected = useAppSelector(selectGoogleConnected);
  const googleEmail = useAppSelector(selectGoogleEmail);
  const loading = useAppSelector(selectMeetingsLoading);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("integrations");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = storage.getAccessToken();
        const res = await fetch(`${API_BASE_URL}/api/v1/proposal-intelligence/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          setSettings(json.data);
        }
      } catch {
        message.error("Failed to load settings");
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
    dispatch(fetchGoogleStatusRequest());
  }, [dispatch]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const token = storage.getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/proposal-intelligence/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          hourlyRate: settings.hourlyRate,
          aiEfficiencyFactor: settings.aiEfficiencyFactor,
          currency: settings.currency,
          teamSize: settings.teamSize,
        }),
      });
      if (res.ok) {
        message.success("Settings saved");
      } else {
        message.error("Failed to save settings");
      }
    } catch {
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

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

          {activeTab === "pricing" && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <DollarSign className="w-5 h-5 text-zinc-500" />
                <h3 className="text-base font-semibold text-zinc-800 m-0">Pricing Defaults</h3>
              </div>
              <p className="text-sm text-zinc-400 mt-1 mb-6">
                Default rates used by the Commercial Agent to calculate project pricing.
              </p>

              <div className="space-y-6 max-w-md">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Hourly Rate</label>
                  <p className="text-xs text-zinc-500 mb-2">The default rate for calculating project pricing.</p>
                  <Input
                    type="number"
                    prefix="$"
                    value={settings?.hourlyRate ?? 75}
                    onChange={(e) => setSettings((s) => s ? { ...s, hourlyRate: Number(e.target.value) } : s)}
                    className="!w-40"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Currency</label>
                  <Select
                    value={settings?.currency ?? "USD"}
                    onChange={(val) => setSettings((s) => s ? { ...s, currency: val } : s)}
                    style={{ width: 120 }}
                    options={[
                      { value: "USD", label: "USD" },
                      { value: "EUR", label: "EUR" },
                      { value: "GBP", label: "GBP" },
                      { value: "INR", label: "INR" },
                      { value: "CAD", label: "CAD" },
                      { value: "AUD", label: "AUD" },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "ai-efficiency" && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Zap className="w-5 h-5 text-zinc-500" />
                <h3 className="text-base font-semibold text-zinc-800 m-0">AI Development Efficiency</h3>
              </div>
              <p className="text-sm text-zinc-400 mt-1 mb-6">
                Configure how AI affects development speed estimates in proposals.
              </p>

              <div className="space-y-6 max-w-md">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">AI Efficiency Factor</label>
                  <p className="text-xs text-zinc-500 mb-2">
                    How much faster your team is using AI tools. Lower = faster.
                  </p>
                  <Slider
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    value={settings?.aiEfficiencyFactor ?? 0.3}
                    onChange={(val) => setSettings((s) => s ? { ...s, aiEfficiencyFactor: val } : s)}
                    tooltip={{ formatter: (v) => `${(v ?? 0.3).toFixed(2)} (${Math.round((1 - (v ?? 0.3)) * 100)}% faster)` }}
                  />
                  <div className="flex justify-between text-xs text-zinc-400 mt-1">
                    <span>Very fast (0.05)</span>
                    <span>Traditional (1.0)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block mb-1">Team Size</label>
                  <p className="text-xs text-zinc-500 mb-2">Number of developers on the project.</p>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={settings?.teamSize ?? 2}
                    onChange={(e) => setSettings((s) => s ? { ...s, teamSize: Math.max(1, Number(e.target.value)) } : s)}
                    className="!w-24"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-8 pt-6 border-t border-zinc-100">
            <Button type="primary" icon={<Save className="w-4 h-4" />} loading={saving} onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
