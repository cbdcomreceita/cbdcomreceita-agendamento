// Shapes returned by the NexTalk API, trimmed to the fields we actually read.
// See docs/nextalk-api-lembrete.pdf for the full reference.

export interface NextalkContact {
  id: number;
  name: string;
  phone_number: string;
  email?: string | null;
}

export interface NextalkContactFilterResponse {
  meta: { count: number; current_page: string };
  payload: NextalkContact[];
}

export interface NextalkCreateContactResponse {
  payload: {
    contact: NextalkContact;
    contact_inbox: { id: number; contact_id: number; inbox_id: number; source_id: string } | null;
  };
}

export interface NextalkContactInbox {
  id: number;
  contact_id: number;
  inbox_id: number;
  source_id: string;
}

/**
 * GOTCHA (confirmed in the PDF §6.1): on THIS endpoint, `id` already IS the
 * conversation's display_id — there is no separate `display_id` field here.
 * Contrast with the create-conversation response below, which has both.
 */
export interface NextalkConversationListItem {
  id: number; // == display_id on this endpoint specifically
  inbox_id: number;
  status: "open" | "pending" | "snoozed" | "resolved";
  can_reply: boolean;
  last_activity_at: number;
}

export interface NextalkConversationListResponse {
  payload: NextalkConversationListItem[];
}

export interface NextalkCreateConversationResponse {
  id: number; // internal id — do NOT use for subsequent calls
  display_id: number; // use this one
  inbox_id: number;
  contact_id: number;
  status: string;
}

export interface NextalkMessageResponse {
  id: number;
  content: string;
  message_type: number | string;
  conversation_id: number;
  status: "sent" | "delivered" | "read" | "failed" | string;
  external_error?: string | null;
  created_at: number;
}

export interface NextalkMessagesListResponse {
  payload?: NextalkMessageResponse[];
  // Some accounts return a bare array instead of {payload: [...]}; the
  // client normalizes both shapes, see nextalk-client.ts.
}

export interface NextalkOffer {
  id: number;
  description: string; // NOTE: the offer's NAME goes here, not `title`.
  value: string; // numeric string, e.g. "49.9"
  default: boolean;
  manual: boolean;
  product_link: string;
  image_url: string | null;
  offer_group_id: string | null;
  offer_group_name: string | null;
  currency: { symbol: string; code: string; locale: string };
}

export interface NextalkKanbanItemDetails {
  title: string;
  description: string;
  status: "open" | string;
  priority: "low" | "medium" | "high" | string;
  conversation_id: number; // holds the conversation's display_id, despite the name
  offers: NextalkOffer[];
  notes?: unknown;
}

export interface NextalkKanbanItem {
  id: number;
  funnel_id: number;
  funnel_stage: string;
  conversation_display_id?: number;
  item_details: NextalkKanbanItemDetails;
}

export interface NextalkKanbanListResponse {
  items: NextalkKanbanItem[];
  pagination?: unknown;
  weekly_count?: number;
}

export type KanbanAction = "created" | "moved" | "unchanged" | "new_card_after_later_stage";

// ── notifications_log row (extended by migration 0011) ────────────────────

export type NotificationStatus = "queued" | "sent" | "delivered" | "failed" | "skipped";

export interface WhatsappNotificationRow {
  id: string;
  booking_id: string;
  patient_id: string | null;
  channel: "whatsapp";
  type: "booking_confirmation";
  status: NotificationStatus;
  recipient: string;
  template_name: string | null;
  payload: Record<string, unknown> | null;
  provider_response: Record<string, unknown> | null;
  error_message: string | null;
  nextalk_contact_id: string | null;
  nextalk_conversation_display_id: string | null;
  nextalk_message_id: string | null;
  nextalk_kanban_card_id: string | null;
  nextalk_kanban_action: KanbanAction | null;
  external_error: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}
