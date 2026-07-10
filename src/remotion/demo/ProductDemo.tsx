import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import { fontFamily } from "./load-font";
import {
  GamifyScene,
  IntroScene,
  OutroScene,
  PipelineScene,
  RewardScene,
  WhatScene,
} from "./ActualScenes";
import { TRANSITION_FRAMES } from "./theme";
import {
  getSceneDurations,
  getTotalDurationInFrames,
} from "./voiceover/manifest";
import { SceneVoiceover } from "./voiceover/SceneVoiceover";

const transitionTiming = linearTiming({
  durationInFrames: TRANSITION_FRAMES,
});

const SCENE_CONFIG = [
  {
    id: "intro",
    component: IntroScene,
    audio: "voiceover/product-demo/intro.mp3",
  },
  {
    id: "what",
    component: WhatScene,
    audio: "voiceover/product-demo/what.mp3",
  },
  {
    id: "pipeline",
    component: PipelineScene,
    audio: "voiceover/product-demo/pipeline.mp3",
  },
  {
    id: "reward",
    component: RewardScene,
    audio: "voiceover/product-demo/reward.mp3",
  },
  {
    id: "gamify",
    component: GamifyScene,
    audio: "voiceover/product-demo/gamify.mp3",
  },
  {
    id: "outro",
    component: OutroScene,
    audio: "voiceover/product-demo/outro.mp3",
  },
] as const;

export const PRODUCT_DEMO_DURATION = getTotalDurationInFrames();

export const ProductDemo: React.FC = () => {
  const durations = getSceneDurations();

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <TransitionSeries>
        {SCENE_CONFIG.map((scene, index) => {
          const Scene = scene.component;
          const isLast = index === SCENE_CONFIG.length - 1;

          return (
            <React.Fragment key={scene.id}>
              <TransitionSeries.Sequence durationInFrames={durations[scene.id]}>
                <SceneVoiceover file={scene.audio} />
                <Scene />
              </TransitionSeries.Sequence>

              {!isLast && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={transitionTiming}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
