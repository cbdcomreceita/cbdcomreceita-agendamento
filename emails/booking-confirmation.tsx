import {
  Html, Head, Body, Container, Section, Text, Link, Hr, Img, Button, Preview,
} from "@react-email/components";

interface BookingConfirmationProps {
  patientName: string;
  doctorName: string;
  doctorCrm?: string;
  dateFormatted: string;
  duration: string;
  meetLink?: string;
}

export function BookingConfirmationEmail({
  patientName,
  doctorName,
  doctorCrm,
  dateFormatted,
  duration,
  meetLink,
}: BookingConfirmationProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Sua consulta com {doctorName} foi agendada com sucesso</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={logoStyle}>CBD com Receita</Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            <Text style={greetingStyle}>Olá, {patientName}!</Text>
            <Text style={headlineStyle}>
              Sua consulta foi agendada com sucesso!
            </Text>

            {/* Details card */}
            <Section style={cardStyle}>
              <Text style={cardLabelStyle}>Médico(a)</Text>
              <Text style={cardValueStyle}>
                {doctorName}
                {doctorCrm && ` — ${doctorCrm}`}
              </Text>

              <Text style={cardLabelStyle}>Data e horário</Text>
              <Text style={cardValueStyle}>{dateFormatted}</Text>

              <Text style={cardLabelStyle}>Duração</Text>
              <Text style={cardValueStyle}>{duration}</Text>

              <Text style={cardLabelStyle}>Formato</Text>
              <Text style={cardValueStyle}>Videochamada via Google Meet</Text>
            </Section>

            {meetLink ? (
              <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Button href={meetLink} style={meetButtonStyle}>
                  Acessar consulta via Google Meet
                </Button>
              </Section>
            ) : (
              <Section style={{ marginTop: "24px" }}>
                <Text style={meetFallbackStyle}>
                  O link do Google Meet será enviado por e-mail antes da consulta.
                </Text>
              </Section>
            )}

            <Hr style={hrStyle} />

            {/* Rules */}
            <Text style={rulesTitle}>Informações importantes</Text>
            <Text style={ruleStyle}>
              • Acesse o link do Google Meet no horário agendado
            </Text>
            <Text style={ruleStyle}>
              • Em caso de atraso superior a 10 minutos, será necessário novo
              agendamento com pagamento
            </Text>
            <Text style={ruleStyle}>
              • Para remarcar, entre em contato pelo WhatsApp (84) 99704-8210
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerText}>
              CBD com Receita — Plataforma médica para tratamento com CBD
            </Text>
            <Text style={footerText}>
              Esta mensagem foi enviada automaticamente. Não responda este e-mail.
            </Text>
            <Text style={footerText}>
              <Link href="https://cbdcomreceita.com.br/privacidade" style={linkStyle}>
                Política de Privacidade
              </Link>
              {" | "}
              <Link href="https://cbdcomreceita.com.br/termos" style={linkStyle}>
                Termos de Uso
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f2efe8",
  fontFamily: "'Source Serif 4', Georgia, serif",
  margin: "0",
  padding: "0",
};

const containerStyle = {
  maxWidth: "560px",
  margin: "0 auto",
};

const headerStyle = {
  backgroundColor: "#4e5f50",
  padding: "24px 32px",
  borderRadius: "12px 12px 0 0",
};

const logoStyle = {
  color: "#f2efe8",
  fontSize: "20px",
  fontWeight: "700" as const,
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  margin: "0",
};

const contentStyle = {
  backgroundColor: "#ffffff",
  padding: "32px",
};

const greetingStyle = {
  color: "#5c5c5c",
  fontSize: "14px",
  margin: "0 0 8px 0",
};

const headlineStyle = {
  color: "#2d3e2f",
  fontSize: "22px",
  fontWeight: "700" as const,
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  margin: "0 0 24px 0",
};

const cardStyle = {
  backgroundColor: "#f2efe8",
  borderRadius: "12px",
  padding: "20px 24px",
};

const cardLabelStyle = {
  color: "#8a8a8a",
  fontSize: "11px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "12px 0 2px 0",
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
};

const cardValueStyle = {
  color: "#2b2b2b",
  fontSize: "15px",
  margin: "0 0 4px 0",
};

const meetButtonStyle = {
  backgroundColor: "#4e5f50",
  color: "#f2efe8",
  padding: "14px 28px",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: "600" as const,
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  textDecoration: "none",
};

const meetFallbackStyle = {
  backgroundColor: "#f2efe8",
  border: "1px solid #e5e0d4",
  borderRadius: "10px",
  padding: "14px 18px",
  color: "#5c5c5c",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0",
};

const hrStyle = {
  borderColor: "#e5e0d4",
  margin: "24px 0",
};

const rulesTitle = {
  color: "#2d3e2f",
  fontSize: "14px",
  fontWeight: "600" as const,
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  margin: "0 0 12px 0",
};

const ruleStyle = {
  color: "#5c5c5c",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0 0 6px 0",
};

const footerStyle = {
  padding: "24px 32px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#8a8a8a",
  fontSize: "12px",
  margin: "0 0 6px 0",
};

const linkStyle = {
  color: "#4e5f50",
  textDecoration: "underline",
};

export default BookingConfirmationEmail;
