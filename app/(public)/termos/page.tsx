import type { Metadata } from "next";
import { Header } from "@/components/brand/header";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso e consentimento da plataforma CBD com Receita.",
};

export default function TermosPage() {
  return (
    <>
      <Header />
      <main id="conteudo-principal" className="bg-brand-cream px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
        <article className="mx-auto max-w-3xl rounded-2xl border border-brand-sand/60 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
            Termo de Consentimento Livre e Esclarecido
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-brand-text-muted">
            Para tratamento com canabinoides em telemedicina
          </p>

          <div className="mt-8 space-y-6 text-sm leading-[1.8] text-brand-text-secondary">
            <section>
              <h2 className="font-semibold text-brand-text">1. Objeto</h2>
              <p className="mt-1">O presente Termo de Consentimento Livre e Esclarecido tem por finalidade registrar que o(a) paciente foi devidamente informado(a), em ambiente de telemedicina, sobre avaliação clínica, eventual prescrição e possível utilização de produtos à base de canabinoides, incluindo seus potenciais benefícios, riscos, limitações e alternativas terapêuticas.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">2. Atendimento em Telemedicina</h2>
              <p className="mt-1">Declaro estar ciente e de acordo que:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>O atendimento ocorrerá de forma remota, sem exame físico direto;</li>
                <li>Existem limitações diagnósticas inerentes à telemedicina;</li>
                <li>A qualidade do atendimento depende das condições técnicas disponíveis;</li>
                <li>Comprometo-me a fornecer informações completas, verdadeiras e atualizadas.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">3. Fluxo do Serviço</h2>
              <p className="mt-1">Declaro estar ciente de que:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>A consulta não implica obrigatoriamente em prescrição;</li>
                <li>A eventual prescrição médica decorre de avaliação clínica individual;</li>
                <li>A importação de produtos, quando aplicável, depende de requisitos regulatórios e poderá ser intermediada por empresa especializada;</li>
                <li>O envio de produtos depende de terceiros, não havendo garantia de prazos ou disponibilidade contínua.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">4. Uso Off-Label</h2>
              <p className="mt-1">Declaro estar ciente de que o tratamento pode envolver uso off-label, caracterizado pela utilização fora das indicações aprovadas em bula ou por autoridades regulatórias. Reconheço que tal prática pode ser adotada com base em evidências científicas e julgamento clínico, os resultados são incertos e individualizados, e podem existir riscos não completamente conhecidos.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">5. Ausência de Garantia de Resultados</h2>
              <p className="mt-1">Estou ciente de que não há garantia de eficácia terapêutica, podendo não haver melhora ou ocorrer agravamento do quadro clínico.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">6. Riscos e Efeitos Adversos</h2>
              <p className="mt-1">Fui informado(a) sobre possíveis efeitos adversos, incluindo:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Sonolência, tontura, confusão mental;</li>
                <li>Alterações gastrointestinais;</li>
                <li>Alterações de humor ou comportamento;</li>
                <li>Interações medicamentosas;</li>
                <li>Reações individuais imprevisíveis.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">7. Responsabilidade pelas Informações</h2>
              <p className="mt-1">Declaro que forneci informações completas e verídicas sobre histórico médico, medicamentos, suplementos e substâncias, hábitos de vida e condições alimentares. Reconheço que omissões ou informações incorretas afastam a responsabilidade dos profissionais e da empresa.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">8. Interações Medicamentosas</h2>
              <p className="mt-1">Declaro estar ciente de que interações podem ocorrer e que a responsabilidade pela atualização contínua dessas informações é exclusivamente minha.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">9. Adesão ao Tratamento</h2>
              <p className="mt-1">Comprometo-me a seguir rigorosamente as orientações médicas. O uso em desacordo com as orientações exclui a responsabilidade dos profissionais e da empresa.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">10. Cancelamento ou Ausência</h2>
              <p className="mt-1">Ciente de que meu atendimento terá tolerância de 10 minutos do horário agendado, meu não comparecimento sem justificativa formal desobriga a empresa ao reagendamento e/ou estorno de valores.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">11. Limitações da Telemedicina</h2>
              <p className="mt-1">Reconheço que posso ser orientado(a) a buscar atendimento presencial sempre que necessário, sendo minha responsabilidade fazê-lo.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">12. Origem e Importação dos Produtos</h2>
              <p className="mt-1">Declaro estar ciente de que os produtos podem ser importados e não possuir registro definitivo no Brasil; a liberação depende de órgãos reguladores e pode sofrer atrasos; o transporte é realizado por terceiros, podendo haver intercorrências fora do controle da empresa.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">13. Limitação de Responsabilidade</h2>
              <p className="mt-1">Declaro compreender que o tratamento envolve riscos inerentes, as decisões clínicas são baseadas nas informações fornecidas remotamente, e não haverá responsabilização por ausência de resultado, efeitos adversos imprevisíveis ou fatores externos.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">14. Autonomia do Paciente</h2>
              <p className="mt-1">Declaro que recebi informações suficientes, claras e adequadas, tive oportunidade de esclarecer dúvidas, estou tomando a decisão de forma livre, consciente e voluntária, e assumo integralmente os riscos inerentes à escolha terapêutica.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">15. Gravação do Atendimento</h2>
              <p className="mt-1">Autorizo expressamente a gravação das consultas realizadas por telemedicina, para fins de registro clínico, segurança jurídica, auditoria e qualidade.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">16. Privacidade e Dados</h2>
              <p className="mt-1">Estou ciente de que meus dados serão tratados conforme a legislação vigente (LGPD), reconhecendo os riscos inerentes ao ambiente digital.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">17. Eleição de Foro</h2>
              <p className="mt-1">Fica eleito o foro da comarca de Indaiatuba/SP para dirimir quaisquer controvérsias oriundas deste termo.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">18. Revogação do Consentimento</h2>
              <p className="mt-1">Posso revogar este consentimento a qualquer momento, mediante comunicação formal. Declaro que li, compreendi integralmente este termo e concordo livremente com seus termos.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
