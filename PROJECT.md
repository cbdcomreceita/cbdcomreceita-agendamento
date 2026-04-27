# CBD com Receita — Plataforma SaaS

> Contexto permanente deste projeto. **Claude Code deve ler este arquivo no início de cada sessão.**

---

## 1. O que é

Plataforma que conecta pacientes a médicos especializados em tratamentos com CBD. Paciente faz triagem por sintomas, é direcionado ao médico adequado, agenda consulta online via Google Meet, paga R$49,90 via PIX, e recebe confirmação + lembretes.

**Escopo MVP**: fluxo vai até a consulta confirmada. Acompanhamento pós-consulta e prontuário expandido ficam pra versão 2.

**Não somos**: uma empresa de cannabis, clínica de cannabis, ou plataforma de wellness alternativo. Somos **plataforma médica responsável** pra acesso seguro a tratamentos com CBD.

---

## 2. Princípios de produto (não negociáveis)

1. **Responsabilidade médica antes de conversão.** Se conflita, responsabilidade ganha.
2. **Transparência em cada etapa.** Paciente sempre sabe onde está no fluxo e o que vem depois.
3. **Linguagem clara, não técnica demais.** Traduz ciência pra linguagem humana.
4. **Zero associação com cultura recreativa.** Nem visual, nem copy, nem referências.
5. **Mobile-first.** Maioria dos pacientes vai acessar pelo celular.
6. **LGPD compliance total.** Consentimento explícito, dados criptografados, finalidade clara.
7. **Fácil manutenção.** Adicionar/remover médicos e sintomas deve ser simples (dados em arquivo TS, não hardcoded em componentes).

---

## 3. Stack técnica

### Frontend
- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** (strict mode)
- **Tailwind CSS v4**
- **shadcn/ui** (componentes base)
- **Framer Motion** (microinterações)
- **Lucide Icons**
- **React Hook Form + Zod** (validação)

### Backend/Infra
- **Supabase** (Postgres + Auth + Storage + RLS)
- **Vercel** (hosting + serverless functions + cron)
- **Next.js Server Actions** (operações privilegiadas)

### Integrações
- **Cal.com** (booking + Google Meet + Google Calendar)
- **Mercado Pago** (PIX — sandbox inicialmente, produção depois)
- **Meta WhatsApp Cloud API** (notificações — quando aprovada)
- **Resend** (e-mail transacional, fallback e primário no MVP)
- **React Email** (templates de e-mail em JSX)

### Analytics & Marketing
- **Google Analytics 4** (GA4) — tracking de eventos e conversão
- **Meta Pixel** (Facebook/Instagram) — remarketing e otimização de campanhas
- **Google Tag Manager** (GTM) — container unificado pra todas as tags
- **Google Search Console** — monitorar SEO
- **Schema.org / JSON-LD** — structured data pra rich snippets (MedicalBusiness, FAQPage, Physician)

### SEO
- **next/metadata** — meta tags dinâmicas por página
- **Sitemap.xml** — gerado automaticamente via next-sitemap
- **robots.txt** — configurado
- **Open Graph + Twitter Cards** — pra compartilhamento social
- **Canonical URLs** — evitar conteúdo duplicado

### Dev Tools
- **pnpm** (package manager)
- **Claude Code** (desenvolvimento assistido)
- **Git + GitHub**

---

## 4. Paleta de cores (oficial da marca)

