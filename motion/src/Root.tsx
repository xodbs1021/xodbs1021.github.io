import { IAM_CONNECTION_LIFETIME_FRAMES, IamConnectionLifetime } from "./scenes/pokeclip-shared-db-auth-iam-tls/IamConnectionLifetime";
import { Composition, Still } from "remotion";
import { BranchTreeVsLine } from "./scenes/rewind-missing-segment/BranchTreeVsLine";
import { EdgeLagsPlaylist } from "./scenes/rewind-missing-segment/EdgeLagsPlaylist";
import { REFETCH_FLOW_FRAMES, RefetchFlow } from "./scenes/rewind-missing-segment/RefetchFlow";
import { REWIND_FALLOUT_FRAMES, RewindFallout } from "./scenes/rewind-missing-segment/RewindFallout";
import { StartPositionCompare } from "./scenes/rewind-missing-segment/StartPositionCompare";
import { VIDEO } from "./theme";

// 장면 id 는 src/scenes/registry.json 과 같아야 한다(scripts/render.mjs 가 읽는다).
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="IamConnectionLifetime" component={IamConnectionLifetime} durationInFrames={IAM_CONNECTION_LIFETIME_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RewindFallout"
      component={RewindFallout}
      durationInFrames={REWIND_FALLOUT_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Still id="EdgeLagsPlaylist" component={EdgeLagsPlaylist} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="RefetchFlow"
      component={RefetchFlow}
      durationInFrames={REFETCH_FLOW_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Still id="StartPositionCompare" component={StartPositionCompare} width={VIDEO.width} height={VIDEO.height} />
    <Still id="BranchTreeVsLine" component={BranchTreeVsLine} width={VIDEO.width} height={VIDEO.height} />
  </>
);
