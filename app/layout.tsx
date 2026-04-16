import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4e5f50",
};

export const metadata: Metadata = {
  title: {
    default: "CBD com Receita — Plataforma Médica para Tratamento com CBD",
    template: "%s | CBD com Receita",
  },
  description:
    "Plataforma médica estruturada para tratamento com CBD. Avaliação clínica individualizada, conformidade regulatória e entrega domiciliar. Consulta online R$49,90.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://cbdcomreceita.com.br"
  ),
  alternates: {
    canonical: "/",
    languages: { "pt-BR": "/" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CBD com Receita",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        {/* Skip link — accessibility */}
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-forest focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-cream focus:shadow-lg"
        >
          Pular para o conteúdo principal
        </a>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
