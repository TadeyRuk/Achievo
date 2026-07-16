import { TRANSITION_FRAMES } from "../theme";
import { VOICEOVER_MANIFEST } from "./manifest-data";

export type SceneDurations = Record<
  (typeof VOICEOVER_MANIFEST.scenes)[number]["id"],
  number
>;

export const getSceneDurations = (): SceneDurations => {
  const durations = {} as SceneDurations;
  for (const scene of VOICEOVER_MANIFEST.scenes) {
    durations[scene.id] = scene.durationInFrames;
  }
  return durations;
};

export const getTotalDurationInFrames = (): number => {
  const sceneTotal = VOICEOVER_MANIFEST.scenes.reduce(
    (sum, scene) => sum + scene.durationInFrames,
    0,
  );
  const transitionCount = VOICEOVER_MANIFEST.scenes.length - 1;
  return sceneTotal - transitionCount * TRANSITION_FRAMES;
};

export const getSceneAudioFiles = () => VOICEOVER_MANIFEST.scenes;

export { VOICEOVER_MANIFEST };
