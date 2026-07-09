import type { Metadata } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;

    const [featureRes, brandingRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/v1/sow/features/share/${token}`, { next: { revalidate: 60 } }),
      fetch(`${API_BASE_URL}/api/v1/branding`, { next: { revalidate: 300 } }),
    ]);

    let companyName = "Apex";
    if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
      const bj = await brandingRes.value.json();
      if (bj?.data?.companyName) companyName = bj.data.companyName;
    }

    if (featureRes.status === "fulfilled" && featureRes.value.ok) {
      const json = await featureRes.value.json();
      const feature = json.data;

      const name: string = feature.featureName ?? "Feature Document";
      const module: string = feature.featureModule ?? "";
      const isProtected: boolean = feature.isPasswordProtected ?? false;

      const title = module ? `${name} (${module}) — ${companyName}` : `${name} — ${companyName}`;
      const description = isProtected
        ? `${name} — Password protected feature document shared by ${companyName}`
        : feature.featureBrief
          ? feature.featureBrief
          : `Product feature document shared by ${companyName}`;

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
    title: "Feature Document — Apex",
    description: "Product feature document",
  };
}

export default function FeatureShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
