-- s3_relacl — relacl 칸은 처음 GRANT · REVOKE 로 NULL → 명시값이 되고 돌아오지 않는다.
\pset pager off
CREATE ROLE probe_grantee NOLOGIN;
\echo '--- 처음 ---'
SELECT relname, relacl, relacl IS NULL AS is_null FROM pg_class
 WHERE relnamespace = 'app_x'::regnamespace AND relname IN ('table_b', 'table_c') ORDER BY relname;

BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
GRANT DELETE ON app_x.table_b TO probe_grantee;           -- table_b: 부여
REVOKE DELETE ON app_x.table_c FROM probe_grantee;        -- table_c: 준 적 없는 권한을 회수만
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
\echo '--- table_b GRANT 뒤 · table_c 회수만 한 뒤 ---'
SELECT relname, relacl, relacl IS NULL AS is_null FROM pg_class
 WHERE relnamespace = 'app_x'::regnamespace AND relname IN ('table_b', 'table_c') ORDER BY relname;

BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
REVOKE DELETE ON app_x.table_b FROM probe_grantee;
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
DROP ROLE probe_grantee;
\echo '--- table_b 회수 · 받은 역할 DROP 뒤 ---'
SELECT relname, relacl, relacl IS NULL AS is_null FROM pg_class
 WHERE relnamespace = 'app_x'::regnamespace AND relname IN ('table_b', 'table_c') ORDER BY relname;

\echo '--- 마스터가 카탈로그를 직접 NULL 로 고치려 하면 ---'
UPDATE pg_catalog.pg_class SET relacl = NULL
 WHERE relnamespace = 'app_x'::regnamespace AND relname = 'table_b';
