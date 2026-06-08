"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tag, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { APP_ROUTES } from "@/lib/constants/appConstants";
import {
  Users,
  Building2,
  FileText,
  Calendar,
  FileCheck,
  Scale,
  PiggyBank,
  BookOpen,
  FileSignature,
  Menu,
  X,
  Bell,
  Search,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function UserAvatar({ name, email }: { name: string; email: string }) {
  const initials = (name || email || "U").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
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

  const navigation = [
    { name: "Clients", href: APP_ROUTES.clients, icon: Building2 },
    { name: "Proposals", href: APP_ROUTES.proposals, icon: FileCheck },
    ...(isAdmin ? [{ name: "Users", href: APP_ROUTES.users, icon: Users }] : []),
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
          className={`flex items-center px-6 mb-8 ${isDesktopCollapsed && !isMobile ? "justify-center px-0" : ""}`}
        >
          <div className="w-8 h-8 bg-zinc-950 rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <div className="w-4 h-4 bg-white rounded-sm" />
          </div>
          {(!isDesktopCollapsed || isMobile) && (
            <span className="ml-3 text-zinc-950 font-bold text-lg tracking-tight truncate">
              Admin Platform
            </span>
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
                className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                } ${isDesktopCollapsed && !isMobile ? "justify-center" : ""}`}
                title={isDesktopCollapsed && !isMobile ? item.name : undefined}
              >
                <item.icon
                  className={`shrink-0 ${
                    isActive ? "text-zinc-950" : "text-zinc-400 group-hover:text-zinc-600"
                  } ${isDesktopCollapsed && !isMobile ? "w-6 h-6" : "w-5 h-5 mr-3"}`}
                  aria-hidden="true"
                />
                {(!isDesktopCollapsed || isMobile) && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-3 space-y-1">
        {/* User Profile Section */}
        {user && (
          <div
            className={`flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-zinc-50 ${
              isDesktopCollapsed && !isMobile ? "justify-center px-0" : ""
            }`}
          >
            <UserAvatar name={user.name} email={user.email} />
            {(!isDesktopCollapsed || isMobile) && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 truncate">{user.name || "User"}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {user.roles.map((role) => (
                    <Tag
                      key={role}
                      color={role === "admin" ? "red" : "blue"}
                      className="!text-[10px] !px-1 !py-0 !leading-none !m-0"
                    >
                      {role}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="space-y-1">
          <button
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            className={`w-full group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 transition-all justify-center`}
          >
            {isDesktopCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </nav>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-zinc-50 flex selection:bg-zinc-900 selection:text-white">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-zinc-200 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-lg bg-zinc-100 text-zinc-500 hover:text-zinc-950"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent isMobile={true} />
      </div>

      <div
        className={`hidden lg:flex flex-col bg-white border-r border-zinc-200 transition-all duration-300 ease-in-out z-20 relative ${
          isDesktopCollapsed ? "w-[80px]" : "w-72"
        }`}
      >
        <SidebarContent isMobile={false} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200/50 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-500 hover:bg-white hover:border-zinc-300 transition-all group w-64 max-w-sm">
              <Search className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-400 text-zinc-900"
              />
              <div className="flex items-center gap-1 shrink-0">
                <kbd className="hidden sm:inline-block text-[10px] bg-white border border-zinc-200 rounded px-1.5 py-0.5 font-mono text-zinc-400">
                  ⌘
                </kbd>
                <kbd className="hidden sm:inline-block text-[10px] bg-white border border-zinc-200 rounded px-1.5 py-0.5 font-mono text-zinc-400">
                  K
                </kbd>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-5 w-px bg-zinc-200 mx-1" />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
              <button className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-zinc-100 transition-colors">
                <UserAvatar name={user?.name ?? ""} email={user?.email ?? ""} />
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
