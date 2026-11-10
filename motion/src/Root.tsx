import { CONNECTION_TOKEN_LIFETIME_FRAMES, ConnectionTokenLifetime } from "./scenes/pokeclip-shared-db-auth-iam-tls/ConnectionTokenLifetime";
import { TOKEN_TO_VERIFIED_DB_FRAMES, TokenToVerifiedDb } from "./scenes/pokeclip-shared-db-auth-iam-tls/TokenToVerifiedDb";
import { Composition } from "remotion";
import { CUTOVER_QUEUE_PAUSE_FRAMES, CutoverQueuePause } from "./scenes/aws-gcp-bidirectional-cutover-experiment/CutoverQueuePause";
import { CHAPTER_RULE_FRAMES, ChapterRule } from "./scenes/pokeclip-media-timeline-over-wall-clock/ChapterRule";
import { REF_VS_ENVIRONMENT_FRAMES, RefVsEnvironment } from "./scenes/pokeclip-github-oidc-immutable-subject/RefVsEnvironment";
import { REFETCH_FLOW_FRAMES, RefetchFlow } from "./scenes/rewind-missing-segment/RefetchFlow";
import { REWIND_FALLOUT_FRAMES, RewindFallout } from "./scenes/rewind-missing-segment/RewindFallout";
import { DECODE_RECOVERY_FRAMES, DecodeRecovery } from "./scenes/pokeclip-recording-defect-in-origin/DecodeRecovery";
import { MOBILE_VIDEO, VIDEO } from "./theme";

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
  </>
);
