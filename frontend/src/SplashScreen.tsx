import { useEffect, useState } from "react";
import { motion } from "motion/react";

interface SplashScreenProps {
  progress: number;
  onDone: () => void;
}

export function SplashScreen({ progress, onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "loading" | "out">("in");
  const [visualProgress, setVisualProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("loading");
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  // Smooth out the progress accumulation to prevent sudden jumps
  useEffect(() => {
    const interval = 16; // ~60fps
    const timer = setInterval(() => {
      setVisualProgress((prev) => {
        if (prev >= progress) {
          return prev;
        }
        
        const diff = progress - prev;
        // faster step when real progress jumped ahead; ease-out near target
        const step = diff > 50 ? 2.2 : diff > 20 ? 1.4 : 0.8;
        
        return Math.min(prev + step, progress);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [progress]);

  // Once visual progress settles at 100%, trigger the out phase
  useEffect(() => {
    if (visualProgress >= 100) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("out");
      const timer = setTimeout(() => {
        onDone();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visualProgress, onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf9ff",
      }}
    >
      {/* Subtle radial glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,191,33,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo mark */}
      <motion.img
        src="/only_logo.png"
        alt="Achievo logo"
        initial={{ opacity: 0, scale: 0.72, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: 140, height: 140, objectFit: "contain", marginBottom: 20 }}
      />

      {/* Wordmark */}
      <motion.img
        src="/only_name.png"
        alt="Achievo"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
        style={{ width: 148, objectFit: "contain", marginBottom: 52 }}
      />

      {/* Loading bar track */}
      <div
        style={{
          width: 160,
          height: 3,
          borderRadius: 999,
          background: "rgba(0,22,43,0.08)",
          position: "relative",
        }}
      >
        {/* Gold fill */}
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${visualProgress}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 15 }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            borderRadius: 999,
            background: "linear-gradient(90deg, #e6a800, #ffbf21)",
          }}
        />

        {/* Floating pulse bead at the leading edge */}
        {visualProgress > 0 && visualProgress < 100 && (
          <motion.div
            initial={{ left: "0%" }}
            animate={{ left: `${visualProgress}%` }}
            transition={{ type: "spring", stiffness: 70, damping: 15 }}
            style={{
              position: "absolute",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#ffffff",
              border: "2px solid #ffbf21",
              boxShadow: "0 0 6px rgba(255, 191, 33, 0.9)",
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{
                scale: [0.85, 1.25, 0.85],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "transparent",
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Loading label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "loading" && visualProgress < 100 ? 0.4 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          marginTop: 12,
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#00162b",
          fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
        }}
      >
        Loading…
      </motion.p>
      {/* Footer / Powered by label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          position: "absolute",
          bottom: 36,
          fontSize: 11,
          letterSpacing: "0.05em",
          color: "#00162b",
          fontWeight: 500,
          fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
        }}
      >
        Powered by Kouri | Stellar
      </motion.p>

      {/* Decorative corner dots */}
      {[
        { top: 24, left: 24 },
        { top: 24, right: 24 },
        { bottom: 24, left: 24 },
        { bottom: 24, right: 24 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.2, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
          style={{
            position: "absolute",
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#ffbf21",
            ...pos,
          }}
        />
      ))}
    </motion.div>
  );
}
