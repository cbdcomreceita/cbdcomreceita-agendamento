"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadTriageData } from "@/lib/triagem/storage";

// This page is no longer part of the main flow.
// New flow: triagem → agenda (direct, after schedule step).
// Redirect any visitor to the appropriate step.
export default function ResultadoPage() {
  const router = useRouter();

  useEffect(() => {
    const data = loadTriageData();
    if (data.matchedDoctorId) {
      router.replace("/agenda");
    } else {
      router.replace("/triagem");
    }
  }, [router]);

  return null;
}
