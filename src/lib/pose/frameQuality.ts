import type { Landmark } from "./pushupCounter";

export interface QualityConfig {
  /** Below this average grayscale value (0-255), we consider the scene too dark. */
  minBrightness: number;
  /** Below this average landmark visibility (0-1), tracking is considered unreliable. */
  minAvgVisibility: number;
  /** Above this residual horizontal jitter (normalized coords), we consider the camera itself unstable/shaking. */
  maxCameraJitter: number;
  /** How many recent frames to keep for the rolling stability/visibility checks. */
  windowSize: number;
  /** Low-pass filter smoothing factor (0-1) used to separate "real movement" from "camera shake". */
  smoothingAlpha: number;
  /** frames of elbow-z history to require before judging depth (~3s at 30fps). */
  zWindowSize: number;
  /** below this z-range (normalized units) over the window, we suspect a flat
   *  screen/video replay rather than a real body moving toward/away the camera. */
  minZRange: number;
}

export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  minBrightness: 60,
  minAvgVisibility: 0.6,
  maxCameraJitter: 0.008,
  windowSize: 12,
  smoothingAlpha: 0.3,
  zWindowSize: 90,
  minZRange: 0.02,
};

export type QualityIssue = "low_light" | "camera_unstable" | "tracking_unclear" | "flat_video_suspected";

export interface QualityStatus {
  ok: boolean;
  issues: QualityIssue[];
  brightness: number;
  avgVisibility: number;
  cameraJitter: number;
}

