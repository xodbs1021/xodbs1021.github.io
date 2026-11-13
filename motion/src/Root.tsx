import { CHUNK_INTERLEAVE_FRAMES, ChunkInterleave } from "./scenes/rtmp-still-alive/ChunkInterleave";
import { RETRANSMIT_WINDOW_FRAMES, RetransmitWindow } from "./scenes/srt-broadcaster-protocol/RetransmitWindow";
import { WHIP_ROUND_TRIPS_FRAMES, WhipRoundTrips } from "./scenes/whip-whep-modern-ingest/WhipRoundTrips";
import { ICE_CANDIDATE_PAIRS_FRAMES, IceCandidatePairs } from "./scenes/webrtc-deep-dive/IceCandidatePairs";
import { PID_DEMUX_FRAMES, PidDemux } from "./scenes/rtmp-mpeg-ts-srt/PidDemux";
import { PLAYLIST_SLIDE_FRAMES, PlaylistSlide } from "./scenes/hls-just-files/PlaylistSlide";
import { HOLD_BACK_START_FRAMES, HoldBackStart } from "./scenes/hls-deep-dive/HoldBackStart";
import { BLOCKING_PART_FLOW_FRAMES, BlockingPartFlow } from "./scenes/ll-hls-deep-dive/BlockingPartFlow";
import { CHUNKED_SEGMENT_FRAMES, ChunkedSegment } from "./scenes/cmaf-deep-dive/ChunkedSegment";
import { TEMPLATE_VS_RELOAD_FRAMES, TemplateVsReload } from "./scenes/dash-vs-hls/TemplateVsReload";
import { CONNECTION_TOKEN_LIFETIME_FRAMES, ConnectionTokenLifetime } from "./scenes/pokeclip-shared-db-auth-iam-tls/ConnectionTokenLifetime";
import { TOKEN_TO_VERIFIED_DB_FRAMES, TokenToVerifiedDb } from "./scenes/pokeclip-shared-db-auth-iam-tls/TokenToVerifiedDb";
import { Composition } from "remotion";
import { CUTOVER_QUEUE_PAUSE_FRAMES, CutoverQueuePause } from "./scenes/aws-gcp-bidirectional-cutover-experiment/CutoverQueuePause";
import { CHAPTER_RULE_FRAMES, ChapterRule } from "./scenes/pokeclip-media-timeline-over-wall-clock/ChapterRule";
import { REF_VS_ENVIRONMENT_FRAMES, RefVsEnvironment } from "./scenes/pokeclip-github-oidc-immutable-subject/RefVsEnvironment";
import { REFETCH_FLOW_FRAMES, RefetchFlow } from "./scenes/rewind-missing-segment/RefetchFlow";
import { REWIND_FALLOUT_FRAMES, RewindFallout } from "./scenes/rewind-missing-segment/RewindFallout";
import { DECODE_RECOVERY_FRAMES, DecodeRecovery } from "./scenes/pokeclip-recording-defect-in-origin/DecodeRecovery";
import { LATE_RETRANSMIT_FRAMES, LateRetransmit } from "./scenes/pokeclip-srt-latency-late-retransmission/LateRetransmit";
import { ROUND_DOCUMENT_FRAMES, RoundDocument } from "./scenes/pokeclip-round-vod/RoundDocument";
import { STAGE_UNBLOCK_FRAMES, StageUnblock } from "./scenes/pokeclip-black-screen-three-causes/StageUnblock";
import { SESSION_URL_INHERIT_FRAMES, SessionUrlInherit } from "./scenes/pokeclip-session-url-and-endlist/SessionUrlInherit";
import { LATE_WRITER_FENCED_FRAMES, LateWriterFenced } from "./scenes/pokeclip-database-authoritative-manifest-publishing/LateWriterFenced";
import { PUBLISH_BOUNDARY_FRAMES, PublishBoundary } from "./scenes/pokeclip-manifest-window-boundaries/PublishBoundary";
import { DEPLOY_ORDER_FRAMES, DeployOrder } from "./scenes/stream-id-contract-compatible-migration/DeployOrder";
import { LIVE_HANDOFF_FRAMES, LiveHandoff } from "./scenes/pokeclip-live-dvr-separation-handoff/LiveHandoff";
import { LIVE_WINDOW_PAUSE_FRAMES, LiveWindowPause } from "./scenes/pokeclip-live-window-without-fork/LiveWindowPause";
import { AUDIO_GAP_SEAM_FRAMES, AudioGapSeam } from "./scenes/pokeclip-reconnect-audio-gap/AudioGapSeam";
import { OVERLAP_QUERY_FRAMES, OverlapQuery } from "./scenes/pokeclip-segment-overlap-contract/OverlapQuery";
import { SEGMENT_THREE_WAYS_FRAMES, SegmentThreeWays } from "./scenes/pokeclip-live-editing-boundaries/SegmentThreeWays";
import { RECIPE_RERENDER_FRAMES, RecipeRerender } from "./scenes/clip-edit-recipe-render-boundary/RecipeRerender";
import { BROADCAST_EVENT_FANOUT_FRAMES, BroadcastEventFanout } from "./scenes/pokeclip-language-ownership-boundaries/BroadcastEventFanout";
import { DVR_WINDOW_SEEK_FRAMES, DvrWindowSeek } from "./scenes/pokeclip-mediamtx-build-or-adopt/DvrWindowSeek";
import { MEDIA_BOX_REPLACE_FRAMES, MediaBoxReplace } from "./scenes/pokeclip-stateful-media-deployment/MediaBoxReplace";
import { TFDT_STACK_SEEK_FRAMES, TfdtStackSeek } from "./scenes/pokeclip-zero-errors-missing-playback/TfdtStackSeek";
import { TFDT_REBASE_ABC_FRAMES, TfdtRebaseAbc } from "./scenes/pokeclip-cdn-timeline-normalization/TfdtRebaseAbc";
import { REMUX_INIT_DRIFT_FRAMES, RemuxInitDrift } from "./scenes/pokeclip-go-remux-same-io-benchmark/RemuxInitDrift";
import { THREE_AXIS_UPLOAD_FRAMES, ThreeAxisUpload } from "./scenes/pokeclip-playback-producer-boundaries/ThreeAxisUpload";
import { MOBILE_VIDEO, VIDEO } from "./theme";
import { SIX_TRACK_FUNNEL_FRAMES, SixTrackFunnel } from "./scenes/pokeclip-six-track-input-contract/SixTrackFunnel";
import { SHARED_ENCODER_START_FRAMES, SharedEncoderStart } from "./scenes/pokeclip-obs-shared-encoder-srt/SharedEncoderStart";
import { AUTO_ASSIGN_RESTORE_FRAMES, AutoAssignRestore } from "./scenes/pokeclip-audio-assignment-user-state/AutoAssignRestore";
import { MULTIAUDIO_STAGE_PROOF_FRAMES, MultiaudioStageProof } from "./scenes/pokeclip-multiaudio-end-to-end-verification/MultiaudioStageProof";
import { TRACK_PICK_IN_CLIP_FRAMES, TrackPickInClip } from "./scenes/microphone-selection-without-always-on-vad/TrackPickInClip";
import { UPLOAD_CRASH_RESUME_FRAMES, UploadCrashResume } from "./scenes/pokeclip-upload-state-and-recovery/UploadCrashResume";
import { HOOK_LOSS_RESCAN_FRAMES, HookLossRescan } from "./scenes/pokeclip-indexer-recovery-without-events/HookLossRescan";
import { BATCH_GET_CONCURRENCY_FRAMES, BatchGetConcurrency } from "./scenes/pokeclip-storage-before-new-layer/BatchGetConcurrency";
import { CACHE_KEY_VS_ORIGIN_FORWARD_FRAMES, CacheKeyVsOriginForward } from "./scenes/pokeclip-cdn-cache-auth-measurement/CacheKeyVsOriginForward";
import { PAIRING_CODE_LIFETIME_FRAMES, PairingCodeLifetime } from "./scenes/pokeclip-one-time-pairing-contract/PairingCodeLifetime";
import { SECRET_PATH_ONE_CONNECTION_FRAMES, SecretPathOneConnection } from "./scenes/pokeclip-secret-storage-migration-plan/SecretPathOneConnection";
import { SEARCH_PATH_HIJACK_FRAMES, SearchPathHijack } from "./scenes/pokeclip-shared-db-login-privileges/SearchPathHijack";
import { UPLOAD_REQUEST_PATH_FRAMES, UploadRequestPath } from "./scenes/pokeclip-editing-upload-authorization/UploadRequestPath";
import { CHAT_SPIKE_TO_CARD_FRAMES, ChatSpikeToCard } from "./scenes/chat-highlight-research-and-fallback/ChatSpikeToCard";
import { COVERAGE_GATE_RUNS_FRAMES, CoverageGateRuns } from "./scenes/coverage-gate-that-fails-when-tests-disappear/CoverageGateRuns";
import { PROTECTION_FIRST_ORDER_FRAMES, ProtectionFirstOrder } from "./scenes/media-ci-path-filter-required-check-tradeoff/ProtectionFirstOrder";
import { DECOY_DB_GUARD_FRAMES, DecoyDbGuard } from "./scenes/pokeclip-test-database-ownership-marker/DecoyDbGuard";
import { SESSION_STATE_SPLIT_FRAMES, SessionStateSplit } from "./scenes/harness-session-isolation-worktree-root/SessionStateSplit";
import { GENERATION_AND_PLAN_GATES_FRAMES, GenerationAndPlanGates } from "./scenes/shakedown-bounded-ai-image-generation/GenerationAndPlanGates";
import { START_STOP_TIME_BUDGETS_FRAMES, StartStopTimeBudgets } from "./scenes/shakedown-plan-deployment-and-recovery/StartStopTimeBudgets";
import { BROKEN_JAVA_GATE_FRAMES, BrokenJavaGate } from "./scenes/shakedown-java-syntax-before-security-scan/BrokenJavaGate";
import { PRIMARY_KILL_FAILOVER_FRAMES, PrimaryKillFailover } from "./scenes/shakedown-database-tls-identity-and-failover/PrimaryKillFailover";
import { RESTORE_TARGET_CHECK_FRAMES, RestoreTargetCheck } from "./scenes/shakedown-database-restore-proves-backup/RestoreTargetCheck";
import { REBOOT_TWICE_TOMBSTONE_FRAMES, RebootTwiceTombstone } from "./scenes/shakedown-reboot-recovery-and-deletion/RebootTwiceTombstone";
import { CRASH_LEFTOVER_CONTAINER_FRAMES, CrashLeftoverContainer } from "./scenes/pokeclip-media-host-restart-lifecycle/CrashLeftoverContainer";
import { PLAYBACK_QUERY_GUARD_FRAMES, PlaybackQueryGuard } from "./scenes/pokeclip-nginx-playback-request-boundary/PlaybackQueryGuard";
import { VOLUME_FIRST_COPY_FRAMES, VolumeFirstCopy } from "./scenes/pokeclip-scratch-volume-ownership/VolumeFirstCopy";
import { HLS_SESSION_AFTER_CUT_FRAMES, HlsSessionAfterCut } from "./scenes/pokeclip-dependency-upgrade-contracts/HlsSessionAfterCut";
import { AUTH_QUEUE_SERIAL_FRAMES, AuthQueueSerial } from "./scenes/pokeclip-path-reconciler-design-history/AuthQueueSerial";
import { OPTION_SCOPE_OVERRIDE_FRAMES, OptionScopeOverride } from "./scenes/ffmpeg-deep-dive/OptionScopeOverride";
import { VBV_BUFFER_FRAMES, VbvBuffer } from "./scenes/x264-live-rate-control-gop/VbvBuffer";
import { SHARED_SEGMENTS_FRAMES, SharedSegments } from "./scenes/ffmpeg-hls-dash-muxer/SharedSegments";
import { CONVEX_HULL_CLIMB_FRAMES, ConvexHullClimb } from "./scenes/abr-ladder-design/ConvexHullClimb";
import { GPU_MEMORY_PATH_FRAMES, GpuMemoryPath } from "./scenes/nvenc-gpu-transcoding/GpuMemoryPath";
import { SPEED_BELOW_REALTIME_FRAMES, SpeedBelowRealtime } from "./scenes/live-transcoding-infrastructure/SpeedBelowRealtime";
import { DECODE_ORDER_FRAMES, DecodeOrder } from "./scenes/h264-deep-dive/DecodeOrder";
import { CTU_QUADTREE_FRAMES, CtuQuadtree } from "./scenes/h265-hdr-deep-dive/CtuQuadtree";
import { AV1_REF_SLOTS_FRAMES, Av1RefSlots } from "./scenes/av1-vp9-deep-dive/Av1RefSlots";
import { SBR_FILL_FRAMES, SbrFill } from "./scenes/aac-and-friends/SbrFill";
import { OPUS_MODE_STRIP_FRAMES, OpusModeStrip } from "./scenes/opus-deep-dive/OpusModeStrip";
import { PLAYER_START_CHAIN_FRAMES, PlayerStartChain } from "./scenes/codec-decision-and-debugging/PlayerStartChain";
import { FRAME_TO_PLAYER_FRAMES, FrameToPlayer } from "./scenes/streaming-basics-from-scratch/FrameToPlayer";
import { VMAF_PER_FRAME_FRAMES, VmafPerFrame } from "./scenes/video-quality-bitrate-abr/VmafPerFrame";
import { BUFFER_DRAIN_STALL_FRAMES, BufferDrainStall } from "./scenes/buffering-deep-dive/BufferDrainStall";
import { COALESCE_TIERS_FRAMES, CoalesceTiers } from "./scenes/cdn-for-live-streaming/CoalesceTiers";
import { ACKS_ISR_COMMIT_FRAMES, AcksIsrCommit } from "./scenes/kafka-core-concepts-technical-review/AcksIsrCommit";

