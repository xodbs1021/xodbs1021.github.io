-- s4_delete — psql -X -1 -v ON_ERROR_STOP=1 -f 로 돌릴 한 걸음(psql 이 BEGIN · COMMIT 을 붙인다).
-- 마스터는 앱 표 권한이 없으므로 같은 트랜잭션 안에서 앱 역할을 받아 지우고 거둔다.
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
DELETE FROM app_x.table_i WHERE body = 'kilo';
RESET ROLE;
REVOKE app_x FROM master_x;
