import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { bodyFontFamily, fontFamily } from "./load-font";
import { COLORS } from "./theme";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const smoothEasing = Easing.bezier(0.16, 1, 0.3, 1);

const pageStyle: React.CSSProperties = {
  backgroundColor: COLORS.background,
  color: COLORS.foreground,
  fontFamily: bodyFontFamily,
  overflow: "hidden",
};

const Glow: React.FC<{ top?: number; left?: number }> = ({
  top = -360,
  left = 600,
}) => (
  <div
    style={{
      position: "absolute",
      width: 720,
      height: 720,
      borderRadius: "50%",
      backgroundColor: COLORS.primary,
      filter: "blur(200px)",
      opacity: 0.16,
      top,
      left,
    }}
  />
);

const FadeUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    ...clamp,
    easing: smoothEasing,
  });
  const translateY = interpolate(frame, [delay, delay + 18], [24, 0], {
    ...clamp,
    easing: smoothEasing,
  });

  return (
    <div style={{ opacity, translate: `0 ${translateY}px`, ...style }}>
      {children}
    </div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily,
      color: COLORS.primary,
      fontSize: 27,
      fontWeight: 700,
      letterSpacing: "0.13em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily,
      fontSize: 66,
      fontWeight: 800,
      letterSpacing: "-0.03em",
      lineHeight: 1.08,
      marginTop: 14,
    }}
  >
    {children}
  </div>
);

// Achievo's screenshots are already framed inside an iPhone bezel
// (1400x2700 source), so we just scale them to a consistent stage height.
const PHONE_ASPECT = 1400 / 2700;

const Phone: React.FC<{
  src: string;
  height?: number;
  opacity?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
}> = ({
  src,
  height = 900,
  opacity = 1,
  scale = 1,
  translateX = 0,
  translateY = 0,
}) => (
  <div
    style={{
      width: height * PHONE_ASPECT,
      height,
      opacity,
      scale,
      translate: `${translateX}px ${translateY}px`,
      filter: "drop-shadow(0 30px 70px rgba(0, 0, 0, 0.55))",
    }}
  >
    <Img
      src={staticFile(src)}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  </div>
);

