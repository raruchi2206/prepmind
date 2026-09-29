import { useState } from 'react';
import { Link } from 'react-router-dom';

const allHistory = [
  { id: 1, type: 'QUIZ', title: 'DBMS Quiz — Normalization', score: 84, date: 'Today', time: '3:42 PM', topics: ['Normalization', 'SQL'] },
  { id: 2, type: 'NOTES', title: 'Normalization — Structured Notes', score: null, date: 'Today', time: '1:15 PM', sub: 'Generated PDF' },
  { id: 3, type: 'VIVA', title: 'DBMS Viva Session', score: 82, date: 'Yesterday', time: '4:30 PM', topics: ['Normalization', 'Transactions'] },
  { id: 4, type: 'PAPER', title: 'AI/ML Practice Paper', score: 78, date: '3 days ago', time: '2:00 PM', topics: ['Supervised Learning', 'Neural Networks'] },
  { id: 5, type: 'SUMMARY', title: 'Operating Systems — Summary', score: null, date: '4 days ago', time: '11:00 AM', sub: 'Exam-focused' },
  { id: 6, type: 'QUIZ', title: 'OS Process Management Quiz', score: 71, date: '5 days ago', time: '6:00 PM', topics: ['Scheduling', 'Deadlock'] },
  { id: 7, type: 'ASK', title: 'Asked: Explain semaphores', score: null, date: '6 days ago', time: '3:15 PM', sub: '5 queries' },
  { id: 8, type: 'VIVA', title: 'OS Concepts Viva', score: 77, date: '1 week ago', time: '5:00 PM', topics: ['Memory Management', 'Scheduling'] },
];

const filters = ['ALL', 'SUMMARY', 'NOTES', 'QUIZ', 'PAPER', 'VIVA', 'ASK'];

const typeColors = {
  QUIZ: '#6BA37A',
  NOTES: '#5B8AC4',
  VIVA: '#C17C74',
  PAPER: '#C49A5B',
  SUMMARY: '#8B7CC4',
  ASK: '#7CC4B4',
};

function SessionDetail({ item, theme, onClose }) {
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  const isQuiz = item.type === 'QUIZ';
  const isViva = item.type === 'VIVA';
  const isPaper = item.type === 'PAPER';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto animate-slide-in-right"
        style={{ background: light ? '#F8F7F3' : '#0A0703' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.08)' }}>
          <div>
            <p className={`font-mono text-[9px] tracking-widest mb-1 ${sub}`}>{item.type} DETAIL</p>
            <p className="font-display text-lg font-light">{item.title}</p>
          </div>
          <button onClick={onClose} className={`text-xs opacity-40 hover:opacity-70 font-mono`}>✕ CLOSE</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score */}
          {item.score != null && (
            <div className={`p-6 border rounded-sm text-center ${border}`} style={{ background: light ? '#fff' : '#1F150C' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-2 ${sub}`}>SCORE</p>
              <p className="font-display text-5xl font-light">{item.score}%</p>
            </div>
          )}

          {/* Topics */}
          {item.topics && (
            <div>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>TOPICS COVERED</p>
              <div className="flex flex-wrap gap-2">
                {item.topics.map((t, i) => (
                  <span key={i} className={`text-[10px] font-body px-2.5 py-1 rounded-sm border ${border}`}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Quiz details */}
          {isQuiz && (
            <div className={`p-4 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#1F150C' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>PERFORMANCE BREAKDOWN</p>
              {[
                { t: 'Normalization', v: 92 }, { t: 'SQL', v: 88 }, { t: 'Transactions', v: 74 }, { t: 'Indexing', v: 61 }
              ].map((m, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <p className="text-[10px] font-body">{m.t}</p>
                    <p className="text-[10px] font-mono">{m.v}%</p>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: light ? 'rgba(65,45,21,0.08)' : 'rgba(225,220,201,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${m.v}%`, background: '#E1DCC9' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Viva transcript excerpt */}
          {isViva && (
            <div>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>TRANSCRIPT EXCERPT</p>
              <div className={`p-4 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#1F150C' }}>
                <div className="space-y-3">
                  {[
                    { role: 'AI', text: 'Why is normalization important?' },
                    { role: 'YOU', text: 'Normalization reduces redundancy and prevents update anomalies...' },
                  ].map((e, i) => (
                    <div key={i}>
                      <p className={`font-mono text-[8px] tracking-widest mb-1 ${sub}`}>{e.role}</p>
                      <p className={`text-xs font-body ${muted}`}>{e.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI feedback */}
          <div className={`p-4 border rounded-sm ${light ? 'border-[rgba(65,45,21,0.15)] bg-[rgba(65,45,21,0.04)]' : 'border-[rgba(225,220,201,0.12)] bg-[rgba(225,220,201,0.03)]'}`}>
            <p className={`font-mono text-[9px] tracking-widest mb-2 ${sub}`}>AI FEEDBACK</p>
            <p className={`text-xs font-body leading-relaxed ${muted}`}>
              Strong performance on normalization theory. Consider revisiting indexing concepts and transaction isolation levels for improved results.
            </p>
          </div>

          <div className="flex gap-3">
            <Link to="/create" className={`flex-1 py-2.5 text-xs font-body text-center rounded-sm transition-all ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
              PRACTICE AGAIN
            </Link>
            <button onClick={onClose} className={`px-5 py-2.5 text-xs font-body border rounded-sm transition-all ${border} ${light ? 'hover:bg-[#E1DCC9]' : 'hover:bg-[#1F150C]'}`}>
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function History({ theme }) {
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  const filtered = filter === 'ALL' ? allHistory : allHistory.filter(h => h.type === filter);

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      {selected && <SessionDetail item={selected} theme={theme} onClose={() => setSelected(null)} />}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8 animate-fade-in-up">
          <p className={`font-mono text-[10px] tracking-widest mb-1 ${sub}`}>HISTORY</p>
          <h1 className="font-display text-4xl font-light">Your Sessions</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap animate-fade-in-up delay-100">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[9px] font-mono tracking-wide rounded-sm transition-all ${
                filter === f
                  ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                  : `border ${border} opacity-50 hover:opacity-100`
              }`}>{f}</button>
          ))}
        </div>

        <div className="space-y-2 animate-fade-in-up delay-200">
          {filtered.map((h, i) => (
            <button
              key={h.id}
              onClick={() => setSelected(h)}
              className={`w-full flex items-center gap-4 px-4 py-4 border rounded-sm text-left transition-all group ${border} ${light ? 'hover:bg-white' : 'hover:bg-[#0A0703]'}`}
            >
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: typeColors[h.type] || '#999', opacity: 0.6 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body truncate">{h.title}</p>
                <p className={`text-[9px] font-mono ${sub}`}>
                  {h.type} · {h.date} {h.time}
                  {h.sub && ` · ${h.sub}`}
                </p>
              </div>
              {h.score != null && (
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-xl font-light">{h.score}%</p>
                </div>
              )}
              <span className={`opacity-0 group-hover:opacity-40 transition-opacity text-xs ${muted}`}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
