export const APP_ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  reports: "/reports",
  login: "/login",
  register: "/register",
  clients: "/clients",
  documents: "/documents",
  meetings: "/meetings",
  legal: "/legal",
  finance: "/finance",
  knowledge: "/knowledge",
  brd: "/brd",
  proposals: "/proposals",
  agreements: "/agreements",
  sow: "/sow",
  leads: "/leads",
  leadFinder: "/lead-finder",
  roles: "/roles",
  users: "/users",
  settings: "/settings",
} as const;

export const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
} as const;
