import type { Metadata } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;
    const res = await fetch(`${API_BASE_URL}/api/v1/brd/brds/share/${token}`, {
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const json = await res.json();
      const brd = json.data;

      // If password protected, keep title but show no content hint
      const name: string = brd.name ?? "Business Requirements Document";
      const isProtected: boolean = brd.isPasswordProtected ?? false;

      const title = name;
      const description = isProtected
        ? `${name} — Password protected document`
        : brd.clientName
          ? `Business Requirements Document prepared for ${brd.clientName}`
          : "AI-generated Business Requirements Document";

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "article",
          siteName: "Apex BRD Intelligence",
        },
        twitter: {
          card: "summary",
          title,
          description,
        },
      };
    }
  } catch {
    // silent — fall through to defaults
  }

  return {
    title: "Business Requirements Document",
    description: "AI-generated Business Requirements Document — Apex BRD Intelligence",
  };
}

export default function SharedBRDLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
