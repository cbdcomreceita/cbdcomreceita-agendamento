import type { NextConfig } from "next";

// Content-Security-Policy directive list. CSP is shipped as
// Report-Only on first deploy: violations are logged in the browser
// console and (eventually) reported, but nothing is blocked. Once we
// review the violation report from real traffic, we'll switch the
// header name to `Content-Security-Policy` to enforce.
//
// Origins included by purpose:
//   self                          — own origin, default
//   *.vercel-scripts.com          — Vercel runtime scripts (Speed Insights, etc.)
//   sdk.mercadopago.com           — MP front-end SDK (if/when used)
//   www.mercadopago.com[.br]      — MP-hosted frames during checkout
//   www.googletagmanager.com      — GTM container + GA4 gtag.js
//   *.googletagmanager.com        — GTM/GA collect endpoints
//   *.google-analytics.com        — GA4 collect endpoints
//   connect.facebook.net          — Meta Pixel script
//   www.facebook.com              — Meta Pixel collect endpoint
//   fonts.googleapis.com / .gstatic.com — Google Fonts CSS + woff
//   *.supabase.co                 — Supabase REST/Realtime/Storage
//   api.cal.com                   — Cal.com API (currently server-only,
//                                   listed defensively)
//   viacep.com.br                 — CEP autofill on /dados (client-side)
//   *.resend.com                  — Resend (server-only today, listed
//                                   defensively for any future client use)
const csp = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://sdk.mercadopago.com",
    "https://*.vercel-scripts.com",
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
  ].join(" "),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http:",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "https://api.mercadopago.com",
    "https://api.cal.com",
    "https://*.resend.com",
    "https://viacep.com.br",
    "https://www.googletagmanager.com",
    "https://*.googletagmanager.com",
    "https://*.google-analytics.com",
    "https://connect.facebook.net",
    "https://www.facebook.com",
  ].join(" "),
  [
    "frame-src 'self'",
    "https://www.mercadopago.com.br",
    "https://www.mercadopago.com",
    "https://www.googletagmanager.com",
  ].join(" "),
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HSTS — keep prod on HTTPS only, opt into the preload list.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Anti-clickjacking. frame-ancestors in CSP would supersede
          // this for modern browsers; X-Frame-Options stays for legacy.
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Block MIME sniffing.
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Strip Referer on cross-origin navigation; full URL stays
          // for same-origin so analytics still work.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Disable browser APIs we don't use. interest-cohort opts
          // out of FLoC / Topics. payment=() is safe — the PIX flow
          // uses a copy-paste QR, not the Payment Request API.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()",
          },
          // CSP in Report-Only first. Switch the header name to
          // `Content-Security-Policy` once the violation report comes
          // back clean (or after we close known gaps).
          {
            key: "Content-Security-Policy-Report-Only",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
