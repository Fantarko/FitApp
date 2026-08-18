import type { Landmark } from "./pushupCounter";

export type FormIssue =
  | "back_arch"
  | "hips_high"
  | "hips_low"
  | "too_shallow"
  | "out_of_frame";

export type FormAnalysis = {
  score: number;
  consistency: number;
  speedScore: number;
  issues: FormIssue[];
  coach: string;
};

// Form analysis only needs x/y coordinates.
// MediaPipe Landmark also contains z, but z is not needed for these 2D angles.
type Point2D = {
  x: number;
  y: number;
};

function angle(a: Point2D, b: Point2D, c: Point2D) {
  const ab = {
    x: a.x - b.x,
    y: a.y - b.y,
  };

  const cb = {
    x: c.x - b.x,
    y: c.y - b.y,
  };

  const dot = ab.x * cb.x + ab.y * cb.y;

  const mag =
    Math.hypot(ab.x, ab.y) *
    Math.hypot(cb.x, cb.y);

  if (!mag) return 180;

  return (
    (Math.acos(
      Math.max(-1, Math.min(1, dot / mag))
    ) *
      180) /
    Math.PI
  );
}

export function analyzePushupForm(
  points: Landmark[],
  previousScore = 80
): FormAnalysis {
  // MediaPipe pose landmarks:
  // shoulders 11/12
  // elbows 13/14
  // hips 23/24
  // knees 25/26
  // ankles 27/28
  //
  // We average left/right where available.

  const shoulder: Point2D | undefined =
    points[11] && points[12]
      ? {
          x: (points[11].x + points[12].x) / 2,
          y: (points[11].y + points[12].y) / 2,
        }
      : points[11];

  const hip: Point2D | undefined =
    points[23] && points[24]
      ? {
          x: (points[23].x + points[24].x) / 2,
          y: (points[23].y + points[24].y) / 2,
        }
      : points[23];

  const knee: Point2D | undefined =
    points[25] && points[26]
      ? {
          x: (points[25].x + points[26].x) / 2,
          y: (points[25].y + points[26].y) / 2,
        }
      : points[25];

  const ankle: Point2D | undefined =
    points[27] && points[28]
      ? {
          x: (points[27].x + points[28].x) / 2,
          y: (points[27].y + points[28].y) / 2,
        }
      : points[27];

  if (!shoulder || !hip || !knee || !ankle) {
    return {
      score: previousScore,
      consistency: previousScore,
      speedScore: 75,
      issues: ["out_of_frame"],
      coach: "ขยับตัวให้อยู่ในเฟรม",
    };
  }

  const torso = Math.abs(shoulder.y - hip.y);

  const leg = Math.abs(hip.y - ankle.y) || 1;

  const hipRatio =
    (hip.y - shoulder.y) / leg;

  const backAngle = angle(
    shoulder,
    hip,
    ankle
  );

  const issues: FormIssue[] = [];

  if (backAngle < 145) {
    issues.push("back_arch");
  }

  if (hipRatio < 0.22) {
    issues.push("hips_high");
  }

  if (hipRatio > 0.55) {
    issues.push("hips_low");
  }

  // A conservative pose-quality score.
  // Rep depth is still handled by PushupCounter;
  // this score describes body alignment, not a medical assessment.

  let score = 100;

  if (issues.includes("back_arch")) {
    score -= 25;
  }

  if (issues.includes("hips_high")) {
    score -= 18;
  }

  if (issues.includes("hips_low")) {
    score -= 18;
  }

  if (torso < 0.05) {
    score -= 10;
  }

  score = Math.round(
    previousScore * 0.75 +
      score * 0.25
  );

  const coach =
    issues.includes("back_arch")
      ? "หลังแอ่นเกินไป ลองเกร็งลำตัว"
      : issues.includes("hips_high")
        ? "สะโพกสูงเกินไป ลองให้ลำตัวเป็นแนวเดียวกัน"
        : issues.includes("hips_low")
          ? "สะโพกต่ำเกินไป เกร็งแกนกลางลำตัว"
          : "ท่าดีมาก รักษาแนวลำตัวไว้";

  return {
    score: Math.max(
      0,
      Math.min(100, score)
    ),
    consistency: Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 - issues.length * 20
        )
      )
    ),
    speedScore: 75,
    issues,
    coach,
  };
}