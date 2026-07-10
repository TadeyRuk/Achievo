import { Audio } from "@remotion/media";
import React from "react";
import { staticFile } from "remotion";

export const SceneVoiceover: React.FC<{ file: string }> = ({ file }) => {
  return <Audio src={staticFile(file)} volume={1} />;
};
