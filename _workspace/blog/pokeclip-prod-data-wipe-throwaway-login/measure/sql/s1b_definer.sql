-- s1b — 같은 시도를 SECURITY DEFINER 함수 안에서 하면.
\pset pager off
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;
SELECT app_x.probe_definer();
RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
