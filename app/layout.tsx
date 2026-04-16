import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "CBD com Receita — Plataforma Médica para Tratamento com CBD",
    template: "%s | CBD com Receita",
  },
  description:
    "Conectamos você a médicos especializados em tratamentos com CBD. Consulta online com segurança, responsabilidade e acompanhamento médico estruturado.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://cbdcomreceita.com.br"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
