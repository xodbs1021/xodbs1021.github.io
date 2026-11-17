-- s1d(DELETE) — 같은 꼴에서 그 표를 DELETE 해도 계획 단계에서 조건 함수가 도는가(새 연결).
\pset pager off
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
DELETE FROM app_x.table_p WHERE body = 'romeo';
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
\echo '--- master_only.members ---'
SELECT who FROM master_only.members ORDER BY who;
