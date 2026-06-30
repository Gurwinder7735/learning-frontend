import { useEffect, useState } from "react";
import type { BRD, BRDComment } from "@/types/models/BRD";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface BRDShareBranding {
  companyName: string;
  tagline: string | null;
  logoPath: string | null;
}

interface UseBRDShareResult {
  brd: BRD | null;
  branding: BRDShareBranding | null;
  allComments: BRDComment[];
  loading: boolean;
  notFound: boolean;
  isGated: boolean;
  logoUrl: string | null;
  companyName: string;
  setBrd: (brd: BRD) => void;
  setIsGated: (v: boolean) => void;
  addComment: (c: BRDComment) => void;
  deleteComment: (id: string) => void;
  updateComment: (c: BRDComment) => void;
}

export function useBRDShare(token: string): UseBRDShareResult {
  const [brd, setBrd] = useState<BRD | null>(null);
  const [branding, setBranding] = useState<BRDShareBranding | null>(null);
  const [allComments, setAllComments] = useState<BRDComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isGated, setIsGated] = useState(false);

  useEffect(() => {
    const fetchBRDAndBranding = async () => {
      try {
        const [brdRes, brandingRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}`),
          fetch(`${API_BASE_URL}/api/v1/branding`),
        ]);

        if (brdRes.status === "fulfilled" && brdRes.value.ok) {
          const json = await brdRes.value.json();
          const data = json.data as BRD;
          if (data.isPasswordProtected) {
            setIsGated(true);
          }
          setBrd(data);
        } else {
          setNotFound(true);
        }

        if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
          const json = await brandingRes.value.json();
          const d = json.data;
          setBranding({
            companyName: d.companyName || "",
            tagline: d.tagline || null,
            logoPath: d.logoPath || null,
          });
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    const fetchComments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}/comments`);
        if (res.ok) {
          const json = await res.json();
          setAllComments(json.data || []);
        }
      } catch { /* silent */ }
    };

    fetchBRDAndBranding();
    fetchComments();
  }, [token]);

  const logoUrl = branding?.logoPath
    ? `${API_BASE_URL}${branding.logoPath}`
    : null;

  const companyName = branding?.companyName || "Business Analysis Team";

  const addComment = (c: BRDComment) =>
    setAllComments((prev) => [...prev, c]);

  const deleteComment = (id: string) =>
    setAllComments((prev) => prev.filter((c) => c.id !== id));

  const updateComment = (updated: BRDComment) =>
    setAllComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

  return {
    brd,
    branding,
    allComments,
    loading,
    notFound,
    isGated,
    logoUrl,
    companyName,
    setBrd,
    setIsGated,
    addComment,
    deleteComment,
    updateComment,
  };
}