const Callout: React.FC<{
  title: string;
  detail: string;
  index: number;
}> = ({ title, detail, index }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "19px 23px",
      borderRadius: 14,
      border: `1px solid ${COLORS.border}`,
      backgroundColor: "rgba(6, 29, 50, 0.94)",
      boxShadow: "0 14px 42px rgba(0,0,0,.45)",
      maxWidth: 590,
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        flexShrink: 0,
        borderRadius: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        color: COLORS.background,
        fontFamily,
        fontSize: 21,
        fontWeight: 800,
      }}
    >
      {index}
    </div>
    <div>
      <div style={{ fontFamily, fontSize: 24, fontWeight: 700 }}>{title}</div>
      <div style={{ color: COLORS.muted, fontSize: 18, marginTop: 4 }}>
        {detail}
      </div>
    </div>
  </div>
);

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const logoScale = interpolate(frame, [0, 28], [0.72, 1], {
    ...clamp,
    easing: smoothEasing,
  });

  return (
    <AbsoluteFill style={pageStyle}>
      <Glow />
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 110,
        }}
      >
        <Img
          src={staticFile("achievo-assets/logo-mark.png")}
          style={{
            width: 108,
            height: 108,
            scale: logoScale,
            filter: "drop-shadow(0 0 34px rgba(255, 255, 255, 0.4))",
          }}
        />
        <FadeUp delay={10}>
          <Img
            src={staticFile("achievo-assets/logo-word.png")}
            style={{
              height: 52,
              marginTop: 30,
              filter: "brightness(0) invert(1)",
            }}
          />
        </FadeUp>
        <FadeUp delay={22}>
          <div
            style={{
              fontFamily,
              marginTop: 40,
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              maxWidth: 1400,
            }}
          >
            Earn real XLM for what you already do
          </div>
        </FadeUp>
        <FadeUp delay={36}>
          <div
            style={{
              marginTop: 25,
              color: COLORS.muted,
              fontSize: 34,
              lineHeight: 1.4,
              maxWidth: 1150,
            }}
          >
            AI-powered student rewards, paid out on the Stellar blockchain
          </div>
        </FadeUp>
        <FadeUp delay={52}>
          <div
            style={{
              fontFamily,
              marginTop: 50,
              color: COLORS.primary,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Product walkthrough
          </div>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
};

const WHY_ITEMS = [
  {
    title: "Tutor a classmate",
    detail: "Help someone with calculus, chemistry, or anything else",
  },
  {
    title: "Volunteer or run a workshop",
    detail: "Organize or show up for a community activity",
  },
  {
    title: "Get paid automatically",
    detail: "No forms, no manual review — Achievo verifies and pays instantly",
  },
];

export const WhatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const zoom = 1 + interpolate(progress, [0, 1], [0, 0.02], clamp);
  const visibleCount = Math.min(
    WHY_ITEMS.length,
    Math.floor(
      interpolate(progress, [0.1, 0.6], [0, WHY_ITEMS.length + 0.9], clamp),
    ),
  );

  return (
    <AbsoluteFill style={pageStyle}>
      <Glow top={-300} left={-260} />
      <div style={{ padding: "70px 100px 0" }}>
        <Eyebrow>Why Achievo</Eyebrow>
        <Title>Real effort, rewarded the moment it happens</Title>
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 235,
          scale: zoom,
          transformOrigin: "50% 30%",
        }}
      >
        <Phone src="achievo-assets/home.jpeg" height={900} />
      </div>
      <div
        style={{
          position: "absolute",
          right: 130,
          top: 300,
          width: 620,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {WHY_ITEMS.map((entry, index) => {
          const isVisible = index < visibleCount;
          return (
            <div
              key={entry.title}
              style={{
                opacity: isVisible ? 1 : 0,
                translate: isVisible ? "0 0" : "25px 0",
              }}
            >
              <Callout title={entry.title} detail={entry.detail} index={index + 1} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const PIPELINE_STEPS = [
  {
    title: "Activity Agent",
    detail: "Classifies what you did — hint: tutoring · 5 XLM",
  },
  {
    title: "Verification Agent",
    detail: "Forwards the activity to AI evaluation",
  },
  {
    title: "Reward Agent",
    detail: "Estimates the payout from your effort score",
  },
  {
    title: "Stellar Agent",
    detail: "Requests wallet ownership proof before paying out",
  },
  {
    title: "Feedback Agent",
    detail: "Formats the result and asks how it went",
  },
];

export const PipelineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const active = Math.min(
    PIPELINE_STEPS.length - 1,
    Math.floor(progress * PIPELINE_STEPS.length),
  );
  const localProgress = progress * PIPELINE_STEPS.length - active;
  const calloutOpacity = interpolate(localProgress, [0, 0.1], [0, 1], clamp);

  return (
    <AbsoluteFill style={pageStyle}>
      <div style={{ padding: "60px 100px 0" }}>
        <Eyebrow>Under the hood</Eyebrow>
        <Title>A 5-agent AI pipeline verifies every submission</Title>
      </div>
      <div style={{ position: "absolute", left: 150, top: 200 }}>
        <Phone src="achievo-assets/pipeline.jpeg" height={950} />
      </div>
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 340,
          opacity: calloutOpacity,
        }}
      >
        <Callout
          title={PIPELINE_STEPS[active].title}
          detail={PIPELINE_STEPS[active].detail}
          index={active + 1}
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: 90,
          display: "flex",
          gap: 14,
        }}
      >
        {PIPELINE_STEPS.map((_, index) => (
          <div
            key={index}
            style={{
              width: 68,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                index <= active ? COLORS.primary : COLORS.border,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const RewardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 20], [0.96, 1], {
    ...clamp,
    easing: smoothEasing,
  });

  return (
    <AbsoluteFill style={pageStyle}>
      <Glow top={-320} left={1100} />
      <div style={{ padding: "60px 100px 0" }}>
        <Eyebrow>On-chain payout</Eyebrow>
        <Title>Real XLM, sent by a smart contract</Title>
      </div>
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 260,
          width: 700,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <FadeUp delay={10}>
          <div style={{ fontSize: 26, lineHeight: 1.5 }}>
            Your wallet <strong>signs a nonce</strong> to prove ownership —
            no password, no custodian.
          </div>
        </FadeUp>
        <FadeUp delay={26}>
          <div style={{ fontSize: 26, lineHeight: 1.5 }}>
            A <strong>Soroban smart contract</strong> on the Stellar Testnet
            pays out automatically. No manual approval, no middleman.
          </div>
        </FadeUp>
        <FadeUp delay={42}>
          <div style={{ fontSize: 26, lineHeight: 1.5 }}>
            Every payout is <strong>on-chain and verifiable</strong>, viewable
            on StellarExpert in seconds.
          </div>
        </FadeUp>
        <FadeUp delay={58} style={{ marginTop: 12 }}>
          <div
            style={{
              fontFamily,
              display: "flex",
              gap: 38,
              color: COLORS.muted,
              fontSize: 19,
              flexWrap: "wrap",
            }}
          >
            <span>Stellar</span>
            <span>Soroban</span>
            <span>Groq AI</span>
            <span>Freighter</span>
          </div>
        </FadeUp>
      </div>
      <div
        style={{
          position: "absolute",
          right: 190,
          top: 190,
          scale,
        }}
      >
        <Phone src="achievo-assets/reward.jpeg" height={950} />
      </div>
    </AbsoluteFill>
  );
};

const PROGRESS_ITEMS = [
  ["XP & scholar ranks", "Bronze, Silver, Gold, Platinum, Diamond"],
  ["On-chain badges", "Milestones confirmed and stored on Stellar"],
  ["Streaks", "Stay consistent and keep your multiplier alive"],
  ["Community Pulse", "See classmates earning and refer friends to join"],
] as const;

export const GamifyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const profileOpacity = interpolate(progress, [0.42, 0.5], [1, 0], clamp);
  const milestonesOpacity = interpolate(progress, [0.42, 0.5], [0, 1], clamp);
  const visibleCount = Math.min(
    PROGRESS_ITEMS.length,
    Math.floor(
      interpolate(progress, [0.06, 0.6], [0, PROGRESS_ITEMS.length + 0.9], clamp),
    ),
  );

  return (
    <AbsoluteFill style={pageStyle}>
      <div style={{ padding: "60px 100px 0" }}>
        <Eyebrow>Keep showing up</Eyebrow>
        <Title>Progress and community, not just a payout</Title>
      </div>
      <div style={{ position: "absolute", left: 150, top: 200 }}>
        <div style={{ position: "absolute", opacity: profileOpacity }}>
          <Phone src="achievo-assets/profile.jpeg" height={950} />
        </div>
        <div style={{ position: "absolute", opacity: milestonesOpacity }}>
          <Phone src="achievo-assets/milestones.jpeg" height={950} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 260,
          width: 620,
          display: "flex",
          flexDirection: "column",
          gap: 17,
        }}
      >
        {PROGRESS_ITEMS.map(([title, detail], index) => {
          const isVisible = index < visibleCount;
          return (
            <div
              key={title}
              style={{
                opacity: isVisible ? 1 : 0,
                translate: isVisible ? "0 0" : "25px 0",
                padding: "24px 26px",
                borderRadius: 15,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.backgroundElevated,
              }}
            >
              <div
                style={{
                  fontFamily,
                  color: COLORS.primary,
                  fontSize: 19,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  color: COLORS.foreground,
                  fontSize: 22,
                  lineHeight: 1.45,
                  marginTop: 9,
                }}
              >
                {detail}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const OutroScene: React.FC = () => (
  <AbsoluteFill style={pageStyle}>
    <Glow top={-260} left={620} />
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 100,
      }}
    >
      <FadeUp>
        <Img
          src={staticFile("achievo-assets/logo-mark.png")}
          style={{
            width: 96,
            height: 96,
            filter: "drop-shadow(0 0 34px rgba(255, 255, 255, 0.4))",
          }}
        />
      </FadeUp>
      <FadeUp delay={12}>
        <Img
          src={staticFile("achievo-assets/logo-word.png")}
          style={{
            height: 46,
            marginTop: 26,
            filter: "brightness(0) invert(1)",
          }}
        />
      </FadeUp>
      <FadeUp delay={24}>
        <div
          style={{
            fontFamily,
            fontSize: 68,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginTop: 32,
          }}
        >
          Do the work. Get rewarded. On Stellar.
        </div>
      </FadeUp>
      <FadeUp delay={40}>
        <div
          style={{
            color: COLORS.muted,
            fontSize: 30,
            lineHeight: 1.45,
            maxWidth: 1000,
            marginTop: 22,
          }}
        >
          achievo-rust.vercel.app
        </div>
      </FadeUp>
      <FadeUp delay={54}>
        <div
          style={{
            fontFamily,
            color: COLORS.primary,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginTop: 48,
          }}
        >
          Built on Stellar · Powered by AI
        </div>
      </FadeUp>
    </div>
  </AbsoluteFill>
);
