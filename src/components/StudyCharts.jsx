import { useState } from "react";

const formatDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function ChartFrame({ title, subtitle, legend, table, children }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-label">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {legend}
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="text-xs text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
          >
            {showTable ? "Show chart" : "Show table"}
          </button>
        </div>
      </div>
      {showTable ? table : children}
    </section>
  );
}

function LegendItem({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

function Tooltip({ x, top, width, children }) {
  // Keep the tooltip inside the plot horizontally
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] shadow-lg"
      style={{ left: `${(left / width) * 100}%`, top }}
      role="status"
    >
      {children}
    </div>
  );
}

const tableClass = "w-full text-left text-xs text-[var(--text-secondary)]";

/** Score percentage per attempt, oldest to newest. */
export function ScoreTrendChart({ points }) {
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = 220;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => pad.t + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.percentage).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <ChartFrame
      title="Score trend"
      subtitle={`Percentage scored on your last ${points.length} attempt${points.length === 1 ? "" : "s"}`}
      table={
        <table className={tableClass}>
          <thead>
            <tr><th className="py-1">Date</th><th>Assessment</th><th>Type</th><th className="text-right">Score</th></tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="py-1">{new Date(p.date).toLocaleDateString()}</td>
                <td className="max-w-[12rem] truncate">{p.title}</td>
                <td>{p.type}</td>
                <td className="text-right text-[var(--text-primary)]">{p.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Score trend over ${points.length} attempts. Latest score ${last?.percentage ?? 0} percent.`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
              <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-secondary)">
                {v}%
              </text>
            </g>
          ))}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3 3" />
          )}
          <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle
              key={p.id}
              cx={x(i)}
              cy={y(p.percentage)}
              r={hover === i ? 5 : 4}
              fill="var(--series-1)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          ))}
          {last && (
            <text x={x(points.length - 1)} y={y(last.percentage) - 10} textAnchor="end" fontSize="11" fill="var(--text-primary)">
              {last.percentage}%
            </text>
          )}
          <text x={pad.l} y={H - 8} fontSize="10" fill="var(--text-secondary)">
            {points[0] ? new Date(points[0].date).toLocaleDateString() : ""}
          </text>
          <text x={W - pad.r} y={H - 8} textAnchor="end" fontSize="10" fill="var(--text-secondary)">
            {last ? new Date(last.date).toLocaleDateString() : ""}
          </text>
        </svg>
        {hover !== null && points[hover] && (
          <Tooltip x={x(hover)} top={`calc(${(y(points[hover].percentage) / H) * 100}% - 8px)`} width={W}>
            <span className="font-medium">{points[hover].percentage}%</span> · {points[hover].title}
            <span className="block text-[var(--text-secondary)]">
              {new Date(points[hover].date).toLocaleString()} · {points[hover].type}
            </span>
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  );
}

/** Stacked daily activity: assessment attempts and generated study items. */
export function ActivityChart({ days }) {
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = 200;
  const pad = { l: 28, r: 8, t: 12, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = Math.max(1, ...days.map((d) => d.attempts + d.generated));
  const slot = iw / days.length;
  const barW = Math.max(4, slot - 4);
  const yScale = (v) => (v / max) * ih;
  const total = days.reduce((s, d) => s + d.attempts + d.generated, 0);

  return (
    <ChartFrame
      title="Study activity · last 30 days"
      subtitle={`${total} activit${total === 1 ? "y" : "ies"} in this period`}
      legend={
        <>
          <LegendItem color="var(--series-1)" label="Attempts" />
          <LegendItem color="var(--series-2)" label="Generated" />
        </>
      }
      table={
        <table className={tableClass}>
          <thead>
            <tr><th className="py-1">Day</th><th className="text-right">Attempts</th><th className="text-right">Generated</th></tr>
          </thead>
          <tbody>
            {days.filter((d) => d.attempts + d.generated > 0).map((d) => (
              <tr key={d.date} className="border-t border-[var(--border)]">
                <td className="py-1">{formatDay(d.date)}</td>
                <td className="text-right text-[var(--text-primary)]">{d.attempts}</td>
                <td className="text-right text-[var(--text-primary)]">{d.generated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Daily study activity for the last 30 days, ${total} in total.`}>
          {[0, max].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih - yScale(v)} y2={pad.t + ih - yScale(v)} stroke="var(--border)" />
              <text x={pad.l - 6} y={pad.t + ih - yScale(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-secondary)">
                {v}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const bx = pad.l + i * slot + (slot - barW) / 2;
            const aH = yScale(d.attempts);
            const gH = yScale(d.generated);
            const base = pad.t + ih;
            // 2px surface gap between the stacked segments
            const gap = d.attempts > 0 && d.generated > 0 ? 2 : 0;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" />
                {d.attempts > 0 && <rect x={bx} y={base - aH} width={barW} height={aH} rx="2" fill="var(--series-1)" />}
                {d.generated > 0 && (
                  <rect x={bx} y={base - aH - gap - gH} width={barW} height={gH} rx="2" fill="var(--series-2)" />
                )}
              </g>
            );
          })}
          <text x={pad.l} y={H - 6} fontSize="10" fill="var(--text-secondary)">{days[0] ? formatDay(days[0].date) : ""}</text>
          <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize="10" fill="var(--text-secondary)">
            {days.length ? formatDay(days[days.length - 1].date) : ""}
          </text>
        </svg>
        {hover !== null && days[hover] && (
          <Tooltip x={pad.l + hover * slot + slot / 2} top="0px" width={W}>
            <span className="font-medium">{formatDay(days[hover].date)}</span>
            <span className="block text-[var(--text-secondary)]">
              {days[hover].attempts} attempt{days[hover].attempts === 1 ? "" : "s"} · {days[hover].generated} generated
            </span>
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  );
}

/** Average score per knowledge source. */
export function SourcePerformanceChart({ rows }) {
  return (
    <ChartFrame
      title="Performance by source"
      subtitle="Average assessment score per knowledge source. Sources with one attempt are marked as early data."
      table={
        <table className={tableClass}>
          <thead>
            <tr><th className="py-1">Source</th><th className="text-right">Attempts</th><th className="text-right">Average</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sourceId} className="border-t border-[var(--border)]">
                <td className="py-1">{r.title}</td>
                <td className="text-right">{r.attempts}</td>
                <td className="text-right text-[var(--text-primary)]">{r.averagePercentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.sourceId} title={`${r.title}: ${r.averagePercentage}% average over ${r.attempts} attempt${r.attempts === 1 ? "" : "s"}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-[var(--text-primary)]">{r.title}</span>
              <span className="shrink-0 text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)]">{r.averagePercentage}%</span> · {r.attempts} attempt{r.attempts === 1 ? "" : "s"}
                {!r.sufficientData && " · early data"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-elevated)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, r.averagePercentage)}%`,
                  background: "var(--series-1)",
                  opacity: r.sufficientData ? 1 : 0.55,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
