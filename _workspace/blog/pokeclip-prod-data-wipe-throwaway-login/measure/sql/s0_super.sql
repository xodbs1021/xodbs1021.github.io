-- s0_super.sql — 슈퍼유저가 마스터 대역 하나만 만든다(나머지는 마스터가 만든다).
-- 비밀번호는 실행 때 만든 값을 환경 변수로 받는다(파일 · 출력에 남지 않음).
\set ON_ERROR_STOP 1
\getenv master_pw WIPE_MASTER_PW

-- master_x: RDS 마스터 대역. RDS 마스터처럼 NOSUPERUSER · CREATEROLE, BYPASSRLS 없음.
CREATE ROLE master_x LOGIN NOSUPERUSER CREATEROLE NOBYPASSRLS PASSWORD :'master_pw';
GRANT CREATE ON DATABASE postgres TO master_x;

-- other_x: 마스터가 늘 SET 할 수 있는 다른 역할(운영의 「로그인 없는 소유 역할」 대역).
CREATE ROLE other_x NOLOGIN;
GRANT other_x TO master_x WITH SET TRUE, INHERIT FALSE;
