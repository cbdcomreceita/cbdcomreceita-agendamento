import {
  Html, Head, Body, Container, Section, Text, Hr, Preview,
} from "@react-email/components";

export interface PatientIntakeDoctorProps {
  doctorName: string;
  patientName: string;
  patientCpf: string;
  patientAge: number;
  patientPhone: string;
  symptoms: string;
  currentMedications: string;
  priorCbdUse: string;
  dateFormatted: string;
  timeFormatted: string;
}

export function PatientIntakeDoctorEmail(props: PatientIntakeDoctorProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Nova consulta agendada com {props.patientName}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={logoStyle}>CBD com Receita</Text>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{props.doctorName},</Text>
            <Text style={headlineStyle}>Nova consulta agendada</Text>
            <Text style={subheadlineStyle}>
              Dados do paciente para consulta em{" "}
              <strong>{props.dateFormatted}</strong> às{" "}
              <strong>{props.timeFormatted}</strong>.
            </Text>

            <Section style={cardStyle}>
              <Row label="Nome" value={props.patientName} />
              <Row label="CPF" value={props.patientCpf} />
              <Row label="Idade" value={`${props.patientAge} anos`} />
              <Row label="Sintomas" value={props.symptoms} />
              <Row label="Medicamentos em uso" value={props.currentMedications} />
              <Row label="Histórico CBD" value={props.priorCbdUse} />
              <Row label="Telefone" value={props.patientPhone} />
            </Section>

            <Hr style={hrStyle} />

            <Text style={noteStyle}>
              Acesse o Google Agenda ou o Cal.com para o link do Google Meet.
              Em caso de cancelamento ou remarcação, entre em contato com a
              equipe.
            </Text>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerText}>
              CBD com Receita — Este e-mail contém dados sensíveis de paciente.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={cardLabelStyle}>{label}</Text>
      <Text style={cardValueStyle}>{value}</Text>
    </>
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
  margin: "0 0 8px 0",
};

const subheadlineStyle = {
  color: "#5c5c5c",
  fontSize: "14px",
  lineHeight: "1.6",
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
  lineHeight: "1.5",
};

const hrStyle = { borderColor: "#e5e0d4", margin: "24px 0" };

const noteStyle = {
  color: "#5c5c5c",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0",
};

const footerStyle = { padding: "24px 32px", textAlign: "center" as const };

const footerText = { color: "#8a8a8a", fontSize: "12px", margin: "0" };

export default PatientIntakeDoctorEmail;
