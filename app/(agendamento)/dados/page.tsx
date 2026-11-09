"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { formatDateBR, formatDateLong } from "@/lib/utils/datetime";
import { Loader2, ArrowRight, Ticket, CheckCircle2, XCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TermsModal, PrivacyModal } from "@/components/fluxo/consent-modal";
import { FlowBreadcrumb } from "@/components/fluxo/flow-breadcrumb";
import { DoctorSummary } from "@/components/fluxo/doctor-summary";
import { loadTriageData, saveTriageData } from "@/lib/triagem/storage";
import { loadBookingData } from "@/lib/calcom/storage";
import { savePatientData, loadPatientData } from "@/lib/validation/patient-storage";
import {
  patientSchemaFull,
  patientSchemaLight,
  patientPhoneE164,
  UF_OPTIONS,
  type PatientFormData,
} from "@/lib/validation/patient";
import { isLightFormEnabled } from "@/app/actions/feature-flags";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/validation/phone";
import { fetchCep } from "@/lib/utils/viacep";
import { maskCpf, maskPhone, maskCep } from "@/lib/utils/masks";
import { getDoctorById } from "@/app/actions/get-doctors";
import { isCouponAvailable, validateCouponAction, type CouponCheckResult } from "@/app/actions/coupon";
import { formatCentsToBRL } from "@/lib/utils/currency";
import type { Doctor } from "@/lib/types/doctor";
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

const inputBase =
  "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm text-brand-text placeholder:text-brand-text-muted/50 transition-colors focus:outline-none disabled:bg-brand-sand/20 disabled:text-brand-text-muted";

function inputClass(hasError?: boolean) {
  return cn(inputBase, hasError ? "border-brand-error focus:border-brand-error" : "border-brand-sand/60 focus:border-brand-forest");
}

