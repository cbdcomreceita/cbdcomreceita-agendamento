"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Loader2, CheckCircle2, AlertTriangle, MessageCircle, ArrowRight } from "lucide-react";
import { getIntakeByToken } from "@/app/actions/get-intake-by-token";
import { submitIntake } from "@/app/actions/submit-intake";
import { intakeSchema, type IntakeFormData } from "@/lib/validation/intake";
import { UF_OPTIONS } from "@/lib/validation/patient";
import { fetchCep } from "@/lib/utils/viacep";
import { maskCep } from "@/lib/utils/masks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUPPORT_WHATSAPP = `https://wa.me/5584997048210?text=${encodeURIComponent(
  "Olá! Estou tentando preencher meus dados pelo link do prontuário e preciso de ajuda."
)}`;

type PageState = "loading" | "not_found" | "expired" | "already_completed" | "form" | "success";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[15px] text-brand-error">{message}</p>;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[17px] font-medium text-brand-text">
      {children}
      {required && <span className="ml-0.5 text-brand-error/60">*</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border-2 bg-white px-4 py-3 text-[17px] text-brand-text placeholder:text-brand-text-muted/50 transition-colors focus:outline-none disabled:bg-brand-sand/20 disabled:text-brand-text-muted";

function inputClass(hasError?: boolean) {
  return cn(inputBase, hasError ? "border-brand-error focus:border-brand-error" : "border-brand-sand/60 focus:border-brand-forest");
}

export function ProntuarioClient({ token }: { token: string }) {
  const [state, setState] = useState<PageState>("loading");
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [scheduledAtFormatted, setScheduledAtFormatted] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors: rhfErrors },
  } = useForm<IntakeFormData>();

  const errors = {
    ...rhfErrors,
    ...Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, { message: v }])),
  } as typeof rhfErrors;

  useEffect(() => {
    getIntakeByToken(token).then((result) => {
      if (!result.found) {
        setState("not_found");
        return;
      }
      if (result.expired) {
        setState("expired");
        return;
      }
      if (result.alreadyCompleted) {
        setState("already_completed");
        return;
      }
      setPatientName(result.patientName ?? "");
      setDoctorName(result.doctorName ?? "");
      setScheduledAtFormatted(result.scheduledAtFormatted ?? "");
      setState("form");
    });
  }, [token]);

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
      setValue("state", result.uf as IntakeFormData["state"], { shouldValidate: true });
    }
  }, [cepValue, setValue]);

  async function onSubmit(data: IntakeFormData) {
    setFieldErrors({});
    setSubmitError("");

    const result = intakeSchema.safeParse(data);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    const response = await submitIntake({ token, data: result.data });
    setSubmitting(false);

    if (!response.success) {
      if (response.fieldErrors) setFieldErrors(response.fieldErrors);
      setSubmitError(response.error ?? "Não foi possível salvar seus dados agora. Tente novamente.");
      return;
    }
    setState("success");
  }

  const wrapperClass = "mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:px-8 sm:py-14";

  if (state === "loading") {
    return (
      <div className={cn(wrapperClass, "flex items-center justify-center")}>
        <Loader2 className="h-6 w-6 animate-spin text-brand-forest-light" />
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className={wrapperClass}>
        <div className="rounded-2xl border border-brand-sand bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-brand-error/70" />
          <h1 className="mt-4 text-[20px] font-bold text-brand-forest-dark">Não encontramos este link</h1>
          <p className="mt-2 text-[17px] text-brand-text-secondary">
            O link pode estar incorreto ou incompleto. Se você recebeu este link pelo WhatsApp, confira se copiou o endereço inteiro.
          </p>
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-[17px] font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className={wrapperClass}>
        <div className="rounded-2xl border border-brand-sand bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-brand-error/70" />
          <h1 className="mt-4 text-[20px] font-bold text-brand-forest-dark">Este link não está mais disponível</h1>
          <p className="mt-2 text-[17px] text-brand-text-secondary">
            O prazo para preencher seus dados por este link já passou. Fale com nosso time pelo WhatsApp para resolver.
          </p>
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-[17px] font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (state === "already_completed") {
    return (
      <div className={wrapperClass}>
        <div className="rounded-2xl border border-brand-sand bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-8 w-8 text-brand-success" />
          <h1 className="mt-4 text-[20px] font-bold text-brand-forest-dark">Dados recebidos</h1>
          <p className="mt-2 text-[17px] text-brand-text-secondary">
            Já recebemos seus dados para esta consulta. Se precisar corrigir algo, fale com nosso time pelo WhatsApp.
          </p>
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-[17px] font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className={wrapperClass}>
        <div className="rounded-2xl border border-brand-sand bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-8 w-8 text-brand-success" />
          <h1 className="mt-4 text-[20px] font-bold text-brand-forest-dark">Dados recebidos</h1>
          <p className="mt-2 text-[17px] text-brand-text-secondary">
            Obrigado, {patientName.split(" ")[0]}. Seu prontuário está completo para a consulta com {doctorName}.
          </p>
        </div>
      </div>
    );
  }

  // state === "form"
  return (
    <div className={wrapperClass}>
      <h1 className="text-[22px] font-bold tracking-tight text-brand-forest-dark sm:text-[26px]">
        Complete seu prontuário
      </h1>
      <p className="mt-2 text-[17px] text-brand-text-secondary">
        Olá, {patientName.split(" ")[0]}. Para abrir seu prontuário com {doctorName}
        {scheduledAtFormatted ? ` (${scheduledAtFormatted})` : ""} e emitir sua receita, se houver indicação durante a consulta, precisamos de mais alguns dados.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6 rounded-2xl border border-brand-sand/60 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <Label htmlFor="rg" required>RG</Label>
          <input id="rg" {...register("rg")} placeholder="Número do RG" className={inputClass(!!errors.rg)} />
          <FieldError message={errors.rg?.message} />
        </div>

        <div>
          <Label htmlFor="birthDate" required>Data de nascimento</Label>
          <input id="birthDate" type="date" {...register("birthDate")} className={cn(inputClass(!!errors.birthDate), "max-w-xs")} />
          <FieldError message={errors.birthDate?.message} />
        </div>

        <div className="h-px bg-brand-sand/40" />

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
            {cepLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-forest-light" />}
          </div>
          <FieldError message={errors.cep?.message} />
        </div>

        <div>
          <Label htmlFor="street" required>Rua</Label>
          <input id="street" {...register("street")} placeholder="Rua, avenida" className={inputClass(!!errors.street)} />
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
            <input id="complement" {...register("complement")} placeholder="Apto, sala" className={inputClass()} />
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

        {submitError && (
          <p className="rounded-xl bg-brand-error/10 px-4 py-3 text-[17px] text-brand-error">{submitError}</p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold py-6 text-[17px] shadow-lg shadow-brand-forest/20 transition-all duration-500 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
          Enviar meus dados
        </Button>
      </form>

      <div className="mt-6 text-center">
        <a
          href={SUPPORT_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[17px] font-medium text-brand-forest underline underline-offset-2 hover:text-brand-forest-dark"
        >
          <MessageCircle className="h-4 w-4" />
          Precisa de ajuda? Fale no WhatsApp
        </a>
      </div>
    </div>
  );
}
