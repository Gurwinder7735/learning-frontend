import { useEffect, useState } from "react";
import type { Proposal, ProposalComment } from "@/types/models/Proposal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Company-branding blob that the share page overlays on the cover.
 * Same shape as BRD's; both share pages hit the same ``/branding`` endpoint.
 */
export interface ProposalShareBranding {
  companyName: string;
  tagline: string | null;
  logoPath: string | null;
}

interface UseProposalShareResult {
  proposal: Proposal | null;
  branding: ProposalShareBranding | null;
  allComments: ProposalComment[];
  loading: boolean;
  notFound: boolean;
  isGated: boolean;
  logoUrl: string | null;
  companyName: string;
  setProposal: (p: Proposal) => void;
  setIsGated: (v: boolean) => void;
  addComment: (c: ProposalComment) => void;
  deleteComment: (id: string) => void;
  updateComment: (c: ProposalComment) => void;
}

/**
 * Data-fetching hook for the public proposal share page.
 *
 * Mirrors :func:`useBRDShare` in shape:
 *   * Fetches the shared proposal + branding in parallel.
 *   * Flags ``isGated`` when the response says the doc is password-protected
 *     (in which case ``aiContent`` is missing and the caller renders
 *     ``<PasswordGate />``).
 *   * Manages the comments list with three imperative setters that mirror
 *     the mutations the ``InlineCommentLayer`` and ``CommentsSection``
 *     components perform.
 */
export function useProposalShare(token: string): UseProposalShareResult {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [branding, setBranding] = useState<ProposalShareBranding | null>(null);
  const [allComments, setAllComments] = useState<ProposalComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isGated, setIsGated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [proposalRes, brandingRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/proposals/proposals/share/${token}`),
          fetch(`${API_BASE_URL}/api/v1/branding`),
        ]);

        if (proposalRes.status === "fulfilled" && proposalRes.value.ok) {
          const json = await proposalRes.value.json();
          const data = json.data as Proposal;
          if (data.isPasswordProtected) setIsGated(true);
          setProposal(data);
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
        const res = await fetch(
          `${API_BASE_URL}/api/v1/proposals/proposals/share/${token}/comments`,
        );
        if (res.ok) {
          const json = await res.json();
          setAllComments(json.data || []);
        }
      } catch {
        /* silent */
      }
    };

    fetchData();
    fetchComments();
  }, [token]);

  const logoUrl = branding?.logoPath
    ? `${API_BASE_URL}${branding.logoPath}`
    : null;

  const companyName = branding?.companyName || "Business Analysis Team";

  const addComment = (c: ProposalComment) =>
    setAllComments((prev) => [...prev, c]);

  const deleteComment = (id: string) =>
    setAllComments((prev) => prev.filter((c) => c.id !== id));

  const updateComment = (updated: ProposalComment) =>
    setAllComments((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );

  return {
    proposal,
    branding,
    allComments,
    loading,
    notFound,
    isGated,
    logoUrl,
    companyName,
    setProposal,
    setIsGated,
    addComment,
    deleteComment,
    updateComment,
  };
}
