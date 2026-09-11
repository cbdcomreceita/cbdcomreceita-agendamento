-- 0011_whatsapp_confirmation_columns.sql

alter table notifications_log
  add column if not exists nextalk_contact_id text,
  add column if not exists nextalk_conversation_display_id text,
  add column if not exists nextalk_message_id text,
  add column if not exists nextalk_kanban_card_id text,
  add column if not exists nextalk_kanban_action text, -- 'created' | 'moved' | 'unchanged' | 'new_card_after_later_stage'
  add column if not exists external_error text;

-- Checagem defensiva: aborta a migração com erro claro em vez de deixar o
-- CREATE UNIQUE INDEX falhar com uma mensagem genérica de constraint.
-- Alinhada com o índice abaixo: agrupa por (booking_id, type) olhando
-- todos os tipos de notificação por WhatsApp, não só booking_confirmation.
do $$
declare
  dup_count int;
begin
  select count(*) into dup_count
  from (
    select booking_id, type
    from notifications_log
    where channel = 'whatsapp'
    group by booking_id, type
    having count(*) > 1
  ) dups;

  if dup_count > 0 then
    raise exception 'Existem % combinação(ões) de booking_id+type com mais de uma linha whatsapp em notifications_log. Resolva as duplicatas antes de aplicar esta migração.', dup_count;
  end if;
end $$;

-- Reserva por (booking_id, type) entre linhas de canal whatsapp, independente
-- de status — viabiliza o padrão de "insert simples antes de chamar a
-- NexTalk, trata erro 23505 (unique_violation) como já existe".
create unique index if not exists notifications_log_whatsapp_booking_type_unique
  on notifications_log (booking_id, type)
  where channel = 'whatsapp';
