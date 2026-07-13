"use client";

import { Form, Input, Select } from "antd";
import {
  COUNTRY_OPTIONS,
  INDUSTRY_OPTIONS,
  getFilteredTimezones,
} from "@/lib/constants/clientOptions";

/**
 * Shared field set for both Add Lead / Add Client / Edit Client forms.
 *
 * Historically the two forms diverged: the lead form captured a
 * sales-hunt view (contactPerson, LinkedIn, assignedTo) and the client
 * form captured a delivery view (website, industry, referredBy,
 * internalNotes). Post-unification the underlying record is the same
 * either way, so both forms show the full superset. Requirement rules
 * stay minimal — only ``companyName`` is enforced.
 *
 * Meant to be rendered **inside** an existing ``<Form form={...}>`` —
 * the parent owns the form instance, submit handler, and drawer chrome.
 * We only render the ``<Form.Item>``s.
 *
 * All fields use camelCase names matching the backend camel-to-snake
 * ``CamelModel`` alias — ``sourceType`` (not ``source``), ``linkedinProfile``,
 * etc.
 */

interface Props {
  /** The AntD form instance owned by the parent. */
  // AntD's FormInstance is loosely typed at the edges; using the
  // parent's ``FormInstance<any>`` here keeps this widget generic.
  form: import("antd").FormInstance;
  /** Extra assignee options for admins. Falsy => hide the field. */
  userOptions?: Array<{ value: string; label: string }>;
  /** Provided only for backwards-compat with the previous
   *  ``useState``-based implementation. The widget now derives the
   *  active country from ``Form.useWatch("country")`` so it stays in
   *  sync with ``setFieldsValue`` calls after mount (edit flows). */
  initialCountry?: string | null;
}

const SOURCE_OPTIONS = [
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "upwork", label: "Upwork" },
  { value: "website", label: "Website" },
  { value: "existing_client", label: "Existing Client" },
  { value: "partner", label: "Partner" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "other", label: "Other" },
];

export function AccountFormFields({ form, userOptions }: Props) {
  // Watch the form's ``country`` field so the timezone dropdown stays
  // reactive — including after ``form.setFieldsValue({ country })`` in
  // the Edit-drawer prefill path.
  const country = Form.useWatch("country", form) as string | undefined;

  return (
    <>
      <Form.Item
        name="companyName"
        label="Company Name"
        rules={[{ required: true, message: "Required" }]}
      >
        <Input placeholder="e.g. Acme Corp" />
      </Form.Item>

      <Form.Item name="contactPerson" label="Contact Person">
        <Input placeholder="e.g. Jane Doe" />
      </Form.Item>

      <Form.Item name="email" label="Email">
        <Input placeholder="jane@acme.com" />
      </Form.Item>

      <Form.Item name="phone" label="Phone">
        <Input placeholder="+1 555-0123" />
      </Form.Item>

      <Form.Item name="linkedinProfile" label="LinkedIn Profile">
        <Input placeholder="https://linkedin.com/in/..." />
      </Form.Item>

      <Form.Item name="website" label="Website">
        <Input placeholder="https://example.com" />
      </Form.Item>

      <Form.Item name="industry" label="Industry">
        <Select
          showSearch
          placeholder="Select industry"
          options={INDUSTRY_OPTIONS}
          allowClear
        />
      </Form.Item>

      <Form.Item name="country" label="Country">
        <Select
          showSearch
          placeholder="Select country"
          options={COUNTRY_OPTIONS}
          allowClear
          onChange={() => {
            // Clear timezone whenever country changes so a stale
            // selection doesn't stick around. The ``Form.useWatch``
            // hook above picks up the new country automatically.
            form.setFieldValue("timezone", undefined);
          }}
        />
      </Form.Item>

      <Form.Item name="timezone" label="Timezone">
        <Select
          showSearch
          placeholder={
            country
              ? `Select timezone for ${country}`
              : "Select a country first"
          }
          options={getFilteredTimezones(country)}
          allowClear
          disabled={!country}
        />
      </Form.Item>

      <Form.Item name="sourceType" label="Source">
        <Select
          showSearch
          placeholder="Select source"
          options={SOURCE_OPTIONS}
          allowClear
        />
      </Form.Item>

      <Form.Item name="referredBy" label="Referred By">
        <Input placeholder="Name or company" />
      </Form.Item>

      {userOptions && userOptions.length > 0 && (
        <Form.Item name="assignedTo" label="Assigned To">
          <Select
            showSearch
            placeholder="Assign to user"
            allowClear
            optionFilterProp="label"
            options={userOptions}
          />
        </Form.Item>
      )}

      <Form.Item name="internalNotes" label="Internal Notes">
        <Input.TextArea rows={3} placeholder="Any internal notes..." />
      </Form.Item>
    </>
  );
}
