-- s5_child — 부모 셸이 죽은 뒤에도 끝까지 돌아 역할을 남기는 자식 psql.
-- :name 으로 남길 역할 이름을 받는다.
\set ON_ERROR_STOP 1
SELECT pg_sleep(3);
CREATE ROLE :"name" NOLOGIN;
\echo 'child psql: CREATE ROLE 완료'
