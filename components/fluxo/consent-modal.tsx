"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

export function TermsModal() {
  return (
    <Dialog>
      <DialogTrigger className="mt-0.5 flex items-center gap-1 text-xs text-brand-forest underline underline-offset-2 hover:text-brand-forest-dark">
        <ExternalLink className="h-3 w-3" /> Ler termo completo
      </DialogTrigger>
      <DialogContent className="max-h-[70vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Termo de Consentimento Livre e Esclarecido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-brand-text-secondary">
          <p className="text-xs uppercase tracking-widest text-brand-text-muted">Para tratamento com canabinoides em telemedicina</p>

          <div>
            <p className="font-semibold text-brand-text">1. Objeto</p>
            <p className="mt-1">O presente Termo de Consentimento Livre e Esclarecido tem por finalidade registrar que o(a) paciente foi devidamente informado(a), em ambiente de telemedicina, sobre avaliação clínica, eventual prescrição e possível utilização de produtos à base de canabinoides, incluindo seus potenciais benefícios, riscos, limitações e alternativas terapêuticas.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">2. Atendimento em Telemedicina</p>
            <p className="mt-1">Declaro estar ciente e de acordo que:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>O atendimento ocorrerá de forma remota, sem exame físico direto;</li>
              <li>Existem limitações diagnósticas inerentes à telemedicina;</li>
              <li>A qualidade do atendimento depende das condições técnicas disponíveis;</li>
              <li>Comprometo-me a fornecer informações completas, verdadeiras e atualizadas.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-brand-text">3. Fluxo do Serviço</p>
            <p className="mt-1">Declaro estar ciente de que:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>A consulta não implica obrigatoriamente em prescrição;</li>
              <li>A eventual prescrição médica decorre de avaliação clínica individual;</li>
              <li>A importação de produtos, quando aplicável, depende de requisitos regulatórios e poderá ser intermediada por empresa especializada;</li>
              <li>O envio de produtos depende de terceiros, não havendo garantia de prazos ou disponibilidade contínua.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-brand-text">4. Uso Off-Label</p>
            <p className="mt-1">Declaro estar ciente de que o tratamento pode envolver uso off-label, caracterizado pela utilização fora das indicações aprovadas em bula ou por autoridades regulatórias. Reconheço que tal prática pode ser adotada com base em evidências científicas e julgamento clínico, os resultados são incertos e individualizados, e podem existir riscos não completamente conhecidos.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">5. Ausência de Garantia de Resultados</p>
            <p className="mt-1">Estou ciente de que não há garantia de eficácia terapêutica, podendo não haver melhora ou ocorrer agravamento do quadro clínico.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">6. Riscos e Efeitos Adversos</p>
            <p className="mt-1">Fui informado(a) sobre possíveis efeitos adversos, incluindo:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Sonolência, tontura, confusão mental;</li>
              <li>Alterações gastrointestinais;</li>
              <li>Alterações de humor ou comportamento;</li>
              <li>Interações medicamentosas;</li>
              <li>Reações individuais imprevisíveis.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-brand-text">7. Responsabilidade pelas Informações</p>
            <p className="mt-1">Declaro que forneci informações completas e verídicas sobre histórico médico, medicamentos, suplementos e substâncias, hábitos de vida e condições alimentares. Reconheço que omissões ou informações incorretas afastam a responsabilidade dos profissionais e da empresa.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">8. Interações Medicamentosas</p>
            <p className="mt-1">Declaro estar ciente de que interações podem ocorrer e que a responsabilidade pela atualização contínua dessas informações é exclusivamente minha.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">9. Adesão ao Tratamento</p>
            <p className="mt-1">Comprometo-me a seguir rigorosamente as orientações médicas. O uso em desacordo com as orientações exclui a responsabilidade dos profissionais e da empresa.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">10. Cancelamento ou Ausência</p>
            <p className="mt-1">Ciente de que meu atendimento terá tolerância de 10 minutos do horário agendado, meu não comparecimento sem justificativa formal desobriga a empresa ao reagendamento e/ou estorno de valores.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">11. Limitações da Telemedicina</p>
            <p className="mt-1">Reconheço que posso ser orientado(a) a buscar atendimento presencial sempre que necessário, sendo minha responsabilidade fazê-lo.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">12. Origem e Importação dos Produtos</p>
            <p className="mt-1">Declaro estar ciente de que os produtos podem ser importados e não possuir registro definitivo no Brasil; a liberação depende de órgãos reguladores e pode sofrer atrasos; o transporte é realizado por terceiros, podendo haver intercorrências fora do controle da empresa.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">13. Limitação de Responsabilidade</p>
            <p className="mt-1">Declaro compreender que o tratamento envolve riscos inerentes, as decisões clínicas são baseadas nas informações fornecidas remotamente, e não haverá responsabilização por ausência de resultado, efeitos adversos imprevisíveis ou fatores externos.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">14. Autonomia do Paciente</p>
            <p className="mt-1">Declaro que recebi informações suficientes, claras e adequadas, tive oportunidade de esclarecer dúvidas, estou tomando a decisão de forma livre, consciente e voluntária, e assumo integralmente os riscos inerentes à escolha terapêutica.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">15. Gravação do Atendimento</p>
            <p className="mt-1">Autorizo expressamente a gravação das consultas realizadas por telemedicina, para fins de registro clínico, segurança jurídica, auditoria e qualidade.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">16. Privacidade e Dados</p>
            <p className="mt-1">Estou ciente de que meus dados serão tratados conforme a legislação vigente (LGPD), reconhecendo os riscos inerentes ao ambiente digital.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">17. Eleição de Foro</p>
            <p className="mt-1">Fica eleito o foro da comarca de Indaiatuba/SP para dirimir quaisquer controvérsias oriundas deste termo.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">18. Revogação do Consentimento</p>
            <p className="mt-1">Posso revogar este consentimento a qualquer momento, mediante comunicação formal. Declaro que li, compreendi integralmente este termo e concordo livremente com seus termos.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PrivacyModal() {
  return (
    <Dialog>
      <DialogTrigger className="mt-0.5 flex items-center gap-1 text-xs text-brand-forest underline underline-offset-2 hover:text-brand-forest-dark">
        <ExternalLink className="h-3 w-3" /> Ler Política de Privacidade
      </DialogTrigger>
      <DialogContent className="max-h-[70vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Política de Privacidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-brand-text-secondary">
          <p className="text-xs text-brand-text-muted">Última atualização: Fevereiro de 2026</p>
          <p>A CBD com Receita tem o compromisso de proteger a privacidade e os dados pessoais de seus usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).</p>

          <div>
            <p className="font-semibold text-brand-text">1. Quem Somos</p>
            <p className="mt-1">A CBD com Receita é uma plataforma médica estruturada que conecta pacientes a médicos prescritores para avaliação individualizada de tratamentos com canabidiol (CBD).</p>
            <p className="mt-1">Controlador dos dados: CBD com Receita</p>
            <p>E-mail para contato: contato@cbdcomreceita.com.br</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">2. Dados que Coletamos</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Dados cadastrais:</strong> nome completo, e-mail, telefone, CPF, RG, data de nascimento, endereço completo.</li>
              <li><strong>Dados de saúde (sensíveis):</strong> sintomas, histórico de medicamentos, histórico de uso de CBD, informações clínicas.</li>
              <li><strong>Dados de navegação:</strong> endereço IP, navegador, páginas acessadas, cookies.</li>
              <li><strong>Dados de pagamento:</strong> dados da transação PIX (processados pelo Mercado Pago — não armazenamos dados bancários).</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-brand-text">3. Finalidades</p>
            <p className="mt-1">Agendamento e realização de consulta médica. Direcionamento ao médico adequado. Envio de confirmações e lembretes. Processamento de pagamento. Orientação sobre importação. Cumprimento de obrigações legais. Melhoria da plataforma.</p>
            <p className="mt-1">O tratamento de dados de saúde ocorre com base no seu consentimento expresso (Art. 11, I da LGPD).</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">4. Compartilhamento</p>
            <p className="mt-1">Compartilhamos dados apenas com: médicos prescritores parceiros, Mercado Pago (pagamento), Cal.com (agendamento), Google Meet (videochamada), Resend (e-mails), Anvisa (quando aplicável).</p>
            <p className="mt-2 font-medium text-brand-text">Não vendemos, alugamos ou comercializamos seus dados pessoais.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">5. Segurança</p>
            <p className="mt-1">Criptografia em trânsito (HTTPS/TLS), controle de acesso restrito, Row Level Security no banco de dados, registro de auditoria, armazenamento seguro com backups criptografados.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">6. Retenção</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Dados cadastrais e de saúde: mínimo 20 anos (Resolução CFM nº 1.821/2007).</li>
              <li>Dados de pagamento: 5 anos.</li>
              <li>Dados de navegação: 6 meses.</li>
              <li>Registros de consentimento: vigência + 5 anos.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-brand-text">7. Seus Direitos (Art. 18 da LGPD)</p>
            <p className="mt-1">Confirmação e acesso aos dados. Correção. Anonimização, bloqueio ou eliminação. Portabilidade. Revogação do consentimento.</p>
            <p className="mt-1">Contato: contato@cbdcomreceita.com.br com assunto &quot;Direitos LGPD&quot;. Resposta em até 15 dias úteis.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">8. Cookies</p>
            <p className="mt-1">Essenciais (funcionamento), análise (Google Analytics 4), marketing (Meta Pixel). Gerenciáveis via banner de cookies.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">9. Transferência Internacional</p>
            <p className="mt-1">Alguns prestadores processam dados fora do Brasil, amparados por cláusulas contratuais padrão.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">10. Menores de 18 Anos</p>
            <p className="mt-1">Dados de menores tratados apenas com consentimento de responsável legal.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">11. Alterações</p>
            <p className="mt-1">Esta política pode ser atualizada. Alterações relevantes serão notificadas por e-mail ou aviso na plataforma.</p>
          </div>

          <div>
            <p className="font-semibold text-brand-text">12. Contato</p>
            <p className="mt-1">E-mail: contato@cbdcomreceita.com.br</p>
            <p>WhatsApp: (84) 99704-8210</p>
            <p>ANPD: https://www.gov.br/anpd</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
