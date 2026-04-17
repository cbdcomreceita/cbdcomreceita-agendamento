import type { Metadata } from "next";
import { Header } from "@/components/brand/header";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de privacidade e proteção de dados da CBD com Receita, conforme LGPD.",
};

export default function PrivacidadePage() {
  return (
    <>
      <Header />
      <main id="conteudo-principal" className="bg-brand-cream px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
        <article className="mx-auto max-w-3xl rounded-2xl border border-brand-sand/60 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-xs text-brand-text-muted">Última atualização: Fevereiro de 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-[1.8] text-brand-text-secondary">
            <p>A CBD com Receita tem o compromisso de proteger a privacidade e os dados pessoais de seus usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).</p>

            <section>
              <h2 className="font-semibold text-brand-text">1. Quem Somos</h2>
              <p className="mt-1">A CBD com Receita é uma plataforma médica estruturada que conecta pacientes a médicos prescritores para avaliação individualizada de tratamentos com canabidiol (CBD).</p>
              <p className="mt-1">Controlador dos dados: CBD com Receita</p>
              <p>E-mail para contato: contato@cbdcomreceita.com.br</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">2. Dados que Coletamos</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><strong>Dados cadastrais:</strong> nome completo, e-mail, telefone, CPF, RG, data de nascimento, endereço completo.</li>
                <li><strong>Dados de saúde (sensíveis):</strong> sintomas, histórico de medicamentos, histórico de uso de CBD, informações clínicas.</li>
                <li><strong>Dados de navegação:</strong> endereço IP, navegador, páginas acessadas, cookies.</li>
                <li><strong>Dados de pagamento:</strong> dados da transação PIX (processados pelo Mercado Pago — não armazenamos dados bancários).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">3. Finalidades</h2>
              <p className="mt-1">Agendamento e realização de consulta médica. Direcionamento ao médico adequado. Envio de confirmações e lembretes. Processamento de pagamento. Orientação sobre importação. Cumprimento de obrigações legais. Melhoria da plataforma.</p>
              <p className="mt-1">O tratamento de dados de saúde ocorre com base no seu consentimento expresso (Art. 11, I da LGPD).</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">4. Compartilhamento</h2>
              <p className="mt-1">Compartilhamos dados apenas com: médicos prescritores parceiros, Mercado Pago (pagamento), Cal.com (agendamento), Google Meet (videochamada), Resend (e-mails), Anvisa (quando aplicável).</p>
              <p className="mt-2 font-medium text-brand-text">Não vendemos, alugamos ou comercializamos seus dados pessoais.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">5. Segurança</h2>
              <p className="mt-1">Criptografia em trânsito (HTTPS/TLS), controle de acesso restrito, Row Level Security no banco de dados, registro de auditoria, armazenamento seguro com backups criptografados.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">6. Retenção</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Dados cadastrais e de saúde: mínimo 20 anos (Resolução CFM nº 1.821/2007).</li>
                <li>Dados de pagamento: 5 anos.</li>
                <li>Dados de navegação: 6 meses.</li>
                <li>Registros de consentimento: vigência + 5 anos.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">7. Seus Direitos (Art. 18 da LGPD)</h2>
              <p className="mt-1">Confirmação e acesso aos dados. Correção. Anonimização, bloqueio ou eliminação. Portabilidade. Revogação do consentimento.</p>
              <p className="mt-1">Contato: contato@cbdcomreceita.com.br com assunto &quot;Direitos LGPD&quot;. Resposta em até 15 dias úteis.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">8. Cookies</h2>
              <p className="mt-1">Essenciais (funcionamento), análise (Google Analytics 4), marketing (Meta Pixel). Gerenciáveis via banner de cookies.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">9. Transferência Internacional</h2>
              <p className="mt-1">Alguns prestadores processam dados fora do Brasil, amparados por cláusulas contratuais padrão.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">10. Menores de 18 Anos</h2>
              <p className="mt-1">Dados de menores tratados apenas com consentimento de responsável legal.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">11. Alterações</h2>
              <p className="mt-1">Esta política pode ser atualizada. Alterações relevantes serão notificadas por e-mail ou aviso na plataforma.</p>
            </section>

            <section>
              <h2 className="font-semibold text-brand-text">12. Contato</h2>
              <p className="mt-1">E-mail: contato@cbdcomreceita.com.br</p>
              <p>WhatsApp: (84) 99704-8210</p>
              <p>ANPD: https://www.gov.br/anpd</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
