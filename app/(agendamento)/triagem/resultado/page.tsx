"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadTriageData } from "@/lib/triagem/storage";
import { loadBookingData } from "@/lib/calcom/storage";

// This page is no longer part of the main flow.
// New flow: triagem → agenda (direct, after schedule step).
// Redirect any visitor to the appropriate step.
export default function ResultadoPage() {
  const router = useRouter();

  useEffect(() => {
    const data = loadTriageData();
    const booking = loadBookingData();
    // Entrega 3 (AGENDA_3_NEXT_ENABLED) never sets matchedDoctorId — a
    // booking with a doctorId already picked counts the same way.
    if (data.matchedDoctorId || booking?.doctorId) {
      router.replace("/agenda");
    } else {
      router.replace("/triagem");
    }
  }, [router]);

  return null;
}
