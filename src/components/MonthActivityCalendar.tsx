type DayReps = { day: string; reps: number };

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function MonthActivityCalendar({ data }: { data: DayReps[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();

  const repsByDate = new Map(data.map((d) => [d.day, d.reps]));
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const maxReps = Math.max(...data.map((d) => d.reps), 1);

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad the tail so the grid always ends on a full week — keeps the shape consistent
  while (cells.length % 7 !== 0) cells.push(null);

  function cellStyle(reps: number | undefined): { bg: string; text: string } {
    if (!reps) return { bg: "bg-black/[0.04]", text: "text-ink/30" };
    const ratio = reps / maxReps;
    if (ratio > 0.75) return { bg: "bg-primary-deep", text: "text-white" };
    if (ratio > 0.45) return { bg: "bg-primary", text: "text-white" };
    return { bg: "bg-primary-tint", text: "text-primary-deep" };
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-ink/40">
        {THAI_WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateKey = `${year}-${(month + 1).toString().padStart(2, "0")}-${day
            .toString()
            .padStart(2, "0")}`;
          const reps = repsByDate.get(dateKey);
          const { bg, text } = cellStyle(reps);
          const isToday = day === todayDate;

          return (
            <div
              key={day}
              title={reps ? `${day}: ${reps} ครั้ง` : `${day}: ไม่ได้วิด`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold transition-transform hover:scale-105 ${bg} ${text} ${
                isToday ? "ring-2 ring-sun ring-offset-2 ring-offset-white" : ""
              }`}
            >
              <span>{day}</span>
              {reps ? <span className="mt-0.5 text-[9px] font-normal opacity-80">{reps}</span> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-ink/50">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-black/[0.04]" /> ไม่ได้วิด
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-primary-tint" /> น้อย
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-primary" /> กลาง
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-primary-deep" /> เยอะ
          </span>
        </div>
        <p className="text-xs font-medium text-ink/50">
          {data.length}/{daysInMonth} วัน
        </p>
      </div>
    </div>
  );
}
