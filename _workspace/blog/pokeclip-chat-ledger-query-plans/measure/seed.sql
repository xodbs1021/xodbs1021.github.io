-- SegmentLedgerIndexTest @ 7c3464e3 의 SEED_ROWS 와 같은 장부 셋(표 907,200행).
--   idx-v2-only     : 판 2 행 30만
--   idx-legacy-only : 판 NULL 행 30만
--   idx-rollback    : 판 2 행 30만 뒤 판 NULL 행 7,200 (롤백 8시간)
-- 조각 i(1부터)는 위치 (i-1)*4000ms, PDT = T0 + (i-1)*4초, 파일명 시각 = PDT - 200ms. 판 NULL 행에도 PDT 칸은 채운다(원 시험 그대로).
-- 출처: services/chat-collector/src/test/java/com/pokeclip/chat/collector/sync/SegmentLedgerIndexTest.java @ 7c3464e3

\set t0 '''2026-11-13 00:00:00+00'''

INSERT INTO public.stream_segments
       (stream_id, seq, start_pts_ms, start_wall_utc, duration_ms, s3_key, is_discontinuity, playback_pdt, timing_version)
SELECT v.stream_id, i, (i - 1) * 4000,
       timestamptz :t0 + make_interval(secs => (i - 1) * 4.0 - 0.2),
       4000, 'idx/' || i, false,
       timestamptz :t0 + make_interval(secs => (i - 1) * 4.0),
       v.version
  FROM (VALUES ('idx-v2-only',     2::smallint,    1::bigint, 300000::bigint),
               ('idx-legacy-only', NULL::smallint, 1,         300000),
               ('idx-rollback',    2::smallint,    1,         300000),
               ('idx-rollback',    NULL::smallint, 300001,    307200)) AS v(stream_id, version, first_seq, last_seq),
       LATERAL generate_series(v.first_seq, v.last_seq) AS i;

CREATE INDEX IF NOT EXISTS stream_segments_wall_idx ON public.stream_segments (stream_id, start_wall_utc DESC);
CREATE INDEX IF NOT EXISTS stream_segments_v2_seq_idx ON public.stream_segments (stream_id, seq) WHERE timing_version = 2;
CREATE INDEX IF NOT EXISTS stream_segments_legacy_wall_idx ON public.stream_segments (stream_id, start_wall_utc DESC)
    WHERE timing_version IS NULL;
CREATE INDEX IF NOT EXISTS stream_segments_v2_pdt_idx ON public.stream_segments (stream_id, playback_pdt DESC)
    WHERE timing_version = 2;

ANALYZE public.stream_segments;
