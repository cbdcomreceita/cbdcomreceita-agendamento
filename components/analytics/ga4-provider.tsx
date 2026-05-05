"use client";

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;
const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID;

export function GA4Provider() {
  if (!GA_ID) return null;

  const gadsConfig = GADS_ID ? `gtag('config','${GADS_ID}');` : "";

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true,cookie_flags:'SameSite=None;Secure'});${gadsConfig}`,
        }}
      />
    </>
  );
}
