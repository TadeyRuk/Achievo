/** Apple-like cubic used for backdrop fades. */
export const iosEase = [0.32, 0.72, 0, 1] as const;

/** Near-critically-damped spring — settles with almost no overshoot. */
export const iosSpring = { type: "spring" as const, duration: 0.45, bounce: 0.05 };

/** Scale applied to app content behind an open sheet. */
export const iosContentScale = 0.96;

/** Short fade used when reduced motion is preferred. */
export const reducedMotionTransition = { duration: 0.2 };
