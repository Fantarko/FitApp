type DayReps = { day: string; reps: number };

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function MonthActivityCalendar({ data }: { data: DayReps[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const repsByDate = new Map(data.map((d) => [d.day, d.reps]));
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const maxReps = Math.max(...data.map((d) => d.reps), 1);

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function intensity(reps: number | undefined): string {
    if (!reps) return "bg-black/5";
    const ratio = reps / maxReps;
    if (ratio > 0.75) return "bg-primary-deep text-white";
    if (ratio > 0.4) return "bg-primary/70 text-white";
    return "bg-primary-tint text-primary-deep";
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-ink/40">
        {THAI_WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateKey = `${year}-${(month + 1).toString().padStart(2, "0")}-${day
            .toString()
            .padStart(2, "0")}`;
          const reps = repsByDate.get(dateKey);
          return (
            <div
              key={day}
              title={reps ? `${day}: ${reps} ครั้ง` : `${day}: ไม่ได้วิด`}
              className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium transition-colors ${intensity(reps)}`}
            >
              {day}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink/50">
        วิดไปแล้ว {data.length} วัน จาก {daysInMonth} วันเดือนนี้
      </p>
    </div>
  );
}
