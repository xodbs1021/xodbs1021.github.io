-- s2_as_oneoff — 일회용 로그인 신분으로 돈다. DELETE 가 앱 트리거를 깨운다.
\pset pager off
SELECT current_user, session_user;
\echo '--- 부분 색인 표 SELECT (조건 함수가 일회용 계정으로 돈다) ---'
SELECT count(*) AS rows FROM app_x.table_p;
\echo '--- DELETE (권한 있음) ---'
DELETE FROM app_x.table_a WHERE body = 'bravo';
\echo '--- INSERT (권한 없음) ---'
INSERT INTO app_x.table_a (body) VALUES ('should-fail');
\echo '--- 앱 소유 표 table_d 에 직접 INSERT (권한 없음) ---'
INSERT INTO app_x.table_d VALUES ('direct by oneoff');
\echo '--- 직접 SET ROLE 시도 ---'
SET ROLE app_x;
SET ROLE master_x;
