-- 0010_notification_status_skipped.sql
-- 'delivered' já existe no enum; só falta 'skipped' (usado no modo team_only
-- pra números fora da lista, sem alerta).
alter type notification_status add value if not exists 'skipped';
