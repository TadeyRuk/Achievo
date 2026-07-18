import type { RewardHistoryItem } from "@achievo/shared";

/** Smooth bezier curve line chart for weekly earnings trend. */
export function WeeklyEarningsTrendChart({ history }: { history: RewardHistoryItem[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getDayIndex = (date: Date) => {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const today = new Date();
  const currentDayIndex = getDayIndex(today);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDayIndex);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekMs = startOfWeek.getTime();

  const dailyEarnings = [0, 0, 0, 0, 0, 0, 0];
  if (history && history.length > 0) {
    history.forEach((item) => {
      const itemDate = new Date(item.timestamp);
      if (item.timestamp >= startOfWeekMs) {
        const idx = getDayIndex(itemDate);
        if (idx >= 0 && idx < 7) {
          dailyEarnings[idx] += item.reward;
        }
      }
    });
  }

  const maxVal = Math.max(...dailyEarnings, 10);
  const midVal = maxVal / 2;

  const points = dailyEarnings.map((val, i) => {
    const x = 10 + i * (280 / 6);
    const y = 110 - (val / maxVal) * 100;
    return { x, y };
  });

  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getBezierPath(points);
  const fillPath = `${linePath} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`;
  const todayPoint = points[currentDayIndex];

  return (
    <div className="space-y-4">
      <div className="relative flex items-stretch h-36">
        <div className="w-12 shrink-0 flex flex-col justify-between text-[10px] font-bold text-[var(--dah-outline)] pr-2 py-1 select-none text-right">
          <span>{maxVal.toFixed(0)} XLM</span>
          <span>{midVal.toFixed(0)} XLM</span>
          <span>0 XLM</span>
        </div>

        <div className="flex-1 relative">
          <svg viewBox="0 0 300 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chart-fill-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbd44" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#fbbd44" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="10" x2="300" y2="10" stroke="#f1f3ff" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="300" y2="60" stroke="#f1f3ff" strokeDasharray="3 3" />
            <line x1="0" y1="110" x2="300" y2="110" stroke="#e9edff" strokeWidth="1" />
            <path d={fillPath} fill="url(#chart-fill-gradient)" />
            <path
              d={linePath}
              fill="none"
              stroke="#ffbf21"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle
              cx={todayPoint.x}
              cy={todayPoint.y}
              r="4.5"
              fill="var(--dah-primary)"
              stroke="#ffbf21"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center text-[11px] font-bold text-[var(--dah-outline)] select-none">
        <div className="w-12 shrink-0 pr-2" />
        <div className="flex-1 relative h-5">
          {days.map((day, i) => {
            const pct = ((10 + i * (280 / 6)) / 300) * 100;
            return (
              <div
                key={day}
                className="absolute -translate-x-1/2 text-center"
                style={{ left: `${pct}%` }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex flex-col items-center">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--dah-outline)] font-display">
          Day of Week
        </span>
      </div>
    </div>
  );
}