// 장면 id 는 src/scenes/registry.json 과 같아야 한다(scripts/render.mjs 가 읽는다).
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ConnectionTokenLifetime" component={ConnectionTokenLifetime} durationInFrames={CONNECTION_TOKEN_LIFETIME_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition id="TokenToVerifiedDb" component={TokenToVerifiedDb} durationInFrames={TOKEN_TO_VERIFIED_DB_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RewindFallout"
      component={RewindFallout}
      durationInFrames={REWIND_FALLOUT_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    {/* 휴대폰판(4:5) — registry.json 의 "mobile": true 장면만. id 는 <장면 id>Mobile. */}
    <Composition
      id="RewindFalloutMobile"
      component={RewindFallout}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={REWIND_FALLOUT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition
      id="RefetchFlow"
      component={RefetchFlow}
      durationInFrames={REFETCH_FLOW_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="RefetchFlowMobile"
      component={RefetchFlow}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={REFETCH_FLOW_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="RefVsEnvironment" component={RefVsEnvironment} durationInFrames={REF_VS_ENVIRONMENT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RefVsEnvironmentMobile"
      component={RefVsEnvironment}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={REF_VS_ENVIRONMENT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="CutoverQueuePause" component={CutoverQueuePause} durationInFrames={CUTOVER_QUEUE_PAUSE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="CutoverQueuePauseMobile"
      component={CutoverQueuePause}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CUTOVER_QUEUE_PAUSE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="ChapterRule" component={ChapterRule} durationInFrames={CHAPTER_RULE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="ChapterRuleMobile"
      component={ChapterRule}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CHAPTER_RULE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="DecodeRecovery" component={DecodeRecovery} durationInFrames={DECODE_RECOVERY_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="DecodeRecoveryMobile"
      component={DecodeRecovery}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={DECODE_RECOVERY_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="LateRetransmit" component={LateRetransmit} durationInFrames={LATE_RETRANSMIT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="LateRetransmitMobile"
      component={LateRetransmit}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={LATE_RETRANSMIT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="RoundDocument" component={RoundDocument} durationInFrames={ROUND_DOCUMENT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RoundDocumentMobile"
      component={RoundDocument}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={ROUND_DOCUMENT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="StageUnblock" component={StageUnblock} durationInFrames={STAGE_UNBLOCK_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="StageUnblockMobile"
      component={StageUnblock}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={STAGE_UNBLOCK_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SessionUrlInherit" component={SessionUrlInherit} durationInFrames={SESSION_URL_INHERIT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SessionUrlInheritMobile"
      component={SessionUrlInherit}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SESSION_URL_INHERIT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="LateWriterFenced" component={LateWriterFenced} durationInFrames={LATE_WRITER_FENCED_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="LateWriterFencedMobile"
      component={LateWriterFenced}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={LATE_WRITER_FENCED_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="PublishBoundary" component={PublishBoundary} durationInFrames={PUBLISH_BOUNDARY_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="PublishBoundaryMobile"
      component={PublishBoundary}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={PUBLISH_BOUNDARY_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="DeployOrder" component={DeployOrder} durationInFrames={DEPLOY_ORDER_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="DeployOrderMobile"
      component={DeployOrder}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={DEPLOY_ORDER_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="LiveHandoff" component={LiveHandoff} durationInFrames={LIVE_HANDOFF_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="LiveHandoffMobile"
      component={LiveHandoff}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={LIVE_HANDOFF_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="LiveWindowPause" component={LiveWindowPause} durationInFrames={LIVE_WINDOW_PAUSE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="LiveWindowPauseMobile"
      component={LiveWindowPause}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={LIVE_WINDOW_PAUSE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="AudioGapSeam" component={AudioGapSeam} durationInFrames={AUDIO_GAP_SEAM_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="AudioGapSeamMobile"
      component={AudioGapSeam}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={AUDIO_GAP_SEAM_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="OverlapQuery" component={OverlapQuery} durationInFrames={OVERLAP_QUERY_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="OverlapQueryMobile"
      component={OverlapQuery}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={OVERLAP_QUERY_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SegmentThreeWays" component={SegmentThreeWays} durationInFrames={SEGMENT_THREE_WAYS_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SegmentThreeWaysMobile"
      component={SegmentThreeWays}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SEGMENT_THREE_WAYS_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="RecipeRerender" component={RecipeRerender} durationInFrames={RECIPE_RERENDER_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RecipeRerenderMobile"
      component={RecipeRerender}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={RECIPE_RERENDER_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="BroadcastEventFanout" component={BroadcastEventFanout} durationInFrames={BROADCAST_EVENT_FANOUT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="BroadcastEventFanoutMobile"
      component={BroadcastEventFanout}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={BROADCAST_EVENT_FANOUT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="DvrWindowSeek" component={DvrWindowSeek} durationInFrames={DVR_WINDOW_SEEK_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="DvrWindowSeekMobile"
      component={DvrWindowSeek}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={DVR_WINDOW_SEEK_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="MediaBoxReplace" component={MediaBoxReplace} durationInFrames={MEDIA_BOX_REPLACE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="MediaBoxReplaceMobile"
      component={MediaBoxReplace}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={MEDIA_BOX_REPLACE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="TfdtStackSeek" component={TfdtStackSeek} durationInFrames={TFDT_STACK_SEEK_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="TfdtStackSeekMobile"
      component={TfdtStackSeek}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={TFDT_STACK_SEEK_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="TfdtRebaseAbc" component={TfdtRebaseAbc} durationInFrames={TFDT_REBASE_ABC_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="TfdtRebaseAbcMobile"
      component={TfdtRebaseAbc}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={TFDT_REBASE_ABC_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="RemuxInitDrift" component={RemuxInitDrift} durationInFrames={REMUX_INIT_DRIFT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RemuxInitDriftMobile"
      component={RemuxInitDrift}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={REMUX_INIT_DRIFT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="ThreeAxisUpload" component={ThreeAxisUpload} durationInFrames={THREE_AXIS_UPLOAD_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="ThreeAxisUploadMobile"
      component={ThreeAxisUpload}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={THREE_AXIS_UPLOAD_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SixTrackFunnel" component={SixTrackFunnel} durationInFrames={SIX_TRACK_FUNNEL_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SixTrackFunnelMobile"
      component={SixTrackFunnel}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SIX_TRACK_FUNNEL_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SharedEncoderStart" component={SharedEncoderStart} durationInFrames={SHARED_ENCODER_START_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SharedEncoderStartMobile"
      component={SharedEncoderStart}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SHARED_ENCODER_START_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="AutoAssignRestore" component={AutoAssignRestore} durationInFrames={AUTO_ASSIGN_RESTORE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="AutoAssignRestoreMobile"
      component={AutoAssignRestore}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={AUTO_ASSIGN_RESTORE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="MultiaudioStageProof" component={MultiaudioStageProof} durationInFrames={MULTIAUDIO_STAGE_PROOF_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="MultiaudioStageProofMobile"
      component={MultiaudioStageProof}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={MULTIAUDIO_STAGE_PROOF_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="TrackPickInClip" component={TrackPickInClip} durationInFrames={TRACK_PICK_IN_CLIP_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="TrackPickInClipMobile"
      component={TrackPickInClip}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={TRACK_PICK_IN_CLIP_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="UploadCrashResume" component={UploadCrashResume} durationInFrames={UPLOAD_CRASH_RESUME_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="UploadCrashResumeMobile"
      component={UploadCrashResume}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={UPLOAD_CRASH_RESUME_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="HookLossRescan" component={HookLossRescan} durationInFrames={HOOK_LOSS_RESCAN_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="HookLossRescanMobile"
      component={HookLossRescan}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={HOOK_LOSS_RESCAN_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="BatchGetConcurrency" component={BatchGetConcurrency} durationInFrames={BATCH_GET_CONCURRENCY_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="BatchGetConcurrencyMobile"
      component={BatchGetConcurrency}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={BATCH_GET_CONCURRENCY_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="CacheKeyVsOriginForward" component={CacheKeyVsOriginForward} durationInFrames={CACHE_KEY_VS_ORIGIN_FORWARD_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="CacheKeyVsOriginForwardMobile"
      component={CacheKeyVsOriginForward}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CACHE_KEY_VS_ORIGIN_FORWARD_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="PairingCodeLifetime" component={PairingCodeLifetime} durationInFrames={PAIRING_CODE_LIFETIME_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="PairingCodeLifetimeMobile"
      component={PairingCodeLifetime}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={PAIRING_CODE_LIFETIME_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SecretPathOneConnection" component={SecretPathOneConnection} durationInFrames={SECRET_PATH_ONE_CONNECTION_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SecretPathOneConnectionMobile"
      component={SecretPathOneConnection}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SECRET_PATH_ONE_CONNECTION_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SearchPathHijack" component={SearchPathHijack} durationInFrames={SEARCH_PATH_HIJACK_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SearchPathHijackMobile"
      component={SearchPathHijack}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SEARCH_PATH_HIJACK_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="UploadRequestPath" component={UploadRequestPath} durationInFrames={UPLOAD_REQUEST_PATH_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="UploadRequestPathMobile"
      component={UploadRequestPath}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={UPLOAD_REQUEST_PATH_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="ChatSpikeToCard" component={ChatSpikeToCard} durationInFrames={CHAT_SPIKE_TO_CARD_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="ChatSpikeToCardMobile"
      component={ChatSpikeToCard}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CHAT_SPIKE_TO_CARD_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="CoverageGateRuns" component={CoverageGateRuns} durationInFrames={COVERAGE_GATE_RUNS_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="CoverageGateRunsMobile"
      component={CoverageGateRuns}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={COVERAGE_GATE_RUNS_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="ProtectionFirstOrder" component={ProtectionFirstOrder} durationInFrames={PROTECTION_FIRST_ORDER_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="ProtectionFirstOrderMobile"
      component={ProtectionFirstOrder}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={PROTECTION_FIRST_ORDER_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="DecoyDbGuard" component={DecoyDbGuard} durationInFrames={DECOY_DB_GUARD_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="DecoyDbGuardMobile"
      component={DecoyDbGuard}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={DECOY_DB_GUARD_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SessionStateSplit" component={SessionStateSplit} durationInFrames={SESSION_STATE_SPLIT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SessionStateSplitMobile"
      component={SessionStateSplit}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SESSION_STATE_SPLIT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="GenerationAndPlanGates" component={GenerationAndPlanGates} durationInFrames={GENERATION_AND_PLAN_GATES_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="GenerationAndPlanGatesMobile"
      component={GenerationAndPlanGates}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={GENERATION_AND_PLAN_GATES_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="StartStopTimeBudgets" component={StartStopTimeBudgets} durationInFrames={START_STOP_TIME_BUDGETS_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="StartStopTimeBudgetsMobile"
      component={StartStopTimeBudgets}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={START_STOP_TIME_BUDGETS_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="BrokenJavaGate" component={BrokenJavaGate} durationInFrames={BROKEN_JAVA_GATE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="BrokenJavaGateMobile"
      component={BrokenJavaGate}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={BROKEN_JAVA_GATE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="PrimaryKillFailover" component={PrimaryKillFailover} durationInFrames={PRIMARY_KILL_FAILOVER_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="PrimaryKillFailoverMobile"
      component={PrimaryKillFailover}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={PRIMARY_KILL_FAILOVER_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="RestoreTargetCheck" component={RestoreTargetCheck} durationInFrames={RESTORE_TARGET_CHECK_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RestoreTargetCheckMobile"
      component={RestoreTargetCheck}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={RESTORE_TARGET_CHECK_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="RebootTwiceTombstone" component={RebootTwiceTombstone} durationInFrames={REBOOT_TWICE_TOMBSTONE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RebootTwiceTombstoneMobile"
      component={RebootTwiceTombstone}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={REBOOT_TWICE_TOMBSTONE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="CrashLeftoverContainer" component={CrashLeftoverContainer} durationInFrames={CRASH_LEFTOVER_CONTAINER_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="CrashLeftoverContainerMobile"
      component={CrashLeftoverContainer}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CRASH_LEFTOVER_CONTAINER_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="PlaybackQueryGuard" component={PlaybackQueryGuard} durationInFrames={PLAYBACK_QUERY_GUARD_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="PlaybackQueryGuardMobile"
      component={PlaybackQueryGuard}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={PLAYBACK_QUERY_GUARD_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="VolumeFirstCopy" component={VolumeFirstCopy} durationInFrames={VOLUME_FIRST_COPY_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="VolumeFirstCopyMobile"
      component={VolumeFirstCopy}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={VOLUME_FIRST_COPY_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="HlsSessionAfterCut" component={HlsSessionAfterCut} durationInFrames={HLS_SESSION_AFTER_CUT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="HlsSessionAfterCutMobile"
      component={HlsSessionAfterCut}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={HLS_SESSION_AFTER_CUT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="AuthQueueSerial" component={AuthQueueSerial} durationInFrames={AUTH_QUEUE_SERIAL_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="AuthQueueSerialMobile"
      component={AuthQueueSerial}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={AUTH_QUEUE_SERIAL_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="ChunkInterleave" component={ChunkInterleave} durationInFrames={CHUNK_INTERLEAVE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="ChunkInterleaveMobile"
      component={ChunkInterleave}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CHUNK_INTERLEAVE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="RetransmitWindow" component={RetransmitWindow} durationInFrames={RETRANSMIT_WINDOW_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RetransmitWindowMobile"
      component={RetransmitWindow}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={RETRANSMIT_WINDOW_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="WhipRoundTrips" component={WhipRoundTrips} durationInFrames={WHIP_ROUND_TRIPS_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="WhipRoundTripsMobile"
      component={WhipRoundTrips}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={WHIP_ROUND_TRIPS_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="IceCandidatePairs" component={IceCandidatePairs} durationInFrames={ICE_CANDIDATE_PAIRS_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="IceCandidatePairsMobile"
      component={IceCandidatePairs}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={ICE_CANDIDATE_PAIRS_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="PidDemux" component={PidDemux} durationInFrames={PID_DEMUX_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="PidDemuxMobile"
      component={PidDemux}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={PID_DEMUX_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="PlaylistSlide" component={PlaylistSlide} durationInFrames={PLAYLIST_SLIDE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="PlaylistSlideMobile"
      component={PlaylistSlide}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={PLAYLIST_SLIDE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="HoldBackStart" component={HoldBackStart} durationInFrames={HOLD_BACK_START_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="HoldBackStartMobile"
      component={HoldBackStart}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={HOLD_BACK_START_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="BlockingPartFlow" component={BlockingPartFlow} durationInFrames={BLOCKING_PART_FLOW_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="BlockingPartFlowMobile"
      component={BlockingPartFlow}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={BLOCKING_PART_FLOW_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="ChunkedSegment" component={ChunkedSegment} durationInFrames={CHUNKED_SEGMENT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="ChunkedSegmentMobile"
      component={ChunkedSegment}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CHUNKED_SEGMENT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="TemplateVsReload" component={TemplateVsReload} durationInFrames={TEMPLATE_VS_RELOAD_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="TemplateVsReloadMobile"
      component={TemplateVsReload}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={TEMPLATE_VS_RELOAD_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="OptionScopeOverride" component={OptionScopeOverride} durationInFrames={OPTION_SCOPE_OVERRIDE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="OptionScopeOverrideMobile"
      component={OptionScopeOverride}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={OPTION_SCOPE_OVERRIDE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="VbvBuffer" component={VbvBuffer} durationInFrames={VBV_BUFFER_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="VbvBufferMobile"
      component={VbvBuffer}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={VBV_BUFFER_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SharedSegments" component={SharedSegments} durationInFrames={SHARED_SEGMENTS_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SharedSegmentsMobile"
      component={SharedSegments}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SHARED_SEGMENTS_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="ConvexHullClimb" component={ConvexHullClimb} durationInFrames={CONVEX_HULL_CLIMB_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="ConvexHullClimbMobile"
      component={ConvexHullClimb}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CONVEX_HULL_CLIMB_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="GpuMemoryPath" component={GpuMemoryPath} durationInFrames={GPU_MEMORY_PATH_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="GpuMemoryPathMobile"
      component={GpuMemoryPath}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={GPU_MEMORY_PATH_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SpeedBelowRealtime" component={SpeedBelowRealtime} durationInFrames={SPEED_BELOW_REALTIME_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SpeedBelowRealtimeMobile"
      component={SpeedBelowRealtime}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SPEED_BELOW_REALTIME_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="DecodeOrder" component={DecodeOrder} durationInFrames={DECODE_ORDER_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="DecodeOrderMobile"
      component={DecodeOrder}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={DECODE_ORDER_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="CtuQuadtree" component={CtuQuadtree} durationInFrames={CTU_QUADTREE_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="CtuQuadtreeMobile"
      component={CtuQuadtree}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={CTU_QUADTREE_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="Av1RefSlots" component={Av1RefSlots} durationInFrames={AV1_REF_SLOTS_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="Av1RefSlotsMobile"
      component={Av1RefSlots}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={AV1_REF_SLOTS_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="SbrFill" component={SbrFill} durationInFrames={SBR_FILL_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="SbrFillMobile"
      component={SbrFill}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={SBR_FILL_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="OpusModeStrip" component={OpusModeStrip} durationInFrames={OPUS_MODE_STRIP_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="OpusModeStripMobile"
      component={OpusModeStrip}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={OPUS_MODE_STRIP_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="PlayerStartChain" component={PlayerStartChain} durationInFrames={PLAYER_START_CHAIN_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="PlayerStartChainMobile"
      component={PlayerStartChain}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={PLAYER_START_CHAIN_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="FrameToPlayer" component={FrameToPlayer} durationInFrames={FRAME_TO_PLAYER_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="FrameToPlayerMobile"
      component={FrameToPlayer}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={FRAME_TO_PLAYER_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="VmafPerFrame" component={VmafPerFrame} durationInFrames={VMAF_PER_FRAME_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="VmafPerFrameMobile"
      component={VmafPerFrame}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={VMAF_PER_FRAME_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="BufferDrainStall" component={BufferDrainStall} durationInFrames={BUFFER_DRAIN_STALL_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="BufferDrainStallMobile"
      component={BufferDrainStall}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={BUFFER_DRAIN_STALL_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="CoalesceTiers" component={CoalesceTiers} durationInFrames={COALESCE_TIERS_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="CoalesceTiersMobile"
      component={CoalesceTiers}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={COALESCE_TIERS_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
    <Composition id="AcksIsrCommit" component={AcksIsrCommit} durationInFrames={ACKS_ISR_COMMIT_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="AcksIsrCommitMobile"
      component={AcksIsrCommit}
      defaultProps={{ layout: "mobile" as const }}
      durationInFrames={ACKS_ISR_COMMIT_FRAMES}
      fps={MOBILE_VIDEO.fps}
      width={MOBILE_VIDEO.width}
      height={MOBILE_VIDEO.height}
    />
  </>
);
