"use client";

import { Typography } from "antd";

import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <Typography.Title level={3} className="!mb-0">{title}</Typography.Title>
        {subtitle ? <Typography.Text type="secondary">{subtitle}</Typography.Text> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
