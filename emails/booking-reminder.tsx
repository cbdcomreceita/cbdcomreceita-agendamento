import {
  Html, Head, Body, Container, Section, Text, Link, Hr, Button, Preview,
} from "@react-email/components";

interface BookingReminderProps {
  patientName: string;
  doctorName: string;
  dateFormatted: string;
  meetLink?: string;
  reminderType: "24h" | "1h";
}

export function BookingReminderEmail({
  patientName,
  doctorName,
  dateFormatted,
  meetLink,
  reminderType,
}: BookingReminderProps) {
  const headline =
    reminderType === "24h"
      ? "Lembrete: sua consulta é amanhã!"
      : "Sua consulta começa em 1 hora!";

  const previewText =
    reminderType === "24h"
      ? `Sua consulta com ${doctorName} é amanhã`
      : `Sua consulta com ${doctorName} começa em 1 hora`;

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={logoStyle}>CBD com Receita</Text>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Olá, {patientName}!</Text>
            <Text style={headlineStyle}>{headline}</Text>

            <Section style={cardStyle}>
              <Text style={cardLabelStyle}>Médico(a)</Text>
              <Text style={cardValueStyle}>{doctorName}</Text>

              <Text style={cardLabelStyle}>Data e horário</Text>
              <Text style={cardValueStyle}>{dateFormatted}</Text>

              <Text style={cardLabelStyle}>Duração</Text>
              <Text style={cardValueStyle}>25 minutos</Text>
            </Section>

            {meetLink && (
              <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Button href={meetLink} style={meetButtonStyle}>
                  Acessar consulta
                </Button>
              </Section>
            )}

            <Hr style={hrStyle} />

            <Text style={ruleStyle}>
              ⚠️ Em caso de atraso superior a 10 minutos, será necessário novo
              agendamento com pagamento.
            </Text>

            <Section style={{ textAlign: "center" as const, marginTop: "16px" }}>
              <Button
                href="https://wa.me/5584997048210?text=Ol%C3%A1!%20Preciso%20remarcar%20minha%20consulta."
                style={whatsappButtonStyle}
              >
                Precisa remarcar? Fale no WhatsApp
              </Button>
            </Section>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerText}>
              CBD com Receita — Plataforma médica para tratamento com CBD
            </Text>
            <Text style={footerText}>
              <Link href="https://cbdcomreceita.com.br/privacidade" style={linkStyle}>
                Política de Privacidade
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

const containerStyle = { maxWidth: "560px", margin: "0 auto" };

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

const contentStyle = { backgroundColor: "#ffffff", padding: "32px" };

const greetingStyle = { color: "#5c5c5c", fontSize: "14px", margin: "0 0 8px 0" };

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

const cardValueStyle = { color: "#2b2b2b", fontSize: "15px", margin: "0 0 4px 0" };

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

const whatsappButtonStyle = {
  backgroundColor: "#25D366",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: "600" as const,
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  textDecoration: "none",
};

const hrStyle = { borderColor: "#e5e0d4", margin: "24px 0" };

const ruleStyle = {
  color: "#5c5c5c",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0",
};

const footerStyle = { padding: "24px 32px", textAlign: "center" as const };

const footerText = { color: "#8a8a8a", fontSize: "12px", margin: "0 0 6px 0" };

const linkStyle = { color: "#4e5f50", textDecoration: "underline" };

export default BookingReminderEmail;
