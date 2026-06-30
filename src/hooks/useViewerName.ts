import { useState } from "react";

/**
 * Manages the viewer's display name, persisted in sessionStorage
 * scoped to a specific BRD token. Once set, the name is reused for
 * all comment forms within the session — users are not asked again.
 */
export function useViewerName(token: string) {
  const storageKey = `brd_viewer_name_${token}`;

  const [viewerName, setViewerNameState] = useState<string>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(storageKey) ?? "" : ""
  );

  const saveViewerName = (name: string) => {
    const trimmed = name.trim();
    sessionStorage.setItem(storageKey, trimmed);
    setViewerNameState(trimmed);
  };

  return { viewerName, saveViewerName };
}
