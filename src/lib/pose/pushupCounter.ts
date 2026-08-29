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

/** Angle at point `b`, formed by segments b a and b c, in degrees (0–180). */
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
 /** Minimum time (ms) a full down up cycle must take — filters out jitter/spam-clicking. */
 minRepDurationMs: number;
 /** Minimum vertical shoulder travel (normalized) between down and up — filters out fake "arm-only" reps. */
 minShoulderTravel: number;
}

export const DEFAULT_CONFIG: CounterConfig = {
 downAngleThreshold: 95,
 upAngleThreshold: 155,
 minVisibility: 0.5,
 minRepDurationMs: 500,
 minShoulderTravel: 0.02,
};

export interface RepEvent {
 count: number;
 timestamp: number;
 durationMs: number;
}

/**
 * Tracks push-up reps frame by frame from pose landmarks.
 * A rep counts on a full down up transition that passes the anti-spam checks.
 * This only judges elbow angle + shoulder travel — it is a first line of defense,
 * not a cheat-proof guarantee (see server-side landmark_log sanity checks).
 */
export class PushupCounter {
 private phase: RepPhase = "up";
 private count = 0;
 private lastDownTimestamp = 0;
 private lastDownShoulderY = 0;
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
 }

 /** Feed one frame of landmarks. Returns a RepEvent when a rep is confirmed, else null. */
 processFrame(landmarks: Landmark[], timestamp: number): RepEvent | null {
 const side = this.pickTrackedSide(landmarks);
 if (!side) return null;

 const { shoulder, elbow, wrist } = side;
 const elbowAngle = angleAt(shoulder, elbow, wrist);

 if (this.phase === "up" && elbowAngle < this.config.downAngleThreshold) {
 this.phase = "down";
 this.lastDownTimestamp = timestamp;
 this.lastDownShoulderY = shoulder.y;
 return null;
 }

 if (this.phase === "down" && elbowAngle > this.config.upAngleThreshold) {
 const durationMs = timestamp - this.lastDownTimestamp;
 const shoulderTravel = Math.abs(shoulder.y - this.lastDownShoulderY);

 this.phase = "up";

 if (
 durationMs >= this.config.minRepDurationMs &&
 shoulderTravel >= this.config.minShoulderTravel
 ) {
 this.count += 1;
 return { count: this.count, timestamp, durationMs };
 }
 // failed anti-spam checks — phase resets but rep isn't counted
 }

 return null;
 }

 private pickTrackedSide(landmarks: Landmark[]) {
 const { minVisibility } = this.config;
 const l = {
 shoulder: landmarks[POSE_INDEX.LEFT_SHOULDER],
 elbow: landmarks[POSE_INDEX.LEFT_ELBOW],
 wrist: landmarks[POSE_INDEX.LEFT_WRIST],
 };
 const r = {
 shoulder: landmarks[POSE_INDEX.RIGHT_SHOULDER],
 elbow: landmarks[POSE_INDEX.RIGHT_ELBOW],
 wrist: landmarks[POSE_INDEX.RIGHT_WRIST],
 };

 const visible = (p: Landmark) => (p.visibility ?? 1) >= minVisibility;

 if (visible(l.shoulder) && visible(l.elbow) && visible(l.wrist)) return l;
 if (visible(r.shoulder) && visible(r.elbow) && visible(r.wrist)) return r;
 return null;
 }
}
