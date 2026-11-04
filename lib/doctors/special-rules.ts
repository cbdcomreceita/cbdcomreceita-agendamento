/**
 * Shared doctor-eligibility exceptions — used by both the Entrega 1 single-
 * doctor resolver (app/actions/resolve-doctor.ts) and the Entrega 3
 * multi-doctor "3 next agendas" engine (app/actions/get-next-agenda-blocks.ts),
 * so the two never drift apart on who's excluded and why.
 */

/** Dra. Carolina Lopes — excluded from routing when the patient flagged "autismo". */
export const AUTISM_EXCLUDED_DOCTOR_IDS = ["7b74694a-b8f5-462a-9da2-75ce207ea786"];
