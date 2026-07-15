"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  Button,
  Tag,
  Tooltip,
  Typography,
  Badge,
  Modal,
  Select,
  Input,
  Pagination,
  Empty,
  Space,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  Import,
  ExternalLink,
  Mail,
  Phone,
  Link2,
  Search,
  Database,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { FoundLead } from "@/store/modules/aiLeadFinder/aiLeadFinderTypes";

const { Text, Link } = Typography;

interface Props {
  leads:        FoundLead[];
  total:        number;
  page:         number;
  pageSize?:    number;
  loading?:     boolean;
  onImport:     (leadIds: string[]) => Promise<void>;
  onPageChange: (page: number) => void;
  isImporting:  boolean;
}

export function FoundLeadsTable({
  leads,
  total,
  page,
  pageSize   = 50,
  loading    = false,
  onImport,
  onPageChange,
  isImporting,
}: Props) {
  const [selectedIds,    setSelectedIds]    = useState<string[]>([]);
  const [filterIndustry, setFilterIndustry] = useState<string>("");
  const [filterCountry,  setFilterCountry]  = useState<string>("");
  const [filterStatus,   setFilterStatus]   = useState<string>("");
  const [searchText,     setSearchText]     = useState<string>("");

  const industries = useMemo(() => {
    const s = new Set(leads.map((l) => l.industry).filter(Boolean) as string[]);
    return [...s].sort();
  }, [leads]);

  const countries = useMemo(() => {
    const s = new Set(leads.map((l) => l.country).filter(Boolean) as string[]);
    return [...s].sort();
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterIndustry && l.industry !== filterIndustry) return false;
      if (filterCountry  && l.country  !== filterCountry)  return false;
      if (filterStatus === "imported"    && !l.imported)   return false;
      if (filterStatus === "not_imported" && l.imported)   return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const hit =
          l.companyName?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.contactPerson?.toLowerCase().includes(q) ||
          l.website?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [leads, filterIndustry, filterCountry, filterStatus, searchText]);

  const unimportedInFilter = filtered.filter((l) => !l.imported).map((l) => l.id);

  const handleImportSelected = () => {
    if (!selectedIds.length) return;
    Modal.confirm({
      title:   `Import ${selectedIds.length} lead${selectedIds.length > 1 ? "s" : ""}?`,
      content: "Selected leads will appear in your Leads pipeline with source 'Cold Outreach'.",
      okText:  "Import",
      okButtonProps: { style: { background: "#18181b", borderColor: "#18181b" } },
      onOk: async () => { await onImport(selectedIds); setSelectedIds([]); },
    });
  };

  const handleImportOne = (id: string) => {
    Modal.confirm({
      title:   "Import this lead?",
      content: "This lead will be added to your Leads pipeline.",
      okText:  "Import",
      okButtonProps: { style: { background: "#18181b", borderColor: "#18181b" } },
      onOk: () => onImport([id]),
    });
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: TableColumnsType<FoundLead> = [
    {
      title:     "Company",
      dataIndex: "companyName",
      key:       "companyName",
      width:     220,
      ellipsis:  true,
      render: (name: string, row) => (
        <div className="min-w-0">
          <Text strong style={{ fontSize: 13, display: "block" }} ellipsis={{ tooltip: name }}>
            {name}
          </Text>
          {row.website && (
            <Link
              href={row.website.startsWith("http") ? row.website : `https://${row.website}`}
              target="_blank"
              style={{ fontSize: 11, color: "#71717a" }}
            >
              <ExternalLink className="inline w-3 h-3 mr-0.5" style={{ verticalAlign: "-1px" }} />
              {row.website.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 30)}
              {row.website.replace(/^https?:\/\//, "").length > 30 ? "…" : ""}
            </Link>
          )}
        </div>
      ),
    },
    {
      title:  "Contact Person",
      key:    "contactPerson",
      width:  140,
      render: (_: unknown, row) => (
        <div className="min-w-0">
          {row.contactPerson ? (
            <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: row.contactPerson }}>
              {row.contactPerson}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
          )}
          {row.linkedinUrl && (
            <div>
              <a
                href={row.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline mt-0.5"
              >
                <Link2 className="w-2.5 h-2.5" /> LinkedIn
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      title:  "Email",
      key:    "email",
      width:  200,
      render: (_: unknown, row) =>
        row.email ? (
          <Tooltip title={row.email}>
            <a
              href={`mailto:${row.email}`}
              className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 min-w-0"
            >
              <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="truncate max-w-[160px]">{row.email}</span>
            </a>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ),
    },
    {
      title:  "Phone",
      key:    "phone",
      width:  130,
      render: (_: unknown, row) =>
        row.phone ? (
          <span className="flex items-center gap-1.5 text-xs text-zinc-700">
            <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">{row.phone}</span>
          </span>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ),
    },
    {
      title:     "Industry",
      dataIndex: "industry",
      key:       "industry",
      width:     160,
      render: (v: string | null) =>
        v ? (
          <Tag style={{ fontSize: 11, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>
            {v}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ),
    },
    {
      title:     "Country",
      dataIndex: "country",
      key:       "country",
      width:     110,
      render: (v: string | null) =>
        v ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title:  "Status",
      key:    "status",
      width:  90,
      align:  "center",
      render: (_: unknown, row) =>
        row.imported ? (
          <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 className="w-3 h-3" /> Imported
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-blue-500">
            <Circle className="w-3 h-3" /> Found
          </span>
        ),
    },
    {
      title:  "",
      key:    "action",
      width:  72,
      align:  "center",
      fixed:  "right",
      render: (_: unknown, row) =>
        row.imported ? null : (
          <Button
            size="small"
            onClick={() => handleImportOne(row.id)}
            loading={isImporting}
            style={{ fontSize: 11, padding: "0 10px" }}
          >
            Import
          </Button>
        ),
    },
  ];

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ border: "1px solid #e4e4e7", background: "#fff" }}
    >
      {/* ── Row 1: title + search + bulk import ──────────────────────────── */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <Database className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-800">Lead Database</span>
          <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{total}</Tag>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <Input
            size="small"
            prefix={<Search className="w-3 h-3 text-zinc-400" />}
            placeholder="Search…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 180, fontSize: 12 }}
          />

          {selectedIds.length > 0 ? (
            <Button
              size="small"
              type="primary"
              icon={<Import className="w-3.5 h-3.5" />}
              loading={isImporting}
              onClick={handleImportSelected}
              style={{ background: "#18181b", borderColor: "#18181b", fontSize: 12, flexShrink: 0 }}
            >
              Import {selectedIds.length}
            </Button>
          ) : unimportedInFilter.length > 0 ? (
            <Button
              size="small"
              icon={<Import className="w-3.5 h-3.5" />}
              loading={isImporting}
              onClick={() =>
                Modal.confirm({
                  title:   `Import all ${unimportedInFilter.length} visible leads?`,
                  okText:  "Import All",
                  okButtonProps: { style: { background: "#18181b", borderColor: "#18181b" } },
                  onOk: () => onImport(unimportedInFilter),
                })
              }
              style={{ fontSize: 12, flexShrink: 0 }}
            >
              Import all ({unimportedInFilter.length})
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Row 2: filters ───────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-5 py-2 shrink-0"
        style={{ borderBottom: "1px solid #f5f5f5", background: "#fefefe" }}
      >
        <Text style={{ fontSize: 12, color: "#a1a1aa", flexShrink: 0 }}>Filter:</Text>
        <Select
          size="small"
          placeholder="All industries"
          allowClear
          value={filterIndustry || undefined}
          onChange={(v) => setFilterIndustry(v ?? "")}
          style={{ flex: 1, minWidth: 120, maxWidth: 200, fontSize: 12 }}
          options={industries.map((i) => ({ value: i, label: i }))}
        />
        <Select
          size="small"
          placeholder="All countries"
          allowClear
          value={filterCountry || undefined}
          onChange={(v) => setFilterCountry(v ?? "")}
          style={{ width: 130, fontSize: 12 }}
          options={countries.map((c) => ({ value: c, label: c }))}
        />
        <Select
          size="small"
          placeholder="All statuses"
          allowClear
          value={filterStatus || undefined}
          onChange={(v) => setFilterStatus(v ?? "")}
          style={{ width: 130, fontSize: 12 }}
          options={[
            { value: "not_imported", label: "Not imported" },
            { value: "imported",     label: "Imported" },
          ]}
        />
        {(filterIndustry || filterCountry || filterStatus || searchText) && (
          <Button
            size="small"
            type="link"
            style={{ fontSize: 12, padding: 0 }}
            onClick={() => {
              setFilterIndustry("");
              setFilterCountry("");
              setFilterStatus("");
              setSearchText("");
            }}
          >
            Clear
          </Button>
        )}
        {(filterIndustry || filterCountry || filterStatus || searchText) && (
          <Text style={{ fontSize: 11, color: "#a1a1aa", flexShrink: 0 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </Text>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <Table<FoundLead>
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={false}
          scroll={{ x: 1140 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text style={{ color: "#a1a1aa", fontSize: 13 }}>
                    {total === 0
                      ? "No leads yet — start a search to build your database"
                      : "No leads match the current filters"}
                  </Text>
                }
              />
            ),
          }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as string[]),
            getCheckboxProps: (record) => ({ disabled: record.imported }),
          }}
          rowClassName={(r) => (r.imported ? "opacity-50" : "")}
        />
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {total > pageSize && (
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderTop: "1px solid #f0f0f0" }}
        >
          <Text style={{ fontSize: 12, color: "#a1a1aa" }}>
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
          </Text>
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            showSizeChanger={false}
            onChange={onPageChange}
            size="small"
          />
        </div>
      )}
    </div>
  );
}
