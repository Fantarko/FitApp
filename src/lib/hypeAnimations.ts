import type { Target, Transition } from "framer-motion";

export type HypeVariant = {
  icon: string;
  initial: Target;
  animate: Target;
  transition: Transition;
};

// Each variant leans on framer-motion's support for rotateX/rotateY/rotateZ + z
// (translateZ) alongside a parent `perspective` — that combination is what
// gives these a sense of depth/3D instead of flat 2D scale/fade.
export const HYPE_VARIANTS: HypeVariant[] = [
  {
    // 💪 flex — winds up on Y then snaps forward toward the viewer
    icon: "💪",
    initial: { opacity: 0, rotateY: -120, scale: 0.4, z: -200 },
    animate: { opacity: 1, rotateY: [-120, 20, 0], scale: [0.4, 1.3, 1], z: [-200, 40, 0] },
    transition: { duration: 0.6, ease: "backOut" },
  },
  {
    // 🔥 fire — flickers/shakes with a hot glow feel
    icon: "🔥",
    initial: { opacity: 0, scale: 0.5, rotateZ: -15 },
    animate: {
      opacity: 1,
      scale: [0.5, 1.2, 0.95, 1.1, 1],
      rotateZ: [-15, 10, -6, 4, 0],
      y: [10, -4, 2, -2, 0],
    },
    transition: { duration: 0.7, ease: "easeOut" },
  },
  {
    // ⭐ starburst — spins in on Z while popping toward camera
    icon: "⭐",
    initial: { opacity: 0, rotateZ: -180, scale: 0.2, z: -300 },
    animate: { opacity: 1, rotateZ: 0, scale: [0.2, 1.4, 1], z: [-300, 60, 0] },
    transition: { duration: 0.55, ease: "circOut" },
  },
  {
    // 👍 thumbs up — a genuine 3D card-flip on the Y axis
    icon: "👍",
    initial: { opacity: 0, rotateY: 180, scale: 0.8 },
    animate: { opacity: 1, rotateY: [180, 0], scale: 1 },
    transition: { duration: 0.5, ease: "easeInOut" },
  },
  {
    // 🏆 trophy — drops in from above with a bounce and a little X-tilt landing
    icon: "🏆",
    initial: { opacity: 0, y: -80, rotateX: -60, scale: 0.6 },
    animate: {
      opacity: 1,
      y: [-80, 8, -6, 0],
      rotateX: [-60, 10, -4, 0],
      scale: [0.6, 1.15, 0.97, 1],
    },
    transition: { duration: 0.65, ease: "easeOut" },
  },
  {
    // ⚡ lightning — fast, jittery, high-energy pop
    icon: "⚡",
    initial: { opacity: 0, scale: 0.3, rotateZ: 25 },
    animate: {
      opacity: 1,
      scale: [0.3, 1.3, 0.9, 1.1, 1],
      rotateZ: [25, -20, 15, -8, 0],
    },
    transition: { duration: 0.4, ease: "easeOut" },
  },
  {
    // 🚀 rocket — launches upward from below, tilting back to vertical
    icon: "🚀",
    initial: { opacity: 0, y: 60, rotateZ: 35, scale: 0.5 },
    animate: { opacity: 1, y: [60, -12, 0], rotateZ: [35, -8, 0], scale: [0.5, 1.15, 1] },
    transition: { duration: 0.55, ease: "backOut" },
  },
  {
    // ❤️ heartbeat — pulses toward and away from the viewer via z
    icon: "❤️",
    initial: { opacity: 0, scale: 0.6, z: -150 },
    animate: { opacity: 1, scale: [0.6, 1.25, 0.95, 1.15, 1], z: [-150, 30, -10, 15, 0] },
    transition: { duration: 0.6, ease: "easeInOut" },
  },
  {
    // 👑 crown — descends with a regal slow rotateX tilt, like it's being placed
    icon: "👑",
    initial: { opacity: 0, y: -50, rotateX: 90, scale: 0.5 },
    animate: { opacity: 1, y: 0, rotateX: [90, -15, 0], scale: [0.5, 1.1, 1] },
    transition: { duration: 0.6, ease: "easeOut" },
  },
  {
    // 💥 explosion — the biggest pop of the set, tumbling on two axes at once
    icon: "💥",
    initial: { opacity: 0, scale: 0.1, rotateX: -90, rotateY: 90 },
    animate: {
      opacity: 1,
      scale: [0.1, 1.5, 0.9, 1.05, 1],
      rotateX: [-90, 20, 0],
      rotateY: [90, -15, 0],
    },
    transition: { duration: 0.65, ease: "backOut" },
  },
  {
    // 🌟 sparkle-spin — slow graceful full 360 spin on Y with a glow-in
    icon: "🌟",
    initial: { opacity: 0, rotateY: 0, scale: 0.3 },
    animate: { opacity: 1, rotateY: 360, scale: [0.3, 1.2, 1] },
    transition: { duration: 0.7, ease: "easeInOut" },
  },
  {
    // 🥇 medal — swings in like a pendulum on Z then settles
    icon: "🥇",
    initial: { opacity: 0, rotateZ: -45, y: -30, scale: 0.5 },
    animate: { opacity: 1, rotateZ: [-45, 25, -12, 6, 0], y: [-30, 0], scale: [0.5, 1.1, 1] },
    transition: { duration: 0.6, ease: "easeOut" },
  },
  {
    // 🧠 focus/mind — tilts back on X as if leaning in with focus, then locks forward
    icon: "🧠",
    initial: { opacity: 0, rotateX: 70, z: -100, scale: 0.6 },
    animate: { opacity: 1, rotateX: [70, -10, 0], z: [-100, 20, 0], scale: [0.6, 1.1, 1] },
    transition: { duration: 0.55, ease: "easeOut" },
  },
  {
    // 🦾 mech arm — snaps in with a mechanical double-axis rotation, sharp and rigid
    icon: "🦾",
    initial: { opacity: 0, rotateY: -90, rotateX: 30, scale: 0.4 },
    animate: { opacity: 1, rotateY: [-90, 10, 0], rotateX: [30, -5, 0], scale: [0.4, 1.2, 1] },
    transition: { duration: 0.4, ease: "circOut" },
  },
  {
    // 🌪️ tornado — fast full spin on Z while growing, like it whips into view
    icon: "🌪️",
    initial: { opacity: 0, rotateZ: 0, scale: 0.2 },
    animate: { opacity: 1, rotateZ: 720, scale: [0.2, 1.15, 1] },
    transition: { duration: 0.6, ease: "easeOut" },
  },
  {
    // 🛡️ shield — rises from below with a defensive X-tilt, plants firmly
    icon: "🛡️",
    initial: { opacity: 0, y: 50, rotateX: -80, scale: 0.5 },
    animate: { opacity: 1, y: [50, -8, 0], rotateX: [-80, 12, 0], scale: [0.5, 1.15, 1] },
    transition: { duration: 0.5, ease: "easeOut" },
  },
  {
    // 🎯 bullseye — zooms straight out of the screen toward the viewer then eases back
    icon: "🎯",
    initial: { opacity: 0, z: -400, scale: 0.1 },
    animate: { opacity: 1, z: [-400, 80, 0], scale: [0.1, 1.3, 1] },
    transition: { duration: 0.5, ease: "circOut" },
  },
  {
    // 🐉 dragon — a wild double-flip, the most chaotic variant in the set
    icon: "🐉",
    initial: { opacity: 0, rotateX: 180, rotateY: -180, scale: 0.3 },
    animate: {
      opacity: 1,
      rotateX: [180, -20, 0],
      rotateY: [-180, 20, 0],
      scale: [0.3, 1.25, 0.95, 1],
    },
    transition: { duration: 0.7, ease: "easeInOut" },
  },
  {
    // 🏔️ mountain — rises slowly and solidly from below, no bounce, pure strength
    icon: "🏔️",
    initial: { opacity: 0, y: 40, rotateX: -30, scale: 0.7 },
    animate: { opacity: 1, y: 0, rotateX: 0, scale: 1 },
    transition: { duration: 0.5, ease: "easeOut" },
  },
];
