export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-brand-forest-dark sm:text-5xl">
        CBD com Receita
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-brand-text-secondary">
        Plataforma médica para acesso seguro a tratamentos com CBD.
      </p>
      <div className="mt-8 rounded-lg border border-brand-sand bg-white/60 px-6 py-4">
        <p className="text-sm text-brand-text-muted">
          Em construção — em breve conectaremos você a médicos especializados.
        </p>
      </div>
    </main>
  );
}
