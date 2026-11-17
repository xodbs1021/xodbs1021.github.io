-- s2_create — 마스터가 일회용 로그인 oneoff_x 를 만든다.
-- 앱 역할 멤버십 없음 + 지울 표 권한만 직접 GRANT + SCRAM 검증값 + VALID UNTIL + CONNECTION LIMIT 1.
-- 검증값 · 만료 시각은 환경 변수로만 받는다(이 파일 · 출력에 남지 않음).
\set ON_ERROR_STOP 1
\pset pager off
\getenv verifier WIPE_ONEOFF_VERIFIER
\getenv vuntil WIPE_VALID_UNTIL

BEGIN;
CREATE ROLE oneoff_x LOGIN PASSWORD :'verifier' VALID UNTIL :'vuntil' CONNECTION LIMIT 1;
-- GRANT 는 표 소유자 신분이 필요하다 — 같은 트랜잭션 안에서만 app_x 멤버십을 받고 거둔다.
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
GRANT USAGE ON SCHEMA app_x TO oneoff_x;
GRANT SELECT, DELETE ON app_x.table_a TO oneoff_x;
GRANT SELECT ON app_x.table_p TO oneoff_x;   -- 부분 색인 표도 세기만
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;

\echo '--- oneoff_x 속성 ---'
SELECT rolcanlogin, rolconnlimit, rolvaliduntil IS NOT NULL AS has_valid_until
  FROM pg_roles WHERE rolname = 'oneoff_x';
\echo '--- 멤버십: oneoff_x 가 속한 역할 수 · 커밋 뒤 마스터에게 남은 app_x 의 SET · INHERIT 멤버십 ---'
SELECT (SELECT count(*) FROM pg_auth_members WHERE member = 'oneoff_x'::regrole) AS oneoff_memberships,
       (SELECT count(*) FROM pg_auth_members
         WHERE member = 'master_x'::regrole AND roleid = 'app_x'::regrole
           AND (set_option OR inherit_option)) AS master_set_or_inherit;
\echo '--- oneoff_x 의 app_x.table_a 권한(마스터는 스키마 USAGE 가 없어 이름 대신 oid 로 묻는다) ---'
SELECT has_table_privilege('oneoff_x', c.oid, 'SELECT') AS can_select,
       has_table_privilege('oneoff_x', c.oid, 'DELETE') AS can_delete,
       has_table_privilege('oneoff_x', c.oid, 'INSERT') AS can_insert,
       has_table_privilege('oneoff_x', c.oid, 'UPDATE') AS can_update
  FROM pg_class c WHERE c.relnamespace = 'app_x'::regnamespace AND c.relname = 'table_a';
