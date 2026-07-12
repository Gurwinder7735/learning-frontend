"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import {
  Users,
  Building2,
  Calendar,
  Menu,
  X,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Target,
  ShieldCheck,
  BookText,
  FilePen,
  Search,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function UserAvatar({ name, email }: { name: string; email: string }) {
  const initials = (name || email || "U").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-zinc-700/40 flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const user = auth.user;
  const isAdmin = auth.isAdmin;
  const can = auth.can;

  const navigation = [
    ...(can("leads", "view") ? [{ name: "Leads", href: APP_ROUTES.leads, icon: Target }] : []),
    ...(can("clients", "view")
      ? [{ name: "Clients", href: APP_ROUTES.clients, icon: Building2 }]
      : []),
    { name: "Meetings", href: APP_ROUTES.meetings, icon: Calendar },
    { name: "BRD Studio", href: APP_ROUTES.brd, icon: BookText },
    { name: "Proposals", href: APP_ROUTES.proposals, icon: FileText },
    { name: "Agreements", href: APP_ROUTES.agreements, icon: FilePen },
    { name: "SOW Analyzer", href: APP_ROUTES.sow, icon: Search },
    ...(isAdmin ? [{ name: "Users", href: APP_ROUTES.users, icon: Users }] : []),
    ...(isAdmin ? [{ name: "Roles", href: "/roles", icon: ShieldCheck }] : []),
  ];

  const userMenuItems: MenuProps["items"] = [
    { key: "profile", label: user?.email, disabled: true },
    { type: "divider" },
    {
      key: "settings",
      icon: <Settings className="w-4 h-4" />,
      label: "Settings",
      onClick: () => router.push(APP_ROUTES.settings),
    },
    {
      key: "logout",
      icon: <LogOut className="w-4 h-4" />,
      label: "Log out",
      danger: true,
      onClick: () => auth.logout(),
    },
  ];

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col justify-between py-6">
      <div>
        <div
          className={`flex items-center px-5 mb-8 ${isDesktopCollapsed && !isMobile ? "justify-center px-0" : ""}`}
        >
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-black/30">
            <div className="w-4 h-4 bg-black rounded-[3px]" />
          </div>
          {(!isDesktopCollapsed || isMobile) && (
            <div className="ml-3">
              <span
                className="font-bold text-5xl tracking-tight block leading-tight"
                style={{ color: "#fff" }}
              >
                Apex
              </span>
            </div>
          )}
        </div>

        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => isMobile && setIsMobileOpen(false)}
                className={`relative flex items-center rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white/[0.08] !text-white shadow-sm"
                    : "hover:bg-white/5 hover:!text-white"
                } ${isDesktopCollapsed && !isMobile ? "justify-center px-0 py-3" : "px-3.5 py-3"}`}
                title={isDesktopCollapsed && !isMobile ? item.name : undefined}
                style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.5)" }}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-6 bg-white rounded-r-full" />
                )}
                <item.icon
                  className={`shrink-0 ${
                    isActive ? "!text-white" : ""
                  } ${isDesktopCollapsed && !isMobile ? "w-6 h-6" : "w-5 h-5 mr-3.5"}`}
                  style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.35)" }}
                  aria-hidden="true"
                />
                {(!isDesktopCollapsed || isMobile) && (
                  <span className="truncate" style={{ color: "inherit" }}>
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 mx-4 border-t border-zinc-800" />

        <nav className="mt-4 space-y-1 px-3">
          <Link
            href={APP_ROUTES.settings}
            onClick={() => isMobile && setIsMobileOpen(false)}
            className={`relative flex items-center rounded-xl text-sm font-semibold transition-all ${
              pathname === APP_ROUTES.settings
                ? "bg-white/[0.08] !text-white shadow-sm"
                : "hover:bg-white/5 hover:!text-white"
            } ${isDesktopCollapsed && !isMobile ? "justify-center px-0 py-3" : "px-3.5 py-3"}`}
            title={isDesktopCollapsed && !isMobile ? "Settings" : undefined}
            style={{ color: pathname === APP_ROUTES.settings ? "#fff" : "rgba(255,255,255,0.5)" }}
          >
            {pathname === APP_ROUTES.settings && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-6 bg-white rounded-r-full" />
            )}
            <Settings
              className={`shrink-0 ${isDesktopCollapsed && !isMobile ? "w-6 h-6" : "w-5 h-5 mr-3.5"} ${
                pathname === APP_ROUTES.settings ? "!text-white" : ""
              }`}
              style={{
                color: pathname === APP_ROUTES.settings ? "#fff" : "rgba(255,255,255,0.35)",
              }}
            />
            {(!isDesktopCollapsed || isMobile) && <span className="truncate">Settings</span>}
          </Link>
        </nav>
      </div>

      <div className="border-t border-zinc-800 pt-3 px-3 space-y-1">
        {user && (
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5 ${
              isDesktopCollapsed && !isMobile ? "justify-center px-2" : ""
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-zinc-700/40 flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0">
              {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
            </div>
            {(!isDesktopCollapsed || isMobile) && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white/80 truncate leading-tight">
                  {user.name || "User"}
                </p>
                <p className="text-[11px] text-white/30 truncate mt-0.5">{user.email}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          className={`w-full group flex items-center rounded-lg px-3 py-2 text-xs font-medium text-white/40 hover:bg-white/5 hover:text-white transition-all ${
            isDesktopCollapsed ? "justify-center" : ""
          }`}
        >
          {isDesktopCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <span className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Collapse
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-page flex selection:bg-zinc-900 selection:text-white">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 !bg-black border-r border-zinc-900 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-lg bg-white/5 text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent isMobile={true} />
      </div>

      <div
        className={`hidden lg:flex flex-col bg-black border-r border-zinc-900 transition-all duration-300 ease-in-out z-20 relative ${
          isDesktopCollapsed ? "w-[80px]" : "w-72"
        }`}
      >
        <SidebarContent isMobile={false} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-zinc-400 hover:bg-zinc-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
              <button className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-zinc-100 transition-colors">
                <UserAvatar name={user?.name ?? ""} email={user?.email ?? ""} />
                <span className="text-sm font-medium text-zinc-700 hidden sm:block">{user?.name || "User"}</span>
              </button>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