```css
/* CORES OFICIAIS DA MARCA */
--brand-forest: #4e5f50;       /* Verde profundo — ações primárias, headlines */
--brand-forest-light: #7c8b74; /* Verde claro — secundário, hover states */
--brand-sand: #d9cfc0;         /* Areia — backgrounds secundários, bordas suaves */
--brand-cream: #f2efe8;        /* Creme/off-white — background principal */

/* DERIVADAS (geradas a partir das oficiais) */
--brand-forest-hover: #5a6b5c;   /* Forest hover (10% mais claro) */
--brand-forest-active: #3e4f40;  /* Forest active (10% mais escuro) */
--brand-forest-dark: #2d3e2f;    /* Forest dark (headlines, textos fortes) */
--brand-sand-deep: #c9bfb0;      /* Areia intenso (seções alternadas) */

/* TEXTO */
--text-primary: #2b2b2b;         /* Grafite — texto principal */
--text-secondary: #5c5c5c;       /* Texto secundário */
--text-muted: #8a8a8a;           /* Captions, meta */
--text-on-dark: #f2efe8;         /* Texto sobre fundo escuro (forest) */

/* ESTADOS */
--success: #4a7c59;
--warning: #c89b3c;
--error: #b04545;
--info: #5a7a8c;

/* NEUTRAS */
--white: #ffffff;
--neutral-border: #e5e0d4;
--neutral-divider: #d9d3c5;
```

