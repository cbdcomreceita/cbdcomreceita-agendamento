export interface BookingData {
  doctorId: string;
  doctorName: string;
  scheduledAt: string;
  scheduledEndAt: string;
  duration: number;
  calcomBookingUid?: string;
  meetLink?: string;
}

const STORAGE_KEY = "booking_data_v1";

export function saveBookingData(data: BookingData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadBookingData(): BookingData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BookingData;
  } catch {
    return null;
  }
}

export function clearBookingData(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
