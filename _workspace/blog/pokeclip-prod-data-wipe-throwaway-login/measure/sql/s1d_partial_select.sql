-- s1d(SELECT) — 마스터가 스스로 app_x 를 받아 SET ROLE 한 뒤, 부분 색인이 있는 표를 평범하게 SELECT 한다.
\pset pager off
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
SELECT count(*) AS rows FROM app_x.table_p;
SELECT current_user AS after_query;
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
\echo '--- master_only.members ---'
SELECT who FROM master_only.members ORDER BY who;
