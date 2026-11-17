-- s1e — 같은 SELECT 를 READ ONLY 트랜잭션에서(새 연결).
-- READ ONLY 트랜잭션에서는 GRANT 를 못 하므로, 멤버십은 앞 트랜잭션에서 받고 뒤 트랜잭션에서 거둔다.
\pset pager off
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
BEGIN READ ONLY;
SET ROLE app_x;
SELECT count(*) AS rows FROM app_x.table_p;
RESET ROLE;
COMMIT;
REVOKE app_x FROM master_x;
\echo '--- master_only.members ---'
SELECT who FROM master_only.members ORDER BY who;
