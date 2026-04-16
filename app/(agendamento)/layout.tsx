import Link from "next/link";
import Image from "next/image";

export default function AgendamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-cream">
      {/* Minimal header */}
      <header className="border-b border-brand-sand/50 bg-white/80 px-5 py-3 backdrop-blur-sm sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/">
            <Image
              src="/images/logo_horizontal_transparente.png"
              alt="CBD com Receita"
              width={200}
              height={80}
              className="h-10 w-auto sm:h-12"
              priority
            />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
