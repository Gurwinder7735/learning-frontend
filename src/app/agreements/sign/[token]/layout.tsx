import type { Metadata } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;

    const [agreementRes, brandingRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/v1/agreements/share/${token}`, { next: { revalidate: 60 } }),
      fetch(`${API_BASE_URL}/api/v1/branding`, { next: { revalidate: 300 } }),
    ]);

    let companyName = "Apex";
    if (brandingRes.status === "fulfilled" && brandingRes.value.ok) {
      const bj = await brandingRes.value.json();
      if (bj?.data?.companyName) companyName = bj.data.companyName;
    }

    if (agreementRes.status === "fulfilled" && agreementRes.value.ok) {
      const json = await agreementRes.value.json();
      const agreement = json.data;

      const name: string = agreement.name ?? "Agreement";
      const isProtected: boolean = agreement.isPasswordProtected ?? false;
      const isReview: boolean = agreement.status === "review";

      const title = `${name} — ${companyName}`;
      const description = isProtected
        ? `${name} — Password protected document shared by ${companyName}`
        : isReview
          ? `${name} — Shared for review by ${companyName}. This document is not yet ready for signing.`
          : agreement.clientName
            ? `${agreement.agreementType || "Agreement"} prepared for ${agreement.clientName} by ${companyName}. Review and sign electronically.`
            : `Electronic agreement shared by ${companyName}. Review and sign securely online.`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "article",
          siteName: companyName,
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
    title: "Agreement — Apex",
    description: "Electronic agreement — review and sign securely online.",
  };
}

export default function AgreementSignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
