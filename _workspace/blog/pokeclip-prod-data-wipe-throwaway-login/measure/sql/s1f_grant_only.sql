-- s1f — 일회용 계정에 권한을 줄 때도 마스터는 SET ROLE app_x 를 쓴다.
-- 이 짧은 구간에서 GRANT · REVOKE 만 하면 트리거 · 식 색인 · 부분 색인 조건이 깨어나는가(새 연결).
\pset pager off
SELECT count(*) AS members_before FROM master_only.members;
CREATE ROLE probe_grant NOLOGIN;
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
GRANT USAGE ON SCHEMA app_x TO probe_grant;
GRANT SELECT, DELETE ON app_x.table_a, app_x.table_i, app_x.table_p TO probe_grant;
REVOKE ALL ON app_x.table_a, app_x.table_i, app_x.table_p FROM probe_grant;
REVOKE ALL ON SCHEMA app_x FROM probe_grant;
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
DROP ROLE probe_grant;
SELECT count(*) AS members_after FROM master_only.members;
\echo '(이 파일 출력에 trigger · index-expr · gate · vol_write NOTICE 가 없으면 깨어나지 않은 것)'
