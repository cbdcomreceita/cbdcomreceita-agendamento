import {
  Html, Head, Body, Container, Section, Text, Hr, Link, Preview,
} from "@react-email/components";

export interface PatientIntakeTeamProps {
  // Consulta
  dateFormatted: string;
  timeFormatted: string;
  doctorName: string;
  doctorCrm: string;
  meetLink?: string;
  // Paciente
  patientName: string;
  patientCpf: string;
  patientRg: string;
  patientBirthDate: string;
  patientAge: number;
  patientEmail: string;
  patientPhone: string;
  // Endereço
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZipcode: string;
  // Triagem
  symptoms: string;
  duration: string;
  currentMedications: string;
  priorCbdUse: string;
  notes?: string;
  // Consentimento
  lgpdConsentAt: string;
  termsConsentAt: string;
  // Pagamento
  paymentAmount: string;
  paymentStatus: string;
  paymentDate: string;
}

export function PatientIntakeTeamEmail(props: PatientIntakeTeamProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        Nova consulta agendada — {props.patientName} com {props.doctorName}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={logoStyle}>CBD com Receita</Text>
          </Section>

          <Section style={contentStyle}>
            <Text style={headlineStyle}>
              Nova consulta agendada — Ficha completa
            </Text>
            <Text style={subheadlineStyle}>
              Consulta com <strong>{props.doctorName}</strong> em{" "}
              <strong>{props.dateFormatted}</strong> às{" "}
              <strong>{props.timeFormatted}</strong>.
            </Text>

            <SectionTitle>Consulta</SectionTitle>
            <Section style={cardStyle}>
              <Row label="Data" value={props.dateFormatted} />
              <Row label="Horário" value={props.timeFormatted} />
              <Row label="Duração" value="25 minutos" />
              <Row label="Médico" value={`${props.doctorName} — ${props.doctorCrm}`} />
              <Row
                label="Link Google Meet"
                value={
                  props.meetLink ? (
                    <Link href={props.meetLink} style={linkStyle}>
                      {props.meetLink}
                    </Link>
                  ) : (
                    "Pendente"
                  )
                }
              />
            </Section>

            <SectionTitle>Paciente</SectionTitle>
            <Section style={cardStyle}>
              <Row label="Nome" value={props.patientName} />
              <Row label="CPF" value={props.patientCpf} />
              <Row label="RG" value={props.patientRg} />
              <Row label="Data de nascimento" value={props.patientBirthDate} />
              <Row label="Idade" value={`${props.patientAge} anos`} />
              <Row label="E-mail" value={props.patientEmail} />
              <Row label="Telefone" value={props.patientPhone} />
            </Section>

            <SectionTitle>Endereço</SectionTitle>
            <Section style={cardStyle}>
              <Row label="Rua" value={props.addressStreet} />
              <Row label="Número" value={props.addressNumber} />
              {props.addressComplement && (
                <Row label="Complemento" value={props.addressComplement} />
              )}
              <Row label="Bairro" value={props.addressDistrict} />
              <Row label="Cidade" value={props.addressCity} />
              <Row label="Estado" value={props.addressState} />
              <Row label="CEP" value={props.addressZipcode} />
            </Section>

            <SectionTitle>Triagem</SectionTitle>
            <Section style={cardStyle}>
              <Row label="Sintomas" value={props.symptoms} />
              <Row label="Há quanto tempo" value={props.duration} />
              <Row label="Medicamentos em uso" value={props.currentMedications} />
              <Row label="Histórico CBD" value={props.priorCbdUse} />
              {props.notes && <Row label="Observações" value={props.notes} />}
            </Section>

            <SectionTitle>Consentimento</SectionTitle>
            <Section style={cardStyle}>
              <Row label="Aceite LGPD" value={props.lgpdConsentAt} />
              <Row
                label="Aceite Termo de Consentimento"
                value={props.termsConsentAt}
              />
            </Section>

            <SectionTitle>Pagamento</SectionTitle>
            <Section style={cardStyle}>
              <Row label="Valor" value={props.paymentAmount} />
              <Row label="Status" value={props.paymentStatus} />
              <Row label="Data" value={props.paymentDate} />
            </Section>

            <Hr style={hrStyle} />
            <Text style={noteStyle}>
              Ficha gerada automaticamente após confirmação do pagamento.
              Dados sensíveis — manter em ambiente seguro.
            </Text>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerText}>
              CBD com Receita — Plataforma médica para tratamento com CBD
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={sectionTitleStyle}>{children}</Text>;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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

const containerStyle = { maxWidth: "640px", margin: "0 auto" };

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

const sectionTitleStyle = {
  color: "#4e5f50",
  fontSize: "12px",
  fontWeight: "700" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
  margin: "24px 0 8px 0",
};

const cardStyle = {
  backgroundColor: "#f2efe8",
  borderRadius: "12px",
  padding: "16px 20px",
};

const cardLabelStyle = {
  color: "#8a8a8a",
  fontSize: "11px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "10px 0 2px 0",
  fontFamily: "'Source Sans 3', system-ui, sans-serif",
};

const cardValueStyle = {
  color: "#2b2b2b",
  fontSize: "14px",
  margin: "0 0 4px 0",
  lineHeight: "1.5",
};

const linkStyle = {
  color: "#4e5f50",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const hrStyle = { borderColor: "#e5e0d4", margin: "24px 0" };

const noteStyle = {
  color: "#5c5c5c",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "0",
  fontStyle: "italic" as const,
};

const footerStyle = { padding: "24px 32px", textAlign: "center" as const };

const footerText = { color: "#8a8a8a", fontSize: "12px", margin: "0" };

export default PatientIntakeTeamEmail;
