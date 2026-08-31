// A single pose landmark as returned by MediaPipe (normalized 0..1 image coords).
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// MediaPipe Pose Landmarker indices we care about (BlazePose 33-point topology).
export const POSE_INDEX = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

/** Angle at point `b`, formed by segments b→a and b→c, in degrees (0–180). */
function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAb = Math.hypot(ab.x, ab.y);
  const magCb = Math.hypot(cb.x, cb.y);
  if (magAb === 0 || magCb === 0) return 180;
  const cos = Math.min(1, Math.max(-1, dot / (magAb * magCb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export type RepPhase = "up" | "down";

export interface CounterConfig {
  /** Elbow angle below which we consider the person "down" (bottom of the push-up). */
  downAngleThreshold: number;
  /** Elbow angle above which we consider the person "up" (top / arms extended). */
  upAngleThreshold: number;
  /** Minimum visibility (0-1) required on tracked landmarks to trust this frame. */
  minVisibility: number;
  /** Minimum time (ms) a full down→up cycle must take — filters out jitter/spam-clicking. */
  minRepDurationMs: number;
  /** Minimum vertical shoulder travel (normalized) between down and up — filters out fake "arm-only" reps. */
  minShoulderTravel: number;
  /** EMA smoothing factor (0-1) applied to the elbow angle signal — higher = more responsive, lower = steadier. */
  smoothingAlpha: number;
  /** Consecutive frames a threshold crossing must hold before the phase actually flips — absorbs single-frame tracking glitches. */
  confirmFrames: number;
}

export const DEFAULT_CONFIG: CounterConfig = {
  downAngleThreshold: 95,
  upAngleThreshold: 155,
  minVisibility: 0.5,
  minRepDurationMs: 500,
  minShoulderTravel: 0.02,
  smoothingAlpha: 0.5,
  confirmFrames: 2,
};

export interface RepEvent {
  count: number;
  timestamp: number;
  durationMs: number;
}

type ArmSide = { shoulder: Landmark; elbow: Landmark; wrist: Landmark };

/**
 * Tracks push-up reps frame by frame from pose landmarks.
 * A rep counts on a full down→up transition that passes the anti-spam checks.
 * This only judges elbow angle + shoulder travel — it is a first line of defense,
 * not a cheat-proof guarantee (see server-side landmark_log sanity checks).
 *
 * Tracking quality improvements over a naive single-frame/single-arm approach:
 *  - averages both arms' angles when both are visible, instead of trusting
 *    whichever single side happens to pass the visibility check (a lot steadier
 *    at angled camera positions where one arm briefly self-occludes)
 *  - applies EMA smoothing to the angle signal so momentary bad-frame noise from
 *    the pose model doesn't flip the phase on its own
 *  - requires a threshold crossing to hold for a few consecutive frames before
 *    committing to it, which is what actually stops a single glitchy frame from
 *    causing a false count or silently eating a real rep
 */
export class PushupCounter {
  private phase: RepPhase = "up";
  private count = 0;
  private lastDownTimestamp = 0;
  private lastDownShoulderY = 0;
  private smoothedAngle: number | null = null;
  private pendingDownFrames = 0;
  private pendingUpFrames = 0;
  private config: CounterConfig;

  constructor(config: Partial<CounterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getCount() {
    return this.count;
  }

  reset() {
    this.phase = "up";
    this.count = 0;
    this.lastDownTimestamp = 0;
    this.lastDownShoulderY = 0;
    this.smoothedAngle = null;
    this.pendingDownFrames = 0;
    this.pendingUpFrames = 0;
  }

  /** Feed one frame of landmarks. Returns a RepEvent when a rep is confirmed, else null. */
  processFrame(landmarks: Landmark[], timestamp: number): RepEvent | null {
    const sides = this.pickTrackedSides(landmarks);
    if (sides.length === 0) {
      // lost tracking this frame — don't let stale pending counters carry through
      this.pendingDownFrames = 0;
      this.pendingUpFrames = 0;
      return null;
    }

    const rawAngle =
      sides.length === 2
        ? (angleAt(sides[0].shoulder, sides[0].elbow, sides[0].wrist) +
            angleAt(sides[1].shoulder, sides[1].elbow, sides[1].wrist)) /
          2
        : angleAt(sides[0].shoulder, sides[0].elbow, sides[0].wrist);

    const shoulderY =
      sides.length === 2
        ? (sides[0].shoulder.y + sides[1].shoulder.y) / 2
        : sides[0].shoulder.y;

    // EMA smoothing — filters single-frame pose-model noise out of the signal
    // that phase decisions are actually based on.
    this.smoothedAngle =
      this.smoothedAngle === null
        ? rawAngle
        : this.config.smoothingAlpha * rawAngle + (1 - this.config.smoothingAlpha) * this.smoothedAngle;
    const angle = this.smoothedAngle;

    if (this.phase === "up") {
      this.pendingUpFrames = 0;
      if (angle < this.config.downAngleThreshold) {
        this.pendingDownFrames += 1;
        if (this.pendingDownFrames >= this.config.confirmFrames) {
          this.phase = "down";
          this.lastDownTimestamp = timestamp;
          this.lastDownShoulderY = shoulderY;
          this.pendingDownFrames = 0;
        }
      } else {
        this.pendingDownFrames = 0;
      }
      return null;
    }

    // phase === "down"
    this.pendingDownFrames = 0;
    if (angle > this.config.upAngleThreshold) {
      this.pendingUpFrames += 1;
      if (this.pendingUpFrames < this.config.confirmFrames) return null;
      this.pendingUpFrames = 0;

      const durationMs = timestamp - this.lastDownTimestamp;
      const shoulderTravel = Math.abs(shoulderY - this.lastDownShoulderY);
      this.phase = "up";

      if (durationMs >= this.config.minRepDurationMs && shoulderTravel >= this.config.minShoulderTravel) {
        this.count += 1;
        return { count: this.count, timestamp, durationMs };
      }
      // failed anti-spam checks — phase resets but rep isn't counted
    } else {
      this.pendingUpFrames = 0;
    }

    return null;
  }

  /** Returns both arms if both are visible enough to trust, otherwise whichever single arm qualifies, or none. */
  private pickTrackedSides(landmarks: Landmark[]): ArmSide[] {
    const { minVisibility } = this.config;
    const l: ArmSide = {
      shoulder: landmarks[POSE_INDEX.LEFT_SHOULDER],
      elbow: landmarks[POSE_INDEX.LEFT_ELBOW],
      wrist: landmarks[POSE_INDEX.LEFT_WRIST],
    };
    const r: ArmSide = {
      shoulder: landmarks[POSE_INDEX.RIGHT_SHOULDER],
      elbow: landmarks[POSE_INDEX.RIGHT_ELBOW],
      wrist: landmarks[POSE_INDEX.RIGHT_WRIST],
    };

    const visible = (p: Landmark) => (p?.visibility ?? 1) >= minVisibility;
    const lOk = visible(l.shoulder) && visible(l.elbow) && visible(l.wrist);
    const rOk = visible(r.shoulder) && visible(r.elbow) && visible(r.wrist);

    if (lOk && rOk) return [l, r];
    if (lOk) return [l];
    if (rOk) return [r];
    return [];
  }
}
