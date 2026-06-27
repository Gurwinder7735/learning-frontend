export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  clients: "/clients",
  documents: "/documents",
  meetings: "/meetings",
  proposals: "/proposals",
  legal: "/legal",
  finance: "/finance",
  knowledge: "/knowledge",
  intelligence: "/intelligence",
  brd: "/brd",
  leads: "/leads",
  roles: "/roles",
  users: "/users",
  settings: "/settings",
} as const;

export const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
} as const;
