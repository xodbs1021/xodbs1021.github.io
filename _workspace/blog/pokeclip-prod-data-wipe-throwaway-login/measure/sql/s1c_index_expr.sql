-- s1c — 열 값을 받는 식 색인 함수는 언제 계산되나.
-- 마스터는 앱 표 권한이 없으므로 스스로 app_x 를 받아 SET ROLE 한 꼴로 INSERT · UPDATE · DELETE · SELECT.
\pset pager off
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
\echo '--- INSERT ---'
INSERT INTO app_x.table_i (body) VALUES ('mike');
\echo '--- UPDATE ---'
UPDATE app_x.table_i SET body = 'india-2' WHERE body = 'india';
\echo '--- DELETE ---'
DELETE FROM app_x.table_i WHERE body = 'lima';
\echo '--- SELECT ---'
SELECT count(*) FROM app_x.table_i WHERE body = 'juliet';
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
