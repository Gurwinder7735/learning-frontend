import type { ModulePermission } from "@/types/models/User";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: ModulePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface RolesState {
  items: Role[];
  isLoading: boolean;
  error: string | null;
}

export interface RoleCreatePayload {
  name: string;
  description?: string;
  permissions: ModulePermission[];
}

export interface RoleUpdatePayload {
  id: string;
  data: Partial<RoleCreatePayload>;
}

export const MODULE_OPTIONS = [
  { value: "leads", label: "Leads" },
  { value: "clients", label: "Clients" },
  { value: "users", label: "Users" },
] as const;

export const ACTION_OPTIONS = [
  { value: "view", label: "View" },
  { value: "create", label: "Create" },
  { value: "edit", label: "Edit" },
  { value: "delete", label: "Delete" },
] as const;