**Uso das cores por contexto:**
- **Botão CTA primário**: fundo `forest` (#4e5f50), texto `cream` (#f2efe8)
- **Botão secundário**: fundo transparente, borda `forest`, texto `forest`
- **Botão ghost**: transparente, texto `forest`, hover fundo `cream`
- **Background principal**: `cream` (#f2efe8)
- **Background seções alternadas**: `white` (#ffffff) ou `sand` (#d9cfc0)
- **Seções invertidas (destaque)**: fundo `forest` ou `forest-dark`, texto `cream`
- **Headlines**: `forest-dark` ou `text-primary`
- **Body text**: `text-primary`
- **Captions/meta**: `text-muted`
- **Acentos/destaques sutis**: `forest-light` (#7c8b74)

---

## 5. Tipografia

- **Títulos / Headlines**: **Source Sans Pro** — Google Fonts (sans-serif, clean, profissional)
- **Corpo / Body / UI**: **Source Serif Pro** — Google Fonts (serif, legível, premium)

**Hierarquia:**
- Hero: Source Sans Pro, 48-64px, weight 700, letter-spacing -0.01em
- H1: Source Sans Pro, 36-44px, weight 700
- H2: Source Sans Pro, 28-32px, weight 600
- H3: Source Sans Pro, 20-24px, weight 600
- Body: Source Serif Pro, 16-18px, weight 400, line-height 1.7
- Small: Source Serif Pro, 14px, weight 400
- Caption: Source Sans Pro, 12px, weight 600, uppercase, letter-spacing 0.05em
- Button: Source Sans Pro, 16px, weight 600

---

## 6. Tom de voz (pra copy)

✅ **Usa**:
- Claro, educativo, acolhedor, elegante
- "Conectamos você a médicos especializados"
- "Seu equilíbrio importa"
- "Cuidado moderno e responsável"

❌ **Evita**:
- Ativismo canábico
- Linguagem recreativa ("maconha", "weed", etc)
- Promessas de cura
- Exageros de marketing ("revolucionário", "milagroso")
- Jargão técnico sem tradução

---

## 7. Estrutura de diretórios

```
cbdcomreceita/
├── app/
│   ├── (public)/              # Rotas públicas
│   │   ├── page.tsx           # Landing page
│   │   ├── faq/
│   │   ├── termos/
│   │   └── privacidade/
│   ├── (agendamento)/         # Fluxo de agendamento (layout simplificado)
│   │   ├── triagem/           # Quiz (multi-step, mesmo URL com state)
│   │   ├── medico/            # Tela do médico matched
│   │   ├── agenda/            # Cal.com embed
│   │   ├── dados/             # Form de dados (TODOS os campos, obrigatórios)
│   │   ├── pagamento/         # PIX
│   │   └── confirmacao/
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── mercadopago/
│   │   │   └── calcom/
│   │   └── cron/
│   │       └── lembretes/
│   └── layout.tsx
├── components/
│   ├── ui/                    # shadcn/ui
│   ├── brand/                 # Logo, tipografia, cores
│   ├── sections/              # Seções da landing
│   ├── fluxo/                 # Componentes do fluxo agendamento
│   └── analytics/             # GTM, Pixel, GA4 providers
├── lib/
│   ├── supabase/
│   ├── calcom/
│   ├── mercadopago/
│   ├── whatsapp/              # Meta Cloud API
│   ├── resend/
│   ├── triagem/               # Lógica de matching sintoma→médico
│   ├── analytics/             # Event tracking helpers
│   └── utils.ts
├── data/
│   ├── medicos.ts             # Dados dos médicos (fácil de editar)
│   ├── sintomas.ts            # Catálogo de sintomas
│   └── sintoma-medico-map.ts  # Mapeamento N:N com prioridade
├── emails/                    # React Email templates
├── supabase/
│   └── migrations/            # SQL versionado
├── public/
│   ├── images/                # Fotos médicos, assets
│   └── og/                    # Open Graph images
├── PROJECT.md                 # este arquivo
└── ...
```

---

## 8. Médicos parceiros

### Prioridade de direcionamento (quando sintomas cruzam médicos):
1. **Dra. Carolina Lopes** (prioridade máxima)
2. **Dr. Magno Cruz** (prioridade 2 — também cobre menores de 18 e maiores de 65)

> **Nota:** Dra. Lilian permanece no código (`is_active = false`) mas não aparece publicamente nem no matching. Pra reativar, basta setar `isActive: true` em `data/medicos.ts` e refazer o mapeamento.

### Mapeamento sintoma → médico

**Dra. Carolina Lopes** (CRM 215691/SP — Psiquiatria — carol.lopes411@hotmail.com):
- Ansiedade
- Insônia
- Estresse
- Mente acelerada
- Burnout
- Depressão
- Enxaqueca
- Tremor essencial
- Síndrome do pânico
- TDAH
- Perda de peso

**Dr. Magno Cruz** (CRM 28892/SC — Clínico Geral — drmagnocruz@gmail.com):
- Dores no corpo
- Fibromialgia
- Epilepsia
- Autismo
- Alcoolismo
- Obesidade
- Tabagismo
- Parkinson
- Pacientes menores de 18 anos (qualquer sintoma)
- Pacientes maiores de 65 anos (qualquer sintoma)

### Regra de matching
```
1. Se paciente < 18 anos OU > 65 anos → médico ativo de menor priority com handles_minors/elderly = true (hoje: Dr. Magno Cruz)
2. Se múltiplos sintomas apontam pra médicos diferentes → priorizar Carol > Magno
3. Se sintoma tem médico único → direcionar pra ele
4. Se empate → Carol
```

### Fácil manutenção
Dados ficam em `data/medicos.ts` e `data/sintoma-medico-map.ts`. Pra adicionar médico:
1. Adicionar entrada em `medicos.ts`
2. Atualizar mapeamento em `sintoma-medico-map.ts`
3. Criar event type no Cal.com pro novo médico
4. Rodar migration no Supabase pra sincronizar

---

## 9. Schema do banco (visão rápida — detalhe em `supabase/migrations/`)

### Tabelas principais
- `doctors` — médicos parceiros
- `symptoms` — catálogo de sintomas
- `symptom_doctor_map` — N:N entre sintomas e médicos (com prioridade)
- `patients` — pacientes (TODOS os campos obrigatórios, coletados no formulário)
- `bookings` — agendamentos
- `payments` — pagamentos
- `notifications_log` — auditoria de notificações
- `audit_events` — log de auditoria (LGPD)

### Campos do paciente (TODOS obrigatórios no formulário)
- Nome completo
- E-mail
- Telefone (WhatsApp)
- CPF
- RG
- Data de nascimento
- Endereço completo (rua, número, complemento, bairro, cidade, estado, CEP)
- Sintomas/quadro
- Já toma medicamento pra esses sintomas? Se sim, qual?
- Já fez ou faz uso de CBD?
- Consentimento LGPD (checkbox + timestamp)
- Termo de responsabilidade (checkbox + timestamp)

### RLS
- **Service role** (backend): bypass total
- **Anon**: leitura apenas de doctors e symptoms (dados públicos)
- **Dados sensíveis (patients, bookings, payments)**: sem acesso público

---

## 10. Variáveis de ambiente

```bash
# NEXT PUBLIC
NEXT_PUBLIC_SITE_URL=https://cbdcomreceita.com.br
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GA_MEASUREMENT_ID=         # GA4
NEXT_PUBLIC_GTM_ID=                     # Google Tag Manager
NEXT_PUBLIC_META_PIXEL_ID=             # Facebook/Instagram Pixel
NEXT_PUBLIC_CONSULTATION_PRICE=4990    # Centavos. Alterável sem redeploy se usar Vercel env vars

# SERVER-ONLY
SUPABASE_SERVICE_ROLE_KEY=

# CAL.COM
CALCOM_API_KEY=
CALCOM_BASE_URL=https://cal.com/cbdcomreceita

# MERCADO PAGO (sandbox inicialmente)
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=

# META WHATSAPP CLOUD API (quando aprovada)
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_WHATSAPP_BUSINESS_ACCOUNT_ID=
META_WHATSAPP_APP_SECRET=

# RESEND
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@cbdcomreceita.com.br

# CRON SECRET
CRON_SECRET=
```

**Nota sobre preço da consulta**: valor em env var (`NEXT_PUBLIC_CONSULTATION_PRICE`) permite alterar via dashboard da Vercel sem precisar de novo deploy ou migration. Muda em 1 minuto quando o preço atualizar daqui 6 meses.

---

## 11. Analytics & Tracking Events

### Eventos obrigatórios (pra otimizar campanhas de tráfego)

```typescript
// Funil de conversão
'page_view'                    // Automático via GTM
'triagem_started'              // Clicou "Agendar consulta"
'triagem_step_completed'       // Completou cada step do quiz (com step number)
'triagem_emergency_shown'      // Tela de desvio de emergência exibida
'doctor_matched'               // Médico direcionado (com doctor_name)
'calendar_viewed'              // Viu agenda do Cal.com
'slot_selected'                // Selecionou horário
'form_started'                 // Iniciou preenchimento de dados
'form_completed'               // Concluiu formulário de dados
'payment_initiated'            // PIX gerado
'payment_completed'            // Pagamento confirmado (CONVERSÃO PRINCIPAL)
'booking_confirmed'            // Agendamento confirmado

// Engajamento
'faq_item_clicked'             // Qual pergunta do FAQ abriu
'cta_clicked'                  // Qual CTA, em qual seção
'section_viewed'               // Scroll tracking por seção da landing
```

### Meta Pixel — eventos padrão mapeados
- `PageView` → automático
- `ViewContent` → triagem_started
- `InitiateCheckout` → payment_initiated
- `Purchase` → payment_completed (com value: 49.90, currency: BRL)
- `Lead` → form_completed

### SEO estruturado (JSON-LD)
- **HomePage**: `MedicalBusiness` schema
- **FAQ**: `FAQPage` schema
- **Médicos**: `Physician` schema por médico
- Todas as páginas: `BreadcrumbList`

---

## 12. Princípios de engenharia

1. **Server Actions > API Routes** quando possível
2. **Validação com Zod em TODAS as entradas**
3. **Supabase service_role APENAS server-side**
4. **Todo webhook valida assinatura**
5. **Idempotência em webhooks**
6. **Logs estruturados**
7. **Erros nunca mostram stack ao usuário**
8. **Responsive-first mobile**
9. **Acessibilidade básica**
10. **LGPD**: timestamp de consentimento, finalidade declarada, link pra política de privacidade em todos os formulários
11. **Dados sensíveis (CPF, RG) devem ser tratados com cuidado**: não logar em plaintext, não expor em URLs

---

## 13. Comandos úteis

```bash
pnpm dev                      # Dev server
pnpm build                    # Build produção
pnpm lint                     # Lint
```

---

## 14. Status do projeto

- [x] Stack definida
- [x] Contas criadas (Supabase, Vercel, Cal.com, Meta em análise, MP em análise)
- [x] Dados médicos e sintomas definidos
- [ ] Bloco 1: Setup + estrutura base
- [ ] Bloco 2: Landing page
- [ ] Bloco 3: Quiz de triagem + matching
- [ ] Bloco 4: Integração Cal.com
- [ ] Bloco 5: Formulário de dados + consentimento LGPD
- [ ] Bloco 6: Checkout PIX Mercado Pago
- [ ] Bloco 7: Webhook MP → confirmação
- [ ] Bloco 8: Notificações (WhatsApp Cloud API + Resend e-mail)
- [ ] Bloco 9: Analytics (GA4, GTM, Meta Pixel, SEO)
- [ ] Bloco 10: Polish visual + copy + fotos
- [ ] Bloco 11: Testes E2E
- [ ] Bloco 12: Deploy produção + DNS

---

## 15. Como pedir coisas ao Claude Code

1. **Sempre inicia sessão lendo este arquivo**
2. **Use Plan Mode pro início de cada bloco**
3. **Um bloco por sessão**
4. **Mostra referências visuais quando necessário**
5. **Revisa diffs antes de aceitar**
6. **Testa incrementalmente**
7. **Commita por bloco**

---

_Última atualização: Dia 0 — pré-requisitos completos._

---

## 16. Referência visual — Site atual (cbdcomreceita.com.br)

O site atual é a referência de qualidade visual e copy. A nova plataforma deve **manter ou superar** o nível de design atual. Principais referências:

### Estrutura da home atual (manter/adaptar)
1. **Hero**: "Plataforma médica estruturada para tratamento com CBD" + sub + 2 CTAs
2. **Credibilidade**: "Cuidado em saúde exige estrutura" — atendimento online, importação, entrega
3. **Condições tratáveis**: ansiedade, sono, dor, regulação emocional, neuro
4. **Tratamento consciente**: orientação clara, discrição, acompanhamento estruturado
5. **Como funciona**: 3 passos (avaliação → organização regulatória → entrega)
6. **Qualidade e rastreabilidade**: conformidade, critérios internacionais, entrega segura
7. **FAQ**: 6 perguntas
8. **CTA final**: "Inicie sua avaliação médica com segurança"
9. **Footer**: logo, contatos, links legais

### Quem Somos (referência pro tom)
- "Não atuamos como e-commerce de medicamentos nem como intermediários comerciais"
- "Organizamos o acesso ao tratamento de forma estruturada"
- "A aquisição ocorre diretamente entre paciente e fornecedor"
- Compromisso com responsabilidade e conformidade
- 4 pilares: avaliação individualizada, conformidade regulatória, processo de importação, transparência

### Elementos visuais do site atual
- **Logo**: "CBD com Receita" com ícone de folha estilizada (NÃO recreativa)
- **Imagens**: médico(a) de jaleco (genérica), gotejador de óleo CBD, planta sutil
- **Estilo**: clean, espaçamento generoso, tons quentes (areia/creme/verde)
- **Tipografia do site atual**: já usa as cores oficiais da marca
- **Cards**: ícones lineares, fundo areia, cantos arredondados suaves

### O que MUDA na nova plataforma (vs site atual)
- CTAs vão direto pro **fluxo de agendamento** (não WhatsApp)
- **Quiz de triagem** por sintomas antes do agendamento
- **Seção de médicos** com foto real (Dra. Carolina Lopes)
- **Formulário completo** de dados do paciente + consentimento LGPD
- **Pagamento PIX** integrado (Mercado Pago)
- **Confirmação automática** + lembretes (e-mail + WhatsApp)
- **Analytics completo** (GA4, GTM, Meta Pixel)
- **SEO estruturado** (JSON-LD, sitemap, OG)

### Fotos disponíveis
- `dra-carolina-lopes.jpg` — foto profissional de jaleco (usar no card de médico)
- Demais médicos: placeholder com iniciais até ter fotos reais

### Contatos da empresa (footer)
- WhatsApp: (84) 99704-8210
- E-mail: cbdcomreceita@gmail.com
- Site: cbdcomreceita.com.br
