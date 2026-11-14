-- 녹화 장부 stream_segments 를 재측정용으로 세운다.
--
-- 출처: 3K-PokeClip/PokeClip-mono (공개 저장소, 라이선스 파일 없음 — 측정 재현에 필요한 정의만 발췌)
--   표: services/chat-collector/src/test/java/com/pokeclip/chat/collector/support/StreamSegmentsFixture.java @ 7c3464e3
--       (그 파일은 media/internal/index/ddl.go 의 표 정의에서 채팅 수집기가 읽는 칸만 옮긴 시험용 사본이다)
--   색인: media/internal/index/ddl.go @ fc7dd91c (PR 510 머지 커밋)
--       stream_segments_wall_idx, stream_segments_v2_seq_idx, stream_segments_legacy_wall_idx,
--       stream_segments_v2_pdt_idx(PR 510 이 더한 색인)
--   SegmentLedgerIndexTest @ 7c3464e3 이 세우는 색인 넷과 같다. 운영 표의 다른 칸·색인(session_id 등)은 없다.
--
-- 이 파일은 표와 기본 색인만 만든다. v2_pdt_idx 는 measure.py 가 켜고 끈다(indexes.sql).

CREATE TABLE IF NOT EXISTS public.stream_segments (
    stream_id        text        NOT NULL,
    seq              bigint      NOT NULL,
    start_pts_ms     bigint      NOT NULL,
    start_wall_utc   timestamptz NOT NULL,
    duration_ms      int         NOT NULL,
    s3_key           text        NOT NULL,
    local_path       text,
    upload_state     text        NOT NULL DEFAULT 'pending',
    uploaded_at      timestamptz,
    bytes            bigint,
    is_discontinuity boolean     NOT NULL DEFAULT false,
    playback_pdt     timestamptz,
    timing_version   smallint,
    PRIMARY KEY (stream_id, seq)
);

CREATE UNIQUE INDEX IF NOT EXISTS stream_segments_local_path_uq
    ON public.stream_segments (stream_id, local_path);
