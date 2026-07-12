import type { Metadata } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Dynamic <head> metadata for the public share page. Fetches the shared
 * proposal (server-side, cached 60s) and uses its title + client name to
 * populate the browser tab title and social preview cards.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;
    const res = await fetch(
      `${API_BASE_URL}/api/v1/proposals/proposals/share/${token}`,
      { next: { revalidate: 60 } },
    );

    if (res.ok) {
      const json = await res.json();
      const proposal = json.data;

      const name: string = proposal.title ?? proposal.name ?? "Proposal";
      const isProtected: boolean = proposal.isPasswordProtected ?? false;

      const title = name;
      const description = isProtected
        ? `${name} — Password protected proposal`
        : proposal.clientName
          ? `Proposal prepared for ${proposal.clientName}`
          : "AI-generated proposal";

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "article",
          siteName: "Apex Proposals",
        },
        twitter: {
          card: "summary",
          title,
          description,
        },
      };
    }
  } catch {
    // Fall through to the defaults below on any error / network hiccup.
  }

  return {
    title: "Proposal",
    description: "AI-generated proposal — Apex",
  };
}

export default function SharedProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
