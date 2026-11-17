-- s1a — 마스터가 SET ROLE app_x 로 앱 표를 DELETE 한다(쓰지 않은 대안을 재현).
\pset pager off
SELECT current_user AS before, session_user;
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
SELECT current_user AS in_setrole;
DELETE FROM app_x.table_a WHERE body = 'alpha';
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
\echo '--- master_only.members (트리거가 남긴 줄) ---'
SELECT who FROM master_only.members ORDER BY who;
