const BASE_URL = process.env.CALCOM_BASE_URL || "https://cal.com/cbdcomreceita";
const API_KEY = process.env.CALCOM_API_KEY || "";

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

/** Placeholder — will be implemented in Bloco 7-8 */
export async function getBooking(_bookingUid: string) {
  // TODO: GET /v1/bookings/{uid}
  return null;
}

/** Placeholder — will be implemented in Bloco 7-8 */
export async function cancelBooking(_bookingUid: string, _reason?: string) {
  // TODO: DELETE /v1/bookings/{uid}
  return null;
}

/** Placeholder — will be implemented in Bloco 7-8 */
export async function getAvailability(_eventTypeSlug: string) {
  // TODO: GET /v1/availability
  return null;
}

export { BASE_URL, API_KEY, headers };
