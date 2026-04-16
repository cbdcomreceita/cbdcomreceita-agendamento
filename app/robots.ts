import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cbdcomreceita.com.br";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/triagem/", "/agendamento/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
