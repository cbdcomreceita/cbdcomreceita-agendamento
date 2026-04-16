"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FlowBreadcrumb } from "@/components/fluxo/flow-breadcrumb";
import { DoctorSummary } from "@/components/fluxo/doctor-summary";
import { loadTriageData } from "@/lib/triagem/storage";
import { loadBookingData } from "@/lib/calcom/storage";
import { savePatientData, loadPatientData } from "@/lib/validation/patient-storage";
import { patientSchema, UF_OPTIONS, type PatientFormData } from "@/lib/validation/patient";
import { fetchCep } from "@/lib/utils/viacep";
import { maskCpf, maskPhone, maskCep } from "@/lib/utils/masks";
import { medicos, type Medico } from "@/data/medicos";
import { sintomas } from "@/data/sintomas";
import { cn } from "@/lib/utils";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-brand-error">{message}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-forest-light">
      {children}
    </h3>
  );
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-brand-text">
      {children}
      {required && <span className="ml-0.5 text-brand-error/60">*</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border-2 border-brand-sand/60 bg-white px-4 py-3 text-sm text-brand-text placeholder:text-brand-text-muted/50 transition-colors focus:border-brand-forest focus:outline-none disabled:bg-brand-sand/20 disabled:text-brand-text-muted";

export default function DadosPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Medico | null>(null);
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [selectedSymptomLabels, setSelectedSymptomLabels] = useState<string[]>([]);
  const [priorCbd, setPriorCbd] = useState<string>("");
  const [cepLoading, setCepLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormData>({
    defaultValues: {
      hasCurrentMedication: false,
      lgpdConsent: false as unknown as true,
      termsConsent: false as unknown as true,
    },
  });

  useEffect(() => {
    const triage = loadTriageData();
    const booking = loadBookingData();

    if (!triage.selectedSymptoms?.length || !booking) {
      router.replace("/triagem");
      return;
    }

    const matched = medicos.find((d) => d.id === triage.matchedDoctorId);
    setDoctor(matched ?? null);
    setBookingDate(booking.scheduledAt);

    const labels = sintomas
      .filter((s) => triage.selectedSymptoms!.includes(s.slug) && !s.isEmergency)
      .map((s) => s.label);
    setSelectedSymptomLabels(labels);

    const cbdMap: Record<string, string> = {
      never: "Nunca",
      with_prescription: "Sim, com prescrição",
      self: "Sim, por conta própria",
      prefer_not_say: "Prefere não dizer",
    };
    setPriorCbd(cbdMap[triage.priorCbdUse ?? ""] ?? "");

    // Pre-fill birth date from triage
    if (triage.birthDate) {
      setValue("birthDate", triage.birthDate);
    }

    // Load saved patient data if any
    const saved = loadPatientData();
    if (saved) {
      const fields = ["fullName", "email", "phone", "cpf", "rg", "cep", "street", "number", "complement", "district", "city", "state"] as const;
      for (const f of fields) {
        if (saved[f]) setValue(f, saved[f] as string);
      }
    }

    setLoaded(true);
  }, [router, setValue]);

  // CEP auto-fill
  const cepValue = watch("cep");
  const handleCepBlur = useCallback(async () => {
    const clean = (cepValue ?? "").replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    const result = await fetchCep(clean);
    setCepLoading(false);
    if (result) {
      setValue("street", result.logradouro, { shouldValidate: true });
      setValue("district", result.bairro, { shouldValidate: true });
      setValue("city", result.localidade, { shouldValidate: true });
      setValue("state", result.uf as PatientFormData["state"], { shouldValidate: true });
    }
  }, [cepValue, setValue]);

  const hasMed = watch("hasCurrentMedication");
  const lgpdChecked = watch("lgpdConsent");
  const termsChecked = watch("termsConsent");

  async function onSubmit(data: PatientFormData) {
    // Validate with Zod
    const result = patientSchema.safeParse(data);
    if (!result.success) return;

    setSubmitting(true);
    savePatientData(result.data);
    router.push("/pagamento");
  }

  if (!loaded || !doctor) return null;

  const formattedDate = bookingDate
    ? format(parseISO(bookingDate), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : "";

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <FlowBreadcrumb currentStep="dados" />

      <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Seus dados
      </h1>

      {/* Booking summary */}
      <div className="mt-4 space-y-3">
        <DoctorSummary doctor={doctor} />
        {formattedDate && (
          <div className="rounded-xl border border-brand-sand/60 bg-white px-4 py-3">
            <p className="text-sm text-brand-text-secondary">
              <span className="capitalize">{formattedDate}</span> — <span className="font-semibold text-brand-forest">R$&nbsp;49,90</span>
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-8 rounded-2xl border border-brand-sand/60 bg-white p-6 shadow-sm sm:p-8"
        data-track="form_started"
      >
        {/* Section 1: Personal */}
        <div>
          <SectionTitle>Dados pessoais</SectionTitle>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" required>Nome completo</Label>
              <input id="fullName" {...register("fullName")} placeholder="Nome e sobrenome" className={inputClass} />
              <FieldError message={errors.fullName?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email" required>E-mail</Label>
                <input id="email" type="email" {...register("email")} placeholder="seu@email.com" className={inputClass} />
                <FieldError message={errors.email?.message} />
              </div>
              <div>
                <Label htmlFor="phone" required>Telefone / WhatsApp</Label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  {...register("phone", {
                    onChange: (e) => { e.target.value = maskPhone(e.target.value); },
                  })}
                  placeholder="(84) 99999-9999"
                  className={inputClass}
                />
                <FieldError message={errors.phone?.message} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cpf" required>CPF</Label>
                <input
                  id="cpf"
                  inputMode="numeric"
                  {...register("cpf", {
                    onChange: (e) => { e.target.value = maskCpf(e.target.value); },
                  })}
                  placeholder="000.000.000-00"
                  className={inputClass}
                />
                <FieldError message={errors.cpf?.message} />
              </div>
              <div>
                <Label htmlFor="rg" required>RG</Label>
                <input id="rg" {...register("rg")} placeholder="Número do RG" className={inputClass} />
                <FieldError message={errors.rg?.message} />
              </div>
            </div>
            <div>
              <Label htmlFor="birthDate" required>Data de nascimento</Label>
              <input
                id="birthDate"
                type="date"
                {...register("birthDate")}
                className={cn(inputClass, "max-w-xs")}
              />
              <FieldError message={errors.birthDate?.message} />
            </div>
          </div>
        </div>

        <div className="h-px bg-brand-sand/40" />

        {/* Section 2: Address */}
        <div>
          <SectionTitle>Endereço</SectionTitle>
          <div className="space-y-4">
            <div className="max-w-xs">
              <Label htmlFor="cep" required>CEP</Label>
              <div className="relative">
                <input
                  id="cep"
                  inputMode="numeric"
                  {...register("cep", {
                    onChange: (e) => { e.target.value = maskCep(e.target.value); },
                    onBlur: handleCepBlur,
                  })}
                  placeholder="00000-000"
                  className={inputClass}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-forest-light" />
                )}
              </div>
              <FieldError message={errors.cep?.message} />
            </div>
            <div>
              <Label htmlFor="street" required>Rua</Label>
              <input id="street" {...register("street")} placeholder="Rua, avenida..." className={inputClass} />
              <FieldError message={errors.street?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="number" required>Número</Label>
                <input id="number" {...register("number")} placeholder="Nº" className={inputClass} />
                <FieldError message={errors.number?.message} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="complement">Complemento</Label>
                <input id="complement" {...register("complement")} placeholder="Apto, sala..." className={inputClass} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="district" required>Bairro</Label>
                <input id="district" {...register("district")} placeholder="Bairro" className={inputClass} />
                <FieldError message={errors.district?.message} />
              </div>
              <div>
                <Label htmlFor="city" required>Cidade</Label>
                <input id="city" {...register("city")} placeholder="Cidade" className={inputClass} />
                <FieldError message={errors.city?.message} />
              </div>
              <div>
                <Label htmlFor="state" required>Estado</Label>
                <select id="state" {...register("state")} className={inputClass}>
                  <option value="">UF</option>
                  {UF_OPTIONS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
                <FieldError message={errors.state?.message} />
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-brand-sand/40" />

        {/* Section 3: Clinical */}
        <div>
          <SectionTitle>Informações clínicas</SectionTitle>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-brand-text">Sintomas selecionados</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedSymptomLabels.map((label) => (
                  <Badge key={label} variant="secondary" className="bg-brand-forest/8 text-brand-forest text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-brand-text">
                Já toma algum medicamento para esses sintomas? <span className="text-brand-error/60">*</span>
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-brand-text">
                  <input
                    type="radio"
                    value="true"
                    {...register("hasCurrentMedication", { setValueAs: (v) => v === "true" })}
                    className="accent-brand-forest"
                  />
                  Sim
                </label>
                <label className="flex items-center gap-2 text-sm text-brand-text">
                  <input
                    type="radio"
                    value="false"
                    {...register("hasCurrentMedication", { setValueAs: (v) => v === "true" })}
                    className="accent-brand-forest"
                  />
                  Não
                </label>
              </div>
              {hasMed && (
                <div className="mt-3">
                  <Label htmlFor="currentMedications" required>Qual medicamento?</Label>
                  <input id="currentMedications" {...register("currentMedications")} placeholder="Nome do medicamento" className={inputClass} />
                </div>
              )}
            </div>
            {priorCbd && (
              <div>
                <p className="text-sm font-medium text-brand-text">Experiência prévia com CBD</p>
                <p className="mt-1 text-sm text-brand-text-secondary">{priorCbd}</p>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-brand-sand/40" />

        {/* Section 4: Consent */}
        <div>
          <SectionTitle>Consentimento</SectionTitle>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="termsConsent"
                checked={termsChecked}
                onCheckedChange={(checked) => {
                  setValue("termsConsent", checked === true ? true : false as unknown as true);
                  if (checked) setValue("termsConsentAt", new Date().toISOString());
                }}
                className="mt-0.5"
              />
              <div>
                <label htmlFor="termsConsent" className="text-sm text-brand-text">
                  Li e aceito o Termo de Consentimento Livre e Esclarecido <span className="text-brand-error/60">*</span>
                </label>
                <button type="button" className="mt-0.5 flex items-center gap-1 text-xs text-brand-forest underline underline-offset-2 hover:text-brand-forest-dark">
                  <ExternalLink className="h-3 w-3" /> Ler termo completo
                </button>
              </div>
            </div>
            <FieldError message={errors.termsConsent?.message} />

            <div className="flex items-start gap-3">
              <Checkbox
                id="lgpdConsent"
                checked={lgpdChecked}
                onCheckedChange={(checked) => {
                  setValue("lgpdConsent", checked === true ? true : false as unknown as true);
                  if (checked) setValue("lgpdConsentAt", new Date().toISOString());
                }}
                className="mt-0.5"
              />
              <div>
                <label htmlFor="lgpdConsent" className="text-sm text-brand-text">
                  Autorizo o tratamento dos meus dados pessoais conforme a Política de Privacidade, nos termos da LGPD <span className="text-brand-error/60">*</span>
                </label>
                <button type="button" className="mt-0.5 flex items-center gap-1 text-xs text-brand-forest underline underline-offset-2 hover:text-brand-forest-dark">
                  <ExternalLink className="h-3 w-3" /> Ler Política de Privacidade
                </button>
              </div>
            </div>
            <FieldError message={errors.lgpdConsent?.message} />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold py-6 text-base shadow-lg shadow-brand-forest/20 transition-all duration-500 disabled:opacity-50"
          data-track="form_completed"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Prosseguir para pagamento
        </Button>
      </form>
    </div>
  );
}
