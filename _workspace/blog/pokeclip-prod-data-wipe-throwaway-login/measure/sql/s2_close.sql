-- s2_close — 닫기 · 회수 · 지우기 순서. 권한이 남은 채 DROP 하면 거부되는지 본다.
\pset pager off
ALTER ROLE oneoff_x NOLOGIN;
\echo '--- 권한을 거두기 전 DROP ROLE ---'
DROP ROLE oneoff_x;
\echo '--- 권한 회수(소유자 신분은 같은 트랜잭션 안에서만) ---'
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
REVOKE ALL ON app_x.table_a, app_x.table_p FROM oneoff_x;
REVOKE ALL ON SCHEMA app_x FROM oneoff_x;
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
\echo '--- 회수 뒤 DROP ROLE ---'
DROP ROLE oneoff_x;
SELECT count(*) AS oneoff_left FROM pg_roles WHERE rolname = 'oneoff_x';
