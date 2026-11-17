-- s1_plant.sql — 앱(app_x)이 자기 표에 코드를 심는다(악의 있는 소유자 대역).
-- 마스터가 앱 소유 객체를 만들 때처럼 같은 트랜잭션 안에서만 app_x 멤버십을 쓴다.
\set ON_ERROR_STOP 1
BEGIN;
GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE;
SET ROLE app_x;

-- 1. 보통(SECURITY INVOKER — 기본값) 트리거 함수: 실행자의 권한으로 돈다.
CREATE FUNCTION app_x.probe_del() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE NOTICE 'trigger: enter current_user=% session_user=%', current_user, session_user;
  BEGIN
    SET ROLE other_x;
    RAISE NOTICE 'trigger: SET ROLE other_x -> OK current_user=%', current_user;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'trigger: SET ROLE other_x -> %', SQLERRM;
  END;
  BEGIN
    SET ROLE app_x;
    RAISE NOTICE 'trigger: SET ROLE app_x -> OK current_user=%', current_user;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'trigger: SET ROLE app_x -> %', SQLERRM;
  END;
  RESET ROLE;
  RAISE NOTICE 'trigger: after RESET ROLE current_user=%', current_user;
  BEGIN
    INSERT INTO master_only.members VALUES ('trigger as ' || current_user);
    RAISE NOTICE 'trigger: INSERT master_only -> OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'trigger: INSERT master_only -> %', SQLERRM;
  END;
  RETURN OLD;
END $$;
CREATE TRIGGER table_a_probe BEFORE DELETE ON app_x.table_a
  FOR EACH ROW EXECUTE FUNCTION app_x.probe_del();

-- 2. 같은 일을 SECURITY DEFINER 로 만든 변형(대조용)
CREATE FUNCTION app_x.probe_definer() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RAISE NOTICE 'definer: current_user=% session_user=%', current_user, session_user;
  BEGIN
    RESET ROLE;
    RAISE NOTICE 'definer: RESET ROLE -> OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'definer: RESET ROLE -> %', SQLERRM;
  END;
END $$;

-- 2b. 앱 소유 SECURITY DEFINER 트리거 — 누가 DELETE 하든 소유자(app_x) 권한으로 돈다.
--     table_d 는 app_x 만 쓸 수 있는 표(일회용 계정 · 마스터에게 권한 없음).
CREATE TABLE app_x.table_d (who text);
CREATE FUNCTION app_x.definer_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RAISE NOTICE 'definer-trigger: current_user=% session_user=%', current_user, session_user;
  BEGIN
    INSERT INTO app_x.table_d VALUES ('definer-trigger as ' || current_user || ' for ' || session_user);
    RAISE NOTICE 'definer-trigger: INSERT app_x.table_d -> OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'definer-trigger: INSERT app_x.table_d -> %', SQLERRM;
  END;
  BEGIN
    INSERT INTO master_only.members VALUES ('definer-trigger as ' || current_user);
    RAISE NOTICE 'definer-trigger: INSERT master_only -> OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'definer-trigger: INSERT master_only -> %', SQLERRM;
  END;
  RETURN OLD;
END $$;
CREATE TRIGGER table_a_definer BEFORE DELETE ON app_x.table_a
  FOR EACH ROW EXECUTE FUNCTION app_x.definer_trg();

-- 3. 쓰기 함수(VOLATILE) — 세션 사용자로 돌아가 마스터 전용 표에 쓰고, 원래 역할로 되돌린다.
--    되돌려야 바깥 질의가 원래 역할로 권한 검사를 지나 함께 커밋된다.
--    IMMUTABLE 함수가 이 함수를 부르면 부른 쪽 세션의 권한으로 쓴다.
CREATE FUNCTION app_x.vol_write(tag text) RETURNS void LANGUAGE plpgsql VOLATILE AS $$
DECLARE prev text := current_user;
BEGIN
  RAISE NOTICE 'vol_write(%): enter current_user=% session_user=%', tag, current_user, session_user;
  RESET ROLE;
  INSERT INTO master_only.members VALUES (tag || ' as ' || current_user);
  RAISE NOTICE 'vol_write(%): RESET ROLE -> INSERT master_only OK as %', tag, current_user;
  PERFORM set_config('role', prev, false);
  RAISE NOTICE 'vol_write(%): role restored to %', tag, current_user;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vol_write(%): % (as %)', tag, SQLERRM, current_user;
END $$;

-- 3b. 대조: 역할을 되돌리지 않는 꼴
CREATE FUNCTION app_x.vol_write_naive(tag text) RETURNS void LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  RESET ROLE;
  INSERT INTO master_only.members VALUES (tag || ' as ' || current_user);
  RAISE NOTICE 'vol_write_naive(%): RESET ROLE -> INSERT master_only OK as % (role not restored)', tag, current_user;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vol_write_naive(%): % (as %)', tag, SQLERRM, current_user;
END $$;

-- 4. 열 값을 받는 식 색인 함수 — INSERT · UPDATE 때 계산된다
CREATE FUNCTION app_x.tag(t text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RAISE NOTICE 'index-expr tag(%): current_user=% session_user=%', t, current_user, session_user;
  RETURN 'tag:' || t;
END $$;
CREATE INDEX table_i_tag ON app_x.table_i ((app_x.tag(body)));

-- 5. 인자 없는 IMMUTABLE 함수를 조건으로 쓴 부분 색인 — 플래너가 상수로 접는다
CREATE FUNCTION app_x.gate() RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- 세션 안에서 몇 번 불렸는지 센다(측정용 — NOTICE 는 출력 순서가 섞일 수 있어 따로 센다)
  PERFORM set_config('wipe.gate_calls',
    (coalesce(nullif(current_setting('wipe.gate_calls', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'partial-index gate(): current_user=% session_user=%', current_user, session_user;
  PERFORM app_x.vol_write('gate');
  RETURN true;
END $$;
CREATE INDEX table_p_gate ON app_x.table_p (id) WHERE app_x.gate();

-- 5b. 대조: 역할을 되돌리지 않는 쓰기 함수를 부르는 조건(table_q)
CREATE FUNCTION app_x.gate_naive() RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RAISE NOTICE 'partial-index gate_naive(): current_user=% session_user=%', current_user, session_user;
  PERFORM app_x.vol_write_naive('gate_naive');
  RETURN true;
END $$;
CREATE TABLE app_x.table_q (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text NOT NULL);
INSERT INTO app_x.table_q (body) VALUES ('sierra');
CREATE INDEX table_q_gate ON app_x.table_q (id) WHERE app_x.gate_naive();

RESET ROLE;
REVOKE app_x FROM master_x;
COMMIT;
TRUNCATE master_only.members;  -- 색인을 만드는 동안 남은 줄을 지우고 시작
