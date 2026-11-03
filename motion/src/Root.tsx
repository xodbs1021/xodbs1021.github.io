import { Composition, Still } from "remotion";
import { EdgeLagsPlaylist } from "./scenes/rewind-missing-segment/EdgeLagsPlaylist";
import { REWIND_FALLOUT_FRAMES, RewindFallout } from "./scenes/rewind-missing-segment/RewindFallout";
import { VIDEO } from "./theme";

// 장면 id 는 src/scenes/registry.json 과 같아야 한다(scripts/render.mjs 가 읽는다).
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="RewindFallout"
      component={RewindFallout}
      durationInFrames={REWIND_FALLOUT_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Still id="EdgeLagsPlaylist" component={EdgeLagsPlaylist} width={VIDEO.width} height={VIDEO.height} />
  </>
);
