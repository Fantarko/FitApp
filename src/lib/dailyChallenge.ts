export type DailyChallenge = {
  id: string;
  title: string;
  description: string;
  targetReps: number;
  targetSeconds: number | null; // null = no time limit, just hit the rep target
};

const TEMPLATES: Omit<DailyChallenge, "id">[] = [
  { title: "ท้าประจำวัน: 20 ครั้งใน 3 นาที", description: "ทำ 20 ครั้งให้ทันภายใน 3 นาที", targetReps: 20, targetSeconds: 180 },
  { title: "ท้าประจำวัน: 30 ครั้งรวด", description: "ทำให้ครบ 30 ครั้ง ไม่จำกัดเวลา", targetReps: 30, targetSeconds: null },
  { title: "ท้าประจำวัน: สปีดรัน 15 ครั้ง", description: "ทำ 15 ครั้งให้ทันภายใน 90 วินาที", targetReps: 15, targetSeconds: 90 },
  { title: "ท้าประจำวัน: 50 ครั้งมาราธอน", description: "ทำให้ครบ 50 ครั้ง ไม่จำกัดเวลา ค่อยๆ ทำได้", targetReps: 50, targetSeconds: null },
  { title: "ท้าประจำวัน: 25 ครั้งใน 2 นาที", description: "ทำ 25 ครั้งให้ทันภายใน 2 นาที", targetReps: 25, targetSeconds: 120 },
  { title: "ท้าประจำวัน: วอร์มอัพ 10 ครั้ง", description: "ทำให้ครบ 10 ครั้ง ง่ายๆ เริ่มต้นวันดีๆ", targetReps: 10, targetSeconds: null },
  { title: "ท้าประจำวัน: ทดสอบความอึด 40 ครั้ง", description: "ทำ 40 ครั้งให้ทันภายใน 4 นาที", targetReps: 40, targetSeconds: 240 },
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/** Same challenge for every user on a given calendar date — no DB storage needed for the challenge itself. */
export function getTodayChallenge(date: Date = new Date()): DailyChallenge {
  const idx = dayOfYear(date) % TEMPLATES.length;
  const dateKey = date.toISOString().slice(0, 10);
  return { id: dateKey, ...TEMPLATES[idx] };
}
