-- s1g — 같은 연결에서 부분 색인 표를 SELECT 세 번, DELETE, UPDATE 차례로 계획하면
-- 조건 함수 gate() 가 몇 번 도는가(새 연결 하나, SET ROLE app_x 꼴).
-- 문장마다 뒤에서 세션 카운터 wipe.gate_calls(누적)를 읽는다.
\pset pager off
\pset tuples_only on
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
SELECT 'start: gate_calls=' || coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0');
SELECT 'SELECT 1 rows=' || count(*) FROM app_x.table_p;
SELECT 'after SELECT 1: gate_calls=' || coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0');
SELECT 'SELECT 2 rows=' || count(*) FROM app_x.table_p;
SELECT 'after SELECT 2: gate_calls=' || coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0');
SELECT 'SELECT 3 rows=' || count(*) FROM app_x.table_p;
SELECT 'after SELECT 3: gate_calls=' || coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0');
DELETE FROM app_x.table_p WHERE body = 'no-such-row';
SELECT 'after DELETE: gate_calls=' || coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0');
UPDATE app_x.table_p SET body = body WHERE body = 'no-such-row';
SELECT 'after UPDATE: gate_calls=' || coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0');
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
