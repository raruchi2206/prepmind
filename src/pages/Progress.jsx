import { useEffect, useState } from 'react';

const topics = [
  { name: 'SQL & Joins', val: 88, sessions: 8 },
  { name: 'Normalization', val: 92, sessions: 12 },
  { name: 'Transactions', val: 74, sessions: 5 },
  { name: 'Indexing', val: 61, sessions: 3 },
  { name: 'Process Management', val: 79, sessions: 6 },
  { name: 'Memory Management', val: 67, sessions: 4 },
  { name: 'Neural Networks', val: 83, sessions: 7 },
  { name: 'Supervised Learning', val: 76, sessions: 5 },
];

const stats = [
  { label: 'Overall Preparation', val: '81%', sub: 'Across all topics' },
  { label: 'Questions Attempted', val: '142', sub: 'Quiz + Paper + Viva' },
  { label: 'Average Accuracy', val: '81%', sub: 'All sessions' },
  { label: 'Viva Sessions', val: '6', sub: 'Completed' },
];

const recentTrend = [65, 70, 68, 75, 78, 82, 79, 84, 81, 84, 88, 84];

function MiniChart({ data, light }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 300;
  const h = 60;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 8) - 4,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fill = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
    ` L ${w} ${h} L 0 ${h} Z`;

  const stroke = light ? '#412D15' : '#E1DCC9';
  const fillColor = light ? 'rgba(65,45,21,0.08)' : 'rgba(225,220,201,0.08)';

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={fill} fill={fillColor} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3 : 2}
          fill={i === pts.length - 1 ? stroke : 'transparent'}
          stroke={stroke} strokeWidth="1"
          opacity={i === pts.length - 1 ? 1 : 0.3}
        />
      ))}
    </svg>
  );
}

function AnimatedBar({ val, light, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);

  const color = val >= 80 ? '#6BA37A' : val >= 65 ? '#E1DCC9' : '#C17C74';
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: light ? 'rgba(65,45,21,0.08)' : 'rgba(225,220,201,0.08)' }}>
      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

export default function Progress({ theme }) {
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 animate-fade-in-up">
          <p className={`font-mono text-[10px] tracking-widest mb-1 ${sub}`}>PROGRESS</p>
          <h1 className="font-display text-4xl font-light">Your Preparation</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border rounded-sm overflow-hidden mb-8 animate-fade-in-up delay-100"
          style={{ border: light ? '1px solid rgba(65,45,21,0.1)' : '1px solid rgba(225,220,201,0.08)', background: light ? 'rgba(65,45,21,0.06)' : 'rgba(225,220,201,0.05)' }}>
          {stats.map((s, i) => (
            <div key={i} className="p-6" style={{ background: light ? '#fff' : '#000' }}>
              <p className="font-display text-3xl font-light mb-1">{s.val}</p>
              <p className={`text-xs font-body mb-0.5`}>{s.label}</p>
              <p className={`text-[9px] font-mono ${sub}`}>{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Topic Performance */}
          <div className="lg:col-span-2">
            <p className={`font-mono text-[9px] tracking-widest mb-4 ${sub}`}>TOPIC PERFORMANCE</p>
            <div className={`p-6 border rounded-sm animate-fade-in-up delay-200 ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <div className="space-y-5">
                {topics.map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-body">{t.name}</p>
                      <div className="flex items-center gap-3">
                        <p className={`text-[9px] font-mono ${sub}`}>{t.sessions} sessions</p>
                        <p className="text-xs font-mono">{t.val}%</p>
                      </div>
                    </div>
                    <AnimatedBar val={t.val} light={light} delay={i * 80} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trend */}
          <div>
            <p className={`font-mono text-[9px] tracking-widest mb-4 ${sub}`}>ACCURACY TREND</p>
            <div className={`p-6 border rounded-sm mb-4 animate-fade-in-up delay-300 ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className="font-display text-3xl font-light mb-1">+19%</p>
              <p className={`text-[10px] font-body ${muted} mb-4`}>Improvement over last 30 days</p>
              <div className="overflow-hidden">
                <MiniChart data={recentTrend} light={light} />
              </div>
              <div className="flex justify-between mt-2">
                <p className={`text-[9px] font-mono ${sub}`}>30d ago</p>
                <p className={`text-[9px] font-mono ${sub}`}>Today</p>
              </div>
            </div>

            {/* Session breakdown */}
            <div className={`p-5 border rounded-sm animate-fade-in-up delay-400 ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>SESSIONS</p>
              <div className="space-y-3">
                {[
                  { type: 'Quiz', count: 18, avg: '82%', color: '#6BA37A' },
                  { type: 'Practice Paper', count: 8, avg: '79%', color: '#C49A5B' },
                  { type: 'Viva', count: 6, avg: '80%', color: '#C17C74' },
                  { type: 'Summary + Notes', count: 14, avg: '—', color: '#5B8AC4' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <p className="text-[10px] font-body flex-1">{s.type}</p>
                    <p className={`text-[9px] font-mono ${sub}`}>{s.count}×</p>
                    <p className="text-[10px] font-mono">{s.avg}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
