import { createHash } from "crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashEmail(email?: string): string | undefined {
  if (!email) return undefined;
  return sha256(email.toLowerCase().trim());
}

function hashPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  return sha256(digits);
}

export interface MetaConversionParams {
  eventName: string;
  bookingId: string;
  value: number;
  userEmail?: string;
  userPhone?: string;
  userFbc?: string;
  userFbp?: string;
}

export async function sendMetaConversionEvent(params: MetaConversionParams): Promise<void> {
  const token = process.env.META_CONVERSIONS_API_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  if (!token || !pixelId) return;

  const { eventName, bookingId, value, userEmail, userPhone, userFbc, userFbp } = params;

  const rawUserData: Record<string, string | undefined> = {
    em: hashEmail(userEmail),
    ph: hashPhone(userPhone),
    fbc: userFbc,
    fbp: userFbp,
  };

  const userData = Object.fromEntries(
    Object.entries(rawUserData).filter(([, v]) => v !== undefined)
  );

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: bookingId,
        action_source: "website",
        user_data: userData,
        custom_data: {
          value,
          currency: "BRL",
          content_ids: [bookingId],
          content_type: "product",
        },
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      console.error("[MetaConversionsAPI] error:", response.status, text);
    }
  } catch (err) {
    console.error("[MetaConversionsAPI] sendMetaConversionEvent failed:", err);
  }
}
