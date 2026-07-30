"use client";

import Image from "next/image";
import type { Doctor } from "@/lib/types/doctor";
import { getDoctorInitials } from "@/lib/utils/doctor";

export function DoctorSummary({ doctor }: { doctor: Doctor }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-brand-sand/60 bg-white p-4 shadow-sm">
      {doctor.photo_url ? (
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-brand-cream">
          <Image
            src={doctor.photo_url}
            alt={`Foto de ${doctor.name}`}
            fill
            className="object-cover object-top"
            sizes="56px"
          />
        </div>
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-forest-light text-lg font-bold text-brand-cream">
          {getDoctorInitials(doctor.name)}
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold text-brand-forest-dark">
          {doctor.name}
        </h2>
        <p className="text-sm text-brand-text-muted">
          {doctor.crm
            ? `CRM ${doctor.crm}/${doctor.crm_uf} — ${doctor.medical_specialty ?? ""}`
            : doctor.medical_specialty}
        </p>
      </div>
    </div>
  );
}
