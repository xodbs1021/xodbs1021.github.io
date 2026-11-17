-- s1d(대조) — 역할을 되돌리지 않는 조건 함수(table_q). 같은 꼴로 SELECT 한다(새 연결).
\pset pager off
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
SELECT count(*) AS rows FROM app_x.table_q;
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
\echo '--- master_only.members ---'
SELECT who FROM master_only.members ORDER BY who;