/** Downsamples a video frame onto a tiny offscreen canvas and returns average grayscale brightness (0-255). */
export function sampleBrightness(
  video: HTMLVideoElement,
  sampleCanvas: HTMLCanvasElement
): number {
  const w = sampleCanvas.width; // keep tiny (e.g. 32x18) — this runs every frame
  const h = sampleCanvas.height;
  const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 255; // fail open rather than false-flag on a broken canvas

  ctx.drawImage(video, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let sum = 0;
  const pixelCount = w * h;
  for (let i = 0; i < data.length; i += 4) {
    // standard luminance weighting
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / pixelCount;
}

const KEY_LANDMARKS = [11, 12, 13, 14, 15, 16, 23, 24]; // shoulders, elbows, wrists, hips

/**
 * Tracks camera stability + landmark confidence over a rolling window of frames.
 *
 * Camera "shake" is measured from *horizontal* (x) drift of the hip midpoint only —
 * not vertical (y). A push-up's real motion is almost entirely vertical, and a fast
 * legitimate rep can easily produce more y-residual than a shaky camera does, which
 * would false-flag quick reps as camera instability. Horizontal drift, by contrast,
 * should stay near zero regardless of rep speed if the phone is actually still, so
 * it isolates camera shake from exercise motion cleanly (verified against simulated
 * fast-rep vs. shaky-camera traces before shipping this threshold).
 */
export class TrackingQualityMonitor {
  private config: QualityConfig;
  private smoothedX: number | null = null;
  private jitterHistory: number[] = [];
  private visibilityHistory: number[] = [];
  private zHistory: number[] = [];
  private zTrackingActive = false;
  private lowQualityFrameCount = 0;
  private totalFrameCount = 0;

  constructor(config: Partial<QualityConfig> = {}) {
    this.config = { ...DEFAULT_QUALITY_CONFIG, ...config };
  }

  reset() {
    this.smoothedX = null;
    this.jitterHistory = [];
    this.visibilityHistory = [];
    this.zHistory = [];
    this.zTrackingActive = false;
    this.lowQualityFrameCount = 0;
    this.totalFrameCount = 0;
  }

  /**
   * Call this once when actual rep-counting starts (not during calibration —
   * standing still to calibrate also has ~zero z-movement, so evaluating the
   * flat-video check during that phase would false-flag every real user).
   */
  startDepthTracking() {
    this.zHistory = [];
    this.zTrackingActive = true;
  }

  /** Fraction of frames (0-1) that failed a quality check this session — a cheap anti-cheat signal to log. */
  getLowQualityRatio(): number {
    return this.totalFrameCount === 0 ? 0 : this.lowQualityFrameCount / this.totalFrameCount;
  }

  evaluate(landmarks: Landmark[], brightness: number): QualityStatus {
    const {
      minBrightness,
      minAvgVisibility,
      maxCameraJitter,
      windowSize,
      smoothingAlpha,
      zWindowSize,
      minZRange,
    } = this.config;
    const issues: QualityIssue[] = [];

    // ---- lighting ----
    if (brightness < minBrightness) issues.push("low_light");

    // ---- landmark confidence ----
    const visibilities = KEY_LANDMARKS.map((i) => landmarks[i]?.visibility ?? 0);
    const avgVisibility = visibilities.reduce((a, b) => a + b, 0) / visibilities.length;
    this.visibilityHistory.push(avgVisibility);
    if (this.visibilityHistory.length > windowSize) this.visibilityHistory.shift();
    const rollingAvgVisibility =
      this.visibilityHistory.reduce((a, b) => a + b, 0) / this.visibilityHistory.length;
    if (rollingAvgVisibility < minAvgVisibility) issues.push("tracking_unclear");

    // ---- camera stability: horizontal-only drift of the hip midpoint ----
    // (see class doc comment for why x-only, not x+y)
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    let cameraJitter = 0;
    if (leftHip && rightHip) {
      const x = (leftHip.x + rightHip.x) / 2;

      if (this.smoothedX === null) {
        this.smoothedX = x;
      } else {
        const residual = Math.abs(x - this.smoothedX);
        this.jitterHistory.push(residual);
        if (this.jitterHistory.length > windowSize) this.jitterHistory.shift();

        // EMA low-pass on horizontal position — a stationary phone should track flat
        this.smoothedX = smoothingAlpha * x + (1 - smoothingAlpha) * this.smoothedX;
      }

      if (this.jitterHistory.length >= 4) {
        const mean = this.jitterHistory.reduce((a, b) => a + b, 0) / this.jitterHistory.length;
        const variance =
          this.jitterHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / this.jitterHistory.length;
        cameraJitter = Math.sqrt(variance);
        if (cameraJitter > maxCameraJitter) issues.push("camera_unstable");
      }
    }

    // ---- flat-video replay check: a real push-up moves the elbows toward/away
    // the camera; holding up a phone/tablet playing a clip shows a flat image
    // with almost no z-depth change over a full rep cycle. Only evaluated once
    // startDepthTracking() has been called and enough frames have accumulated,
    // so it never interferes with the calibration hold. This is a heuristic,
    // not a guarantee — flag for review, don't treat as certain proof.
    if (this.zTrackingActive) {
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];
      if (leftElbow && rightElbow) {
        const z = (leftElbow.z + rightElbow.z) / 2;
        this.zHistory.push(z);
        if (this.zHistory.length > zWindowSize) this.zHistory.shift();

        if (this.zHistory.length >= zWindowSize) {
          const zRange = Math.max(...this.zHistory) - Math.min(...this.zHistory);
          if (zRange < minZRange) issues.push("flat_video_suspected");
        }
      }
    }

    this.totalFrameCount += 1;
    if (issues.length > 0) this.lowQualityFrameCount += 1;

    return {
      ok: issues.length === 0,
      issues,
      brightness,
      avgVisibility: rollingAvgVisibility,
      cameraJitter,
    };
  }
}

export const QUALITY_MESSAGES_TH: Record<QualityIssue, string> = {
  low_light: "แสงน้อยเกินไป — ลองเปิดไฟเพิ่มหรือหันหน้าเข้าหาแสง",
  camera_unstable: "กล้องขยับ/สั่นเกินไป — วางมือถือให้นิ่ง (แนะนำตั้งพิงหรือใช้ขาตั้ง)",
  tracking_unclear: "ตรวจจับร่างกายไม่ชัดเจน — ขยับให้เห็นทั้งตัวในเฟรมกล้อง",
  flat_video_suspected: "ระบบสงสัยว่ากำลังดูวิดีโอจากจอ ไม่ใช่ร่างกายจริง — เซสชันนี้ถูกตั้งค่าสถานะเพื่อตรวจสอบ",
};

/**
 * Requires N consecutive good-quality frames before letting the session start/resume.
 * This is what forces a re-calibration after the camera gets moved mid-session instead
 * of silently continuing to count on a now-unreliable baseline (the original miscounting bug).
 */
export class CalibrationGate {
  private consecutiveOk = 0;
  private requiredFrames: number;

  constructor(requiredFrames = 20) {
    this.requiredFrames = requiredFrames;
  }

  reset() {
    this.consecutiveOk = 0;
  }

  /** Feed one frame's quality result. Returns true once calibration has just completed. */
  update(ok: boolean): boolean {
    this.consecutiveOk = ok ? this.consecutiveOk + 1 : 0;
    return this.consecutiveOk >= this.requiredFrames;
  }

  progress(): number {
    return Math.min(1, this.consecutiveOk / this.requiredFrames);
  }
}