export default function DadosPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [birthDateEditing, setBirthDateEditing] = useState(false);
  const [birthDateDisplay, setBirthDateDisplay] = useState("");
  const [lightFormEnabled, setLightFormEnabled] = useState(false);
  const [couponAvailable, setCouponAvailable] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponCheckResult | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Applies (or re-validates) a coupon code against the server. Always
  // the single source of truth for whether a code is valid — the value
  // only gets persisted to triage storage once this confirms it.
  const applyCoupon = useCallback(async (raw: string) => {
    const normalized = raw.trim().toUpperCase();
    if (!normalized) return;

    setCouponChecking(true);
    try {
      const result = await validateCouponAction(normalized);
      setCouponResult(result);
      setCouponInput(result.code ?? normalized);
      // Rate-limited responses carry no verdict — leave any previously
      // applied coupon untouched rather than wiping it out.
      if (!result.rateLimited) {
        saveTriageData({ couponCode: result.valid ? result.code : undefined });
      }
    } catch (err) {
      console.error("[Dados] validateCouponAction threw:", err);
      setCouponResult({
        valid: false,
        discountPercent: 0,
        amountCents: 0,
        basePriceCents: 0,
        message: "Não foi possível verificar o cupom agora. Tente novamente.",
      });
    } finally {
      setCouponChecking(false);
    }
  }, []);

  const removeCoupon = useCallback(() => {
    setCouponInput("");
    setCouponResult(null);
    saveTriageData({ couponCode: undefined });
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors: rhfErrors },
  } = useForm<PatientFormData>({
    defaultValues: {
      phoneCountry: DEFAULT_COUNTRY,
      lgpdConsent: false as unknown as true,
      termsConsent: false as unknown as true,
      whatsappConsent: false as unknown as true,
    },
  });

  // Merge RHF errors with Zod errors
  const errors = { ...rhfErrors, ...Object.fromEntries(
    Object.entries(fieldErrors).map(([k, v]) => [k, { message: v }])
  ) } as typeof rhfErrors;

  useEffect(() => {
    const triage = loadTriageData();
    const booking = loadBookingData();

    // Entrega 3 (AGENDA_3_NEXT_ENABLED) never sets matchedDoctorId — there's
    // no single pre-resolved doctor, just whichever block the patient
    // picked. booking.doctorId (set by both agenda flows via saveBookingData)
    // covers both cases.
    const doctorId = triage.matchedDoctorId ?? booking?.doctorId;
    if (!triage.selectedSymptoms?.length || !booking || !doctorId) {
      router.replace("/triagem");
      return;
    }

    getDoctorById(doctorId).then((matched) => {
      if (!matched) {
        router.replace("/triagem");
        return;
      }
      setDoctor(matched);
    });
    setBookingDate(booking.scheduledAt);

    if (triage.couponCode) {
      setCouponInput(triage.couponCode);
      applyCoupon(triage.couponCode);
    }
    isCouponAvailable().then(setCouponAvailable);

    // Pre-fill birth date from triage
    if (triage.birthDate) {
      const bd = triage.birthDate.slice(0, 10); // YYYY-MM-DD
      setValue("birthDate", bd);
      // Anchor at noon BRT so timezone shifts can't cross day boundaries
      setBirthDateDisplay(formatDateBR(`${bd}T12:00:00`));
    }

    // Load saved patient data if any
    const saved = loadPatientData();
    if (saved) {
      const fields = ["fullName", "email", "phoneCountry", "phone", "cpf", "rg", "cep", "street", "number", "complement", "district", "city", "state"] as const;
      for (const f of fields) {
        if (saved[f]) setValue(f, saved[f] as string);
      }
    }

    // Only flip `loaded` once lightFormEnabled is actually known. Rendering
    // with it still at its default (false) for even one tick mounts the
    // full form's RG/endereço inputs — react-hook-form's shouldUnregister
    // defaults to false, so those fields stay registered with "" after
    // unmounting once the real flag arrives, silently failing the light
    // schema's validation (an "optional" field still has to be a valid
    // value or absent — "" is neither) with no visible error, since the
    // inputs showing that error aren't even rendered under the light form.
    isLightFormEnabled().then((enabled) => {
      setLightFormEnabled(enabled);
      setLoaded(true);
    });
  }, [router, setValue, applyCoupon]);

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

  const lgpdChecked = watch("lgpdConsent");
  const termsChecked = watch("termsConsent");
  const whatsappConsentChecked = watch("whatsappConsent");
  const phoneCountry = watch("phoneCountry") || DEFAULT_COUNTRY;

  async function onSubmit(data: PatientFormData) {
    setFieldErrors({});

    const activeSchema = lightFormEnabled ? patientSchemaLight : patientSchemaFull;
    const result = activeSchema.safeParse(data);
    const errs: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
    }
    if (!result.success || Object.keys(errs).length > 0) {
      setFieldErrors(errs);

      // Scroll to first error
      const firstKey = Object.keys(errs)[0];
      const el = document.getElementById(firstKey);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    trackEvent({ name: "form_submitted", doctor: doctor?.name ?? "" });
    // Store the phone already in E.164 — everything downstream (NexTalk,
    // confirm-booking, dispatch) expects that shape for new patients.
    savePatientData({ ...result.data, phone: patientPhoneE164(result.data) });
    router.push("/pagamento");
  }

  if (!loaded || !doctor) return null;

  const formattedDate = bookingDate ? formatDateLong(bookingDate) : "";

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <FlowBreadcrumb currentStep="dados" />

      <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        {lightFormEnabled ? "Vamos seguir com o agendamento" : "Seus dados"}
      </h1>
      {lightFormEnabled && (
        <>
          <div className="mt-4 rounded-2xl border border-brand-forest/20 bg-brand-forest/5 p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-brand-forest-dark sm:text-base">
              Preencha com os SEUS dados, de quem está fazendo o agendamento. É com você que o nosso time vai entrar
              em contato. Os dados do paciente serão pedidos depois do pagamento, para abrir o prontuário.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            <span className="flex items-center gap-1.5 text-sm text-brand-text-muted">
              <CheckCircle2 className="h-4 w-4 text-brand-forest" />
              Médicos com CRM
            </span>
            <span className="flex items-center gap-1.5 text-sm text-brand-text-muted">
              <CheckCircle2 className="h-4 w-4 text-brand-forest" />
              Seus dados estão protegidos
            </span>
          </div>
        </>
      )}

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
              <Label htmlFor="fullName" required>{lightFormEnabled ? "Seu nome completo" : "Nome completo"}</Label>
              <input id="fullName" {...register("fullName")} placeholder="Nome e sobrenome" className={inputClass(!!errors.fullName)} />
              <FieldError message={errors.fullName?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email" required>{lightFormEnabled ? "Seu e-mail" : "E-mail"}</Label>
                <input id="email" type="email" {...register("email")} placeholder="seu@email.com" className={inputClass(!!errors.email)} />
                <FieldError message={errors.email?.message} />
              </div>
              <div>
                <Label htmlFor="phone" required>{lightFormEnabled ? "Seu celular com WhatsApp" : "Celular com WhatsApp"}</Label>
                <div className="flex gap-2">
                  <select
                    id="phoneCountry"
                    {...register("phoneCountry", {
                      onChange: () => setValue("phone", ""),
                    })}
                    className={cn(inputClass(), "w-[6.5rem] shrink-0 px-2")}
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        +{c.callingCode} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    {...register("phone", {
                      onChange: (e) => {
                        if (phoneCountry === DEFAULT_COUNTRY) {
                          e.target.value = maskPhone(e.target.value);
                        }
                      },
                    })}
                    placeholder={phoneCountry === DEFAULT_COUNTRY ? "(84) 99999-9999" : "Número"}
                    className={cn(inputClass(!!errors.phone), "flex-1")}
                  />
                </div>
                <FieldError message={errors.phone?.message} />
              </div>
            </div>
            <div className={cn("grid gap-4", !lightFormEnabled && "sm:grid-cols-2")}>
              <div>
                <Label htmlFor="cpf" required>{lightFormEnabled ? "Seu CPF" : "CPF"}</Label>
                <input
                  id="cpf"
                  inputMode="numeric"
                  {...register("cpf", {
                    onChange: (e) => { e.target.value = maskCpf(e.target.value); },
                  })}
                  placeholder="000.000.000-00"
                  className={inputClass(!!errors.cpf)}
                />
                <FieldError message={errors.cpf?.message} />
                {lightFormEnabled && (
                  <p className="mt-1.5 text-xs text-brand-text-muted">
                    Precisamos do seu CPF para gerar o seu agendamento.
                  </p>
                )}
              </div>
              {!lightFormEnabled && (
                <div>
                  <Label htmlFor="rg" required>RG</Label>
                  <input id="rg" {...register("rg")} placeholder="Número do RG" className={inputClass(!!errors.rg)} />
                  <FieldError message={errors.rg?.message} />
                </div>
              )}
            </div>
            {!lightFormEnabled && (
              <div>
                <Label htmlFor="birthDate" required>Data de nascimento</Label>
                {birthDateDisplay && !birthDateEditing ? (
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl border-2 border-brand-sand/60 bg-brand-sand/20 px-4 py-3 text-sm font-medium text-brand-text">
                      {birthDateDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBirthDateEditing(true)}
                      className="text-xs font-medium text-brand-forest underline underline-offset-2 hover:text-brand-forest-dark"
                    >
                      Alterar
                    </button>
                    <input type="hidden" {...register("birthDate")} />
                  </div>
                ) : (
                  <input
                    id="birthDate"
                    type="date"
                    {...register("birthDate")}
                    className={cn(inputClass(!!errors.birthDate), "max-w-xs")}
                  />
                )}
                <FieldError message={errors.birthDate?.message} />
              </div>
            )}
          </div>
        </div>

        {!lightFormEnabled && (
          <>
            <div className="h-px bg-brand-sand/40" />

            {/* Section 2: Address — moves to the prontuário (Entrega 2) under LIGHT_FORM_ENABLED */}
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
                      className={inputClass(!!errors.cep)}
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-forest-light" />
                    )}
                  </div>
                  <FieldError message={errors.cep?.message} />
                </div>
                <div>
                  <Label htmlFor="street" required>Rua</Label>
                  <input id="street" {...register("street")} placeholder="Rua, avenida..." className={inputClass(!!errors.street)} />
                  <FieldError message={errors.street?.message} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="number" required>Número</Label>
                    <input id="number" {...register("number")} placeholder="Nº" className={inputClass(!!errors.number)} />
                    <FieldError message={errors.number?.message} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <input id="complement" {...register("complement")} placeholder="Apto, sala..." className={inputClass()} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="district" required>Bairro</Label>
                    <input id="district" {...register("district")} placeholder="Bairro" className={inputClass(!!errors.district)} />
                    <FieldError message={errors.district?.message} />
                  </div>
                  <div>
                    <Label htmlFor="city" required>Cidade</Label>
                    <input id="city" {...register("city")} placeholder="Cidade" className={inputClass(!!errors.city)} />
                    <FieldError message={errors.city?.message} />
                  </div>
                  <div>
                    <Label htmlFor="state" required>Estado</Label>
                    <select id="state" {...register("state")} className={inputClass(!!errors.state)}>
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
          </>
        )}

        <div className="h-px bg-brand-sand/40" />

        {/* Section 3: Consent */}
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
                <TermsModal />
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
                <PrivacyModal />
              </div>
            </div>
            <FieldError message={errors.lgpdConsent?.message} />

            <div className="flex items-start gap-3">
              <Checkbox
                id="whatsappConsent"
                checked={whatsappConsentChecked}
                onCheckedChange={(checked) => {
                  setValue("whatsappConsent", checked === true ? true : false as unknown as true);
                  if (checked) setValue("whatsappConsentAt", new Date().toISOString());
                }}
                className="mt-0.5"
              />
              <label htmlFor="whatsappConsent" className="text-sm text-brand-text">
                Aceito receber mensagens no WhatsApp sobre o meu agendamento e a minha consulta.{" "}
                <span className="text-brand-error/60">*</span>
              </label>
            </div>
            <FieldError message={errors.whatsappConsent?.message} />
          </div>
        </div>

        {/* Coupon: always visible when configured, with instant server-side validation */}
        {couponAvailable && (
          <div className="rounded-2xl border-2 border-brand-forest/30 bg-brand-forest/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Ticket className="h-5 w-5 shrink-0 text-brand-forest" />
              <h3 className="text-lg font-semibold text-brand-forest-dark">
                Tem um cupom de desconto?
              </h3>
            </div>

            {couponResult?.valid ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-success/30 bg-brand-success/10 p-4">
                <div>
                  <p className="flex items-center gap-1.5 text-lg font-semibold text-brand-success">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    Cupom aplicado! Você ganhou {couponResult.discountPercent}% de desconto.
                  </p>
                  <p className="mt-1.5 text-lg">
                    <span className="text-brand-text-muted line-through">
                      {formatCentsToBRL(couponResult.basePriceCents)}
                    </span>{" "}
                    <span className="font-bold text-brand-forest-dark">
                      {formatCentsToBRL(couponResult.amountCents)}
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={removeCoupon}
                  className="shrink-0 border-brand-forest/30 text-lg text-brand-forest"
                >
                  Remover
                </Button>
              </div>
            ) : (
              <>
                <label htmlFor="couponCode" className="sr-only">Código do cupom</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="couponCode"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCoupon(couponInput);
                      }
                    }}
                    placeholder="Código do cupom"
                    disabled={couponChecking}
                    className={cn(inputClass(), "flex-1 text-lg uppercase placeholder:text-base placeholder:normal-case")}
                  />
                  <Button
                    type="button"
                    onClick={() => applyCoupon(couponInput)}
                    disabled={couponChecking || !couponInput.trim()}
                    className="shrink-0 bg-brand-forest py-6 text-lg text-brand-cream hover:bg-brand-forest-hover sm:py-3"
                  >
                    {couponChecking ? <Loader2 className="h-5 w-5 animate-spin" /> : "Aplicar"}
                  </Button>
                </div>
                {couponResult && !couponResult.valid && (
                  <p className="mt-3 flex items-center gap-1.5 text-lg font-medium text-brand-error">
                    <XCircle className="h-5 w-5 shrink-0" />
                    {couponResult.rateLimited
                      ? `Muitas tentativas. Tente novamente em ${Math.max(1, Math.ceil((couponResult.retryAfter ?? 600) / 60))} minuto(s).`
                      : couponResult.message}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting || !lgpdChecked || !termsChecked || !whatsappConsentChecked}
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
