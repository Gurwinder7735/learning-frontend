import type { Metadata } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;

    const [sowRes, brandingRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/v1/sow/share/${token}`, { next: { revalidate: 60 } }),
      fetch(`${API_BASE_URL}/api/v1/branding`, { next: { revalidate: 300 } }),
    ]);

    let companyName = "Apex";
    if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
      const bj = await brandingRes.value.json();
      if (bj?.data?.companyName) companyName = bj.data.companyName;
    }

    if (sowRes.status === "fulfilled" && sowRes.value.ok) {
      const json = await sowRes.value.json();
      const sow = json.data;

      const name: string = sow.name ?? "Product Discovery Analysis";
      const isProtected: boolean = sow.isPasswordProtected ?? false;
      const featureCount: number = sow.featureCount ?? (sow.features?.length ?? 0);

      const title = `${name} — ${companyName}`;
      const description = isProtected
        ? `${name} — Password protected analysis shared by ${companyName}`
        : sow.clientName
          ? `Product Discovery Analysis for ${sow.clientName} — ${featureCount} features. Shared by ${companyName}.`
          : `Product Discovery Analysis — ${featureCount} features. Shared by ${companyName}.`;

      return {
        title,
        description,
        openGraph: { title, description, type: "article", siteName: companyName },
        twitter: { card: "summary", title, description },
      };
    }
  } catch {
    // silent
  }

  return {
    title: "Product Discovery Analysis — Apex",
    description: "AI-generated Product Discovery Analysis",
  };
}

export default function SOWShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
