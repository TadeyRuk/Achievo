import React from "react";
import { Composition } from "remotion";
import {
  PRODUCT_DEMO_DURATION,
  ProductDemo,
} from "./demo/ProductDemo";
import { VIDEO } from "./demo/theme";
import { DynamicComp } from "./DynamicComp";

const defaultCode = `import { AbsoluteFill } from "remotion";
export const MyAnimation = () => <AbsoluteFill style={{ backgroundColor: "#000" }} />;`;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DynamicComp"
        component={DynamicComp}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ code: defaultCode }}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.durationInFrames as number,
          fps: props.fps as number,
        })}
      />
      <Composition
        id="ProductDemo"
        component={ProductDemo}
        durationInFrames={PRODUCT_DEMO_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
