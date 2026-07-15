"use client";

import React from "react";
import { Form, Select, Input, InputNumber, Button } from "antd";
import { Sparkles } from "lucide-react";

const COUNTRIES = [
  "United Kingdom", "United States", "Australia", "Canada", "Germany",
  "France", "Netherlands", "Sweden", "Denmark", "Norway", "Finland",
  "Singapore", "India", "UAE", "South Africa", "New Zealand", "Ireland",
  "Switzerland", "Austria", "Belgium", "Spain", "Italy", "Poland",
  "Czech Republic", "Portugal", "Brazil", "Mexico",
];

const INDUSTRIES = [
  "Digital Marketing Agency", "Creative / Design Agency", "Software Development Agency",
  "Mobile App Development Agency", "Web Design Agency", "SEO / Content Agency",
  "PR & Communications Agency", "Branding Agency", "Video Production Agency",
  "eCommerce Agency", "SaaS Company", "Technology Startup",
  "IT Consulting", "Management Consulting", "Fintech Company",
  "Healthcare Technology", "EdTech Company", "Legal Services",
  "Accounting / Finance", "Real Estate", "Retail / eCommerce",
];

interface FormValues {
  targetCountry: string;
  targetIndustry: string;
  serviceOffered: string;
  leadsRequested: number;
}

interface Props {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

export function LeadFinderForm({ onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={{ leadsRequested: 20 }}
      requiredMark={false}
    >
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item
          name="targetCountry"
          label={<span className="text-sm font-medium text-zinc-700">Target Country</span>}
          rules={[{ required: true, message: "Select a country" }]}
        >
          <Select
            showSearch
            placeholder="e.g. United Kingdom"
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
            filterOption={(input, opt) =>
              (opt?.label as string).toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          name="targetIndustry"
          label={<span className="text-sm font-medium text-zinc-700">Target Industry</span>}
          rules={[{ required: true, message: "Select an industry" }]}
        >
          <Select
            showSearch
            placeholder="e.g. Digital Marketing Agency"
            options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
            filterOption={(input, opt) =>
              (opt?.label as string).toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </div>

      <Form.Item
        name="serviceOffered"
        label={<span className="text-sm font-medium text-zinc-700">Service We Want to Offer</span>}
        rules={[{ required: true, message: "Describe the service" }]}
      >
        <Input
          placeholder="e.g. White-label mobile app development partnership"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="leadsRequested"
        label={<span className="text-sm font-medium text-zinc-700">Number of Leads Needed</span>}
        rules={[{ required: true }]}
      >
        <InputNumber
          min={5}
          max={100}
          step={5}
          style={{ width: "100%" }}
          size="large"
          addonAfter="leads"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          icon={<Sparkles className="w-4 h-4" />}
          style={{
            width: "100%",
            background: "#18181b",
            borderColor: "#18181b",
            height: 44,
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          {loading ? "Starting agent…" : "Start Finding Leads"}
        </Button>
      </Form.Item>
    </Form>
  );
}
