-- s0_master.sql — 마스터 대역(master_x)이 앱 역할 · 스키마 · 표를 만든다.
-- 운영과 같은 꼴: 마스터는 앱 표에 직접 권한이 없고 앱 역할 멤버십도 늘 갖지 않는다.
-- 앱 소유 객체를 다룰 때만 같은 트랜잭션 안에서 앱 역할을 받고 거둔다
-- (CREATEROLE 로 만든 역할이라 만든 쪽이 받는 ADMIN 옵션은 남는다 — 로컬 모델).
\set ON_ERROR_STOP 1

CREATE ROLE app_x NOLOGIN;

-- 마스터만 쓰는 영역(마스터 소유). app_x 는 못 간다.
CREATE SCHEMA master_only;
CREATE TABLE master_only.members (who text);

BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
CREATE SCHEMA app_x AUTHORIZATION app_x;
SET ROLE app_x;

-- table_a: 트리거 경로 · 일회용 로그인 시험
CREATE TABLE app_x.table_a (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text NOT NULL);
INSERT INTO app_x.table_a (body) VALUES ('alpha'), ('bravo'), ('charlie');
-- table_i: 열 값을 받는 식 색인
CREATE TABLE app_x.table_i (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text NOT NULL);
INSERT INTO app_x.table_i (body) VALUES ('india'), ('juliet'), ('kilo'), ('lima');
-- table_p: 인자 없는 IMMUTABLE 함수를 조건으로 쓴 부분 색인
CREATE TABLE app_x.table_p (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text NOT NULL);
INSERT INTO app_x.table_p (body) VALUES ('papa'), ('quebec'), ('romeo');
-- table_b · table_c: relacl 측정 전용(권한 0 으로 시작)
CREATE TABLE app_x.table_b (id int);
CREATE TABLE app_x.table_c (id int);
-- 마스터에게는 앱 표 권한을 주지 않는다.

RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;

\echo '--- 준비 끝: 마스터가 app_x 에 가진 멤버십 행(만든 쪽이 받는 ADMIN 만 남고 SET · INHERIT 는 없어야) ---'
SELECT admin_option, inherit_option, set_option
  FROM pg_auth_members WHERE member = 'master_x'::regrole AND roleid = 'app_x'::regrole;
\echo '--- 앱 표 relacl(NULL = 소유자만) · 마스터의 직접 SELECT 권한 ---'
SELECT relname, relacl IS NULL AS relacl_null,
       has_table_privilege('master_x', c.oid, 'SELECT') AS master_can_select
  FROM pg_class c WHERE relnamespace = 'app_x'::regnamespace AND relkind = 'r' ORDER BY relname;
\set ON_ERROR_STOP 0
\echo '--- 마스터가 앱 역할 없이 앱 표를 직접 읽으면 ---'
SELECT count(*) FROM app_x.table_a;
