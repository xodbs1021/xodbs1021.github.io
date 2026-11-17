-- s1h — 새 연결에서 첫 질의가 부분 색인 표의 UPDATE 일 때 조건 함수가 도는가.
\pset pager off
\pset tuples_only on
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
UPDATE app_x.table_p SET body = body WHERE body = 'papa';
SELECT 'after UPDATE: gate_calls=' || coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0');
UPDATE app_x.table_p SET body = body WHERE body = 'papa';
SELECT 'after UPDATE 2: gate_calls=' || coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0');
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
