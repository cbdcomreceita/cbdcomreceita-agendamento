import { NEXTALK_INBOX_ID } from "./config";
import { NextalkApiError, nextalkPostCreate, nextalkPostSearch } from "./nextalk-client";
import { searchOrder, type PhoneVariants } from "./phone";
import type {
  NextalkContact,
  NextalkContactFilterResponse,
  NextalkCreateContactResponse,
} from "./types";

async function findByPhone(phone: string): Promise<NextalkContact | null> {
  const res = await nextalkPostSearch<NextalkContactFilterResponse>("/contacts/filter", {
    payload: [
      {
        attribute_key: "phone_number",
        filter_operator: "equal_to",
        values: [phone],
        query_operator: null,
      },
    ],
  });
  return res.payload[0] ?? null;
}

async function createContact(
  phone: string,
  name: string,
  email?: string | null
): Promise<NextalkContact> {
  // Deliberately omit inbox_id/source_id here even though the PDF says the
  // create endpoint accepts them — Passo 2 (ensureContactInbox) is the
  // idempotent, safer way to establish the link, per the doc's own note.
  const res = await nextalkPostCreate<NextalkCreateContactResponse>("/contacts", {
    name,
    phone_number: phone,
    email: email ?? undefined,
    additional_attributes: {},
    custom_attributes: { origem: "site-agendamento" },
  });
  return res.payload.contact;
}

/**
 * Passo 1 — finds an existing NexTalk contact by phone (trying the with-9
 * variant first, then without-9, per the dual-search rule for ambiguous
 * Brazilian cell numbers), or creates one using the with-9 variant.
 *
 * If creation races with another process and NexTalk returns 422 "Phone
 * number has already been taken", we redo the filter search rather than
 * treating it as a hard failure.
 */
export async function findOrCreateContact(
  variants: PhoneVariants,
  patientName: string,
  patientEmail?: string | null
): Promise<NextalkContact> {
  for (const phone of searchOrder(variants)) {
    const found = await findByPhone(phone);
    if (found) return found;
  }

  try {
    return await createContact(variants.primary, patientName, patientEmail);
  } catch (err) {
    if (
      err instanceof NextalkApiError &&
      err.status === 422 &&
      /already.*taken/i.test(err.message)
    ) {
      for (const phone of searchOrder(variants)) {
        const found = await findByPhone(phone);
        if (found) return found;
      }
    }
    throw err;
  }
}

/**
 * Passo 2 — links the contact to our inbox. Idempotent: NexTalk returns the
 * existing link (or a compatible response) if it already exists, so no
 * pre-check is needed.
 */
export async function ensureContactInbox(contactId: number): Promise<void> {
  await nextalkPostCreate(`/contacts/${contactId}/contact_inboxes`, {
    inbox_id: NEXTALK_INBOX_ID,
  });
}
