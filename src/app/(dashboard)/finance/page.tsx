"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Statistic, Row, Col, Table, Tag, Space, Modal, Form, Input, Select, DatePicker, InputNumber, App, Drawer } from "antd";
import { Plus, DollarSign, TrendingUp, Clock, AlertTriangle, CreditCard, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { selectFinanceStats, selectFinanceInvoices, selectFinancePayments, selectFinanceLoading } from "@/store/modules/finance/financeSelectors";
import { fetchFinanceStatsRequest, fetchInvoicesRequest, fetchPaymentsRequest, createInvoiceRequest, updateInvoiceRequest, createPaymentRequest } from "@/store/modules/finance/financeSlice";
import { fetchClientsRequest } from "@/store/modules/clients/clientsSlice";
import { selectClients } from "@/store/modules/clients/clientsSelectors";
import type { Invoice, Payment } from "@/types/models/Finance";

const invoiceStatusColors: Record<string, string> = {
  draft: "default", sent: "purple", paid: "green", overdue: "red", cancelled: "default",
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

const paymentTypeLabels: Record<string, string> = {
  advance: "Advance", milestone: "Milestone", final_payment: "Final Payment", maintenance: "Maintenance", other: "Other",
};

export default function FinancePage() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectFinanceStats);
  const invoices = useAppSelector(selectFinanceInvoices);
  const payments = useAppSelector(selectFinancePayments);
  const loading = useAppSelector(selectFinanceLoading);
  const clients = useAppSelector(selectClients);

  const [filterClientId, setFilterClientId] = useState<string | undefined>();
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  useEffect(() => {
    dispatch(fetchFinanceStatsRequest());
    dispatch(fetchInvoicesRequest({}));
    dispatch(fetchPaymentsRequest({}));
    dispatch(fetchClientsRequest({ limit: 200 }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchInvoicesRequest({ clientId: filterClientId }));
    dispatch(fetchPaymentsRequest({ clientId: filterClientId }));
  }, [dispatch, filterClientId]);

  const handleCreateInvoice = async () => {
    try {
      const values = await invoiceForm.validateFields();
      dispatch(createInvoiceRequest({
        ...values,
        dueDate: values.dueDate?.toISOString(),
      }));
      setInvoiceDrawerOpen(false);
      invoiceForm.resetFields();
    } catch {}
  };

  const handleChangeInvoiceStatus = (invoice: Invoice, status: string) => {
    dispatch(updateInvoiceRequest({ id: invoice.id, data: { status } }));
  };

  const handleCreatePayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      dispatch(createPaymentRequest({
        ...values,
        paymentDate: values.paymentDate?.toISOString(),
      }));
      setPaymentModalOpen(false);
      paymentForm.resetFields();
    } catch {}
  };

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.companyName }));

  const invoiceColumns = [
    { title: "Invoice #", dataIndex: "invoiceNumber", key: "invoiceNumber", render: (v: string) => <span className="font-medium">{v}</span> },
    { title: "Client", key: "client", render: (_: any, r: Invoice) => r.clientName || r.clientId || "-" },
    { title: "Amount", dataIndex: "amount", key: "amount", render: (v: number, r: Invoice) => <span>{r.currency} {v.toLocaleString()}</span> },
    { title: "Status", dataIndex: "status", key: "status", render: (s: string) => <Tag color={invoiceStatusColors[s] || "default"}>{invoiceStatusLabels[s] || s}</Tag> },
    { title: "Due Date", dataIndex: "dueDate", key: "dueDate", render: (d: string) => d ? new Date(d).toLocaleDateString() : "-" },
    {
      title: "Actions", key: "actions", render: (_: any, r: Invoice) => (
        <Space>
          {r.status === "draft" && <Button size="small" type="link" onClick={() => handleChangeInvoiceStatus(r, "sent")}>Send</Button>}
          {r.status === "sent" && <Button size="small" type="link" onClick={() => handleChangeInvoiceStatus(r, "paid")}>Mark Paid</Button>}
          {(r.status === "sent" || r.status === "draft") && <Button size="small" type="link" danger onClick={() => handleChangeInvoiceStatus(r, "cancelled")}>Cancel</Button>}
        </Space>
      ),
    },
  ];

  const paymentColumns = [
    { title: "Client", key: "client", render: (_: any, r: Payment) => r.clientName || r.clientId || "-" },
    { title: "Amount", dataIndex: "amount", key: "amount", render: (v: number, r: Payment) => <span className="font-medium">{r.currency} {v.toLocaleString()}</span> },
    { title: "Type", dataIndex: "paymentType", key: "paymentType", render: (t: string) => paymentTypeLabels[t] || t },
    { title: "Date", dataIndex: "paymentDate", key: "paymentDate", render: (d: string) => new Date(d).toLocaleDateString() },
    { title: "Reference", dataIndex: "referenceNumber", key: "referenceNumber", render: (v: string) => v || "-" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Finance" subtitle="Track revenue, invoices, and payments" />
        <Space>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { setInvoiceDrawerOpen(true); invoiceForm.resetFields(); }}>
            New Invoice
          </Button>
          <Button icon={<CreditCard className="w-4 h-4" />} onClick={() => { setPaymentModalOpen(true); paymentForm.resetFields(); }}>
            Record Payment
          </Button>
        </Space>
      </div>

      <Card className="!rounded-xl !border-zinc-200 !shadow-sm">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <Select
            allowClear
            showSearch
            placeholder="Filter by client"
            className="min-w-[240px]"
            optionFilterProp="label"
            value={filterClientId}
            onChange={(val) => { setFilterClientId(val); setFilterProjectId(undefined); }}
            options={clientOptions}
          />
          <Select
            allowClear
            showSearch
            placeholder="Filter by project"
            className="min-w-[240px]"
            optionFilterProp="label"
            value={filterProjectId}
            onChange={setFilterProjectId}
            options={projectOptions(filterClientId)}
            disabled={!filterClientId}
          />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card className="!rounded-xl !border-zinc-200 !shadow-sm" loading={loading}>
            <Statistic title="Total Revenue" prefix={<DollarSign className="w-4 h-4 text-zinc-400 mr-1" />} value={stats?.totalRevenue || 0} precision={2} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="!rounded-xl !border-zinc-200 !shadow-sm" loading={loading}>
            <Statistic title="This Month" prefix={<TrendingUp className="w-4 h-4 text-green-500 mr-1" />} value={stats?.revenueThisMonth || 0} precision={2} valueStyle={{ color: "#16a34a" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="!rounded-xl !border-zinc-200 !shadow-sm" loading={loading}>
            <Statistic title="Pending" prefix={<Clock className="w-4 h-4 text-orange-500 mr-1" />} value={stats?.pendingRevenue || 0} precision={2} valueStyle={{ color: "#ea580c" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="!rounded-xl !border-zinc-200 !shadow-sm" loading={loading}>
            <Statistic title="Overdue" prefix={<AlertTriangle className="w-4 h-4 text-red-500 mr-1" />} value={stats?.overdueRevenue || 0} precision={2} valueStyle={{ color: "#dc2626" }} />
          </Card>
        </Col>
      </Row>

      <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title="Invoices">
        <Table dataSource={invoices} columns={invoiceColumns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Card className="!rounded-xl !border-zinc-200 !shadow-sm" title="Payments">
        <Table dataSource={payments} columns={paymentColumns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Drawer title="New Invoice" width={520} open={invoiceDrawerOpen} onClose={() => setInvoiceDrawerOpen(false)} footer={<Space className="w-full justify-end"><Button onClick={() => setInvoiceDrawerOpen(false)}>Cancel</Button><Button type="primary" onClick={handleCreateInvoice}>Create Invoice</Button></Space>} destroyOnClose>
        <Form form={invoiceForm} layout="vertical">
          <Form.Item name="invoiceNumber" label="Invoice Number" rules={[{ required: true, message: "Required" }]}><Input placeholder="e.g. INV-001" /></Form.Item>
          <Form.Item name="clientId" label="Client">
            <Select allowClear showSearch placeholder="Select client" optionFilterProp="label" options={clientOptions} onChange={() => invoiceForm.setFieldValue("projectId", undefined)} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.clientId !== curr.clientId}>
            {({ getFieldValue }) => {
              const cid = getFieldValue("clientId");
              return (
                <Form.Item name="projectId" label="Project">
                  <Select allowClear showSearch placeholder={cid ? "Select project" : "Select a client first"} optionFilterProp="label" options={projectOptions(cid)} disabled={!cid} />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: "Required" }]}><InputNumber className="w-full" min={0} prefix="$" /></Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="USD"><Select options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "GBP", label: "GBP" }]} /></Form.Item>
          <Form.Item name="dueDate" label="Due Date"><DatePicker className="w-full" /></Form.Item>
          <Form.Item name="status" label="Status" initialValue="draft"><Select options={[{ value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }, { value: "paid", label: "Paid" }]} /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Drawer>

      <Modal title="Record Payment" open={paymentModalOpen} onCancel={() => setPaymentModalOpen(false)} onOk={handleCreatePayment} okText="Record Payment" destroyOnClose>
        <Form form={paymentForm} layout="vertical">
          <Form.Item name="clientId" label="Client">
            <Select allowClear showSearch placeholder="Select client" optionFilterProp="label" options={clientOptions} onChange={() => paymentForm.setFieldValue("projectId", undefined)} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.clientId !== curr.clientId}>
            {({ getFieldValue }) => {
              const cid = getFieldValue("clientId");
              return (
                <Form.Item name="projectId" label="Project">
                  <Select allowClear showSearch placeholder={cid ? "Select project" : "Select a client first"} optionFilterProp="label" options={projectOptions(cid)} disabled={!cid} />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="invoiceId" label="Invoice ID"><Input placeholder="Optional" /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: "Required" }]}><InputNumber className="w-full" min={0} prefix="$" /></Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="USD"><Select options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "GBP", label: "GBP" }]} /></Form.Item>
          <Form.Item name="paymentType" label="Payment Type" initialValue="other"><Select options={[{ value: "advance", label: "Advance" }, { value: "milestone", label: "Milestone" }, { value: "final_payment", label: "Final Payment" }, { value: "maintenance", label: "Maintenance" }, { value: "other", label: "Other" }]} /></Form.Item>
          <Form.Item name="paymentDate" label="Payment Date"><DatePicker className="w-full" /></Form.Item>
          <Form.Item name="referenceNumber" label="Reference Number"><Input placeholder="e.g. Wire transfer ref" /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
