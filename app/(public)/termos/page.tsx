import type { Metadata } from "next";
import { Header } from "@/components/brand/header";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso da plataforma CBD com Receita.",
};

export default function TermosPage() {
  return (
    <>
      <Header />
      <main id="conteudo-principal" className="bg-brand-cream px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
        <article className="mx-auto max-w-3xl rounded-2xl border border-brand-sand/60 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
            Termos de Uso
          </h1>
          <p className="mt-2 text-xs text-brand-text-muted">Última atualização: Abril de 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-[1.8] text-brand-text-secondary">
            <p>Ao acessar e utilizar esta plataforma, você declara que leu, compreendeu e concorda com os presentes Termos de Uso.</p>

            <section>
              <h2 className="font-semibold text-brand-text">1. Sobre a Plataforma</h2>
              <p className="mt-1">A CBD com Receita é uma plataforma de saúde que conecta pacientes a médicos prescritores para avaliação individualizada e, quando indicado, viabiliza o acesso ao tratamento com CBD, incluindo consultoria de importação e entrega domiciliar.</p>
              <p className="mt-1">A Plataforma não substitui atendimento de urgência ou emergência. Em situações de risco, procure o SAMU (192) ou CVV (188).</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">2. Cadastro</h2>
              <p className="mt-1">O Usuário deve fornecer informações pessoais verdadeiras, completas e atualizadas. Informações incorretas ou incompletas podem comprometer o atendimento e isentam a CBD com Receita de responsabilidade.</p>
              <p className="mt-1">O tratamento dos dados pessoais segue nossa Política de Privacidade, em conformidade com a LGPD (Lei nº 13.709/2018).</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">3. Consulta, Pagamento e Cancelamento</h2>
              <p className="mt-1">A consulta é confirmada mediante pagamento antecipado de R$&nbsp;49,90 via PIX. Atraso superior a 10 minutos ou não comparecimento implica novo agendamento com pagamento integral. Reagendamentos devem ser solicitados com pelo menos 24 horas de antecedência. A CBD com Receita pode cancelar consultas por motivos operacionais, oferecendo reagendamento ou reembolso.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">4. Prescrição</h2>
              <p className="mt-1">A consulta não garante emissão de prescrição. A decisão de prescrever é de responsabilidade exclusiva do médico, com base em avaliação clínica individualizada e em conformidade com as normas da Anvisa e do CFM.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">5. Acesso ao Tratamento</h2>
              <p className="mt-1">Quando houver prescrição, a CBD com Receita realiza a consultoria necessária para viabilizar o acesso ao tratamento, incluindo a condução do processo de importação e entrega no domicílio do paciente. Este processo depende de requisitos regulatórios e de terceiros, não havendo garantia de prazos ou disponibilidade.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">6. Limitação de Responsabilidade</h2>
              <p className="mt-1">A CBD com Receita não se responsabiliza por:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Condutas médicas e resultados terapêuticos;</li>
                <li>Atrasos decorrentes de processos regulatórios ou logísticos de terceiros;</li>
                <li>Indisponibilidade temporária da Plataforma por motivos técnicos ou de força maior;</li>
                <li>Danos decorrentes de informações incorretas fornecidas pelo Usuário;</li>
                <li>Falhas de conexão e equipamentos do Usuário.</li>
              </ul>
              <p className="mt-2">A responsabilidade da CBD com Receita limita-se ao valor pago pela consulta em questão.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">7. Propriedade Intelectual</h2>
              <p className="mt-1">Todo o conteúdo da Plataforma é de propriedade da CBD com Receita, protegido pelas leis vigentes. É vedada a reprodução ou utilização sem autorização prévia.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">8. Comunicações</h2>
              <p className="mt-1">Ao utilizar a Plataforma, o Usuário autoriza o recebimento de comunicações relacionadas ao serviço (confirmações, lembretes, orientações) por e-mail e/ou WhatsApp.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">9. Modificações</h2>
              <p className="mt-1">Estes Termos podem ser atualizados a qualquer momento. Alterações relevantes serão comunicadas por e-mail ou aviso na Plataforma.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">10. Legislação e Foro</h2>
              <p className="mt-1">Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de Indaiatuba/SP para dirimir quaisquer controvérsias.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">11. Contato</h2>
              <p className="mt-1">E-mail: contato@cbdcomreceita.com.br</p>
              <p>WhatsApp: (84) 99704-8210</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
