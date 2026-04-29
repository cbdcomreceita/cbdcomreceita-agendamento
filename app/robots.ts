import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.cbdcomreceita.com.br";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The booking funnel is intentionally no-index — landing on a
      // mid-funnel page (without the prior triage state) makes no sense
      // for an organic search visitor.
      disallow: [
        "/api/",
        "/triagem/",
        "/agenda/",
        "/dados/",
        "/pagamento/",
        "/confirmacao/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
