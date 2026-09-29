import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const paperQuestions = [
  { section: 'A', marks: 2, q: 'Define normalization and state its objectives.' },
  { section: 'A', marks: 2, q: 'What is a functional dependency? Give one example.' },
  { section: 'A', marks: 2, q: 'Define ACID properties in brief.' },
  { section: 'A', marks: 2, q: 'What is an index? Name two types of indexes.' },
  { section: 'B', marks: 5, q: 'Explain the differences between 2NF and 3NF with appropriate examples. Show the step-by-step normalization of a relation from 1NF to 3NF.' },
  { section: 'B', marks: 5, q: 'Describe transaction management in DBMS. Explain how rollback and commit operations maintain database consistency.' },
  { section: 'B', marks: 5, q: 'Compare clustered and non-clustered indexes. When would you choose one over the other in query optimization?' },
  { section: 'C', marks: 10, q: 'A university database has the following relation: ENROLLMENT(StudentID, StudentName, CourseID, CourseName, InstructorID, InstructorName, Grade). Identify all functional dependencies and normalize this relation to BCNF. Justify each step with the relevant normal form violation and decomposition.' },
  { section: 'C', marks: 10, q: 'Design a relational database schema for a hospital management system. Include at least 5 relations, define primary and foreign keys, and normalize all relations to 3NF. Explain any trade-offs you encountered during normalization.' },
];

function PaperSetup({ theme, onStart }) {
  const [marks, setMarks] = useState(50);
  const [duration, setDuration] = useState(90);
  const [difficulty, setDifficulty] = useState('medium');
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="animate-fade-in-up">
          <p className={`font-mono text-[10px] tracking-widest mb-1 ${sub}`}>GENERATE</p>
          <h1 className="font-display text-4xl font-light mb-8">Practice Paper</h1>
          <div className="space-y-5">
            {[
              { label: 'TOTAL MARKS', opts: [25, 50, 75, 100], val: marks, set: setMarks },
              { label: 'DURATION (MIN)', opts: [30, 60, 90, 120], val: duration, set: setDuration },
            ].map(({ label, opts, val, set }) => (
              <div key={label} className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
                <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>{label}</p>
                <div className="flex gap-2">
                  {opts.map(o => (
                    <button key={o} onClick={() => set(o)}
                      className={`w-16 h-10 text-xs font-mono rounded-sm transition-all ${
                        val === o
                          ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                          : `border ${border} opacity-50 hover:opacity-100`
                      }`}>{o}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>DIFFICULTY</p>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 text-[9px] font-mono tracking-wide rounded-sm transition-all ${
                      difficulty === d
                        ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                        : `border ${border} opacity-50 hover:opacity-100`
                    }`}>{d.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <button onClick={onStart}
              className={`w-full py-4 text-sm font-body tracking-wide rounded-sm transition-all group ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
              GENERATE PRACTICE PAPER <span className="group-hover:translate-x-1 inline-block transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperExperience({ theme, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(5400);
  const formatTime = s => `${Math.floor(s / 3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  const sections = ['A', 'B', 'C'];

  return (
    <div className="min-h-screen" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="sticky top-0 z-10 px-6 py-3 border-b flex items-center justify-between"
        style={{ background: light ? 'rgba(248,247,243,0.95)' : 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)', borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.08)' }}>
        <span className="font-display text-sm font-light">DATABASE MANAGEMENT SYSTEMS — PRACTICE PAPER</span>
        <div className="flex items-center gap-6">
          <span className={`font-mono text-xs ${muted}`}>50 Marks · {formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6 p-4 border rounded-sm" style={{ background: light ? '#fff' : '#0A0703', borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.08)' }}>
          <p className={`text-[10px] font-mono ${muted}`}>Subject: DBMS · Total Marks: 50 · Time: 90 min</p>
          <p className={`text-[10px] font-mono mt-1 ${sub}`}>Section A: 4×2 = 8 marks · Section B: 3×5 = 15 marks · Section C: 2×10 = 20 marks</p>
        </div>

        {sections.map(sec => (
          <div key={sec} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-display text-lg font-light">Section {sec}</span>
              <div className="flex-1 h-px" style={{ background: light ? 'rgba(65,45,21,0.08)' : 'rgba(225,220,201,0.06)' }} />
            </div>
            <div className="space-y-4">
              {paperQuestions
                .filter(q => q.section === sec)
                .map((q, i) => {
                  const key = `${sec}-${i}`;
                  return (
                    <div key={key} className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
                      <div className="flex justify-between mb-3">
                        <span className={`font-mono text-[9px] ${sub}`}>Q{i + 1}</span>
                        <span className={`font-mono text-[9px] ${sub}`}>[{q.marks} marks]</span>
                      </div>
                      <p className="text-sm font-body leading-relaxed mb-4">{q.q}</p>
                      <textarea
                        rows={q.marks >= 10 ? 8 : q.marks >= 5 ? 5 : 3}
                        value={answers[key] || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Write your answer here..."
                        className={`w-full bg-transparent border rounded-sm px-4 py-3 text-xs font-body resize-none focus:outline-none transition-colors ${border}`}
                        style={{ '--tw-placeholder-opacity': 0.2 }}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        <button onClick={() => onSubmit(answers)}
          className={`w-full py-4 text-sm font-body tracking-wide rounded-sm transition-all group ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
          SUBMIT FOR EVALUATION <span className="group-hover:translate-x-1 inline-block transition-transform">→</span>
        </button>
      </div>
    </div>
  );
}

function PaperResult({ theme, onReset }) {
  const metrics = [
    { label: 'Conceptual Understanding', val: 88 },
    { label: 'Problem Solving', val: 81 },
    { label: 'Accuracy', val: 84 },
    { label: 'Topic Coverage', val: 79 },
  ];
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <p className={`font-mono text-[9px] tracking-widest mb-4 ${sub}`}>PRACTICE COMPLETE</p>
          <div className="font-display text-8xl font-light mb-2">84%</div>
          <p className={`font-body text-sm ${muted}`}>42 / 50 MARKS</p>
        </div>

        <div className={`p-6 border rounded-sm mb-6 animate-fade-in-up delay-100 ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
          <p className={`font-mono text-[9px] tracking-widest mb-4 ${sub}`}>OVERALL EVALUATION</p>
          <div className="space-y-4">
            {metrics.map((m, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <p className="text-xs font-body">{m.label}</p>
                  <p className="text-xs font-mono">{m.val}%</p>
                </div>
                <div className="h-1 rounded-full" style={{ background: light ? 'rgba(65,45,21,0.08)' : 'rgba(225,220,201,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${m.val}%`, background: '#E1DCC9' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 border rounded-sm mb-6 animate-fade-in-up delay-200 ${light ? 'border-[rgba(65,45,21,0.15)] bg-[rgba(65,45,21,0.04)]' : 'border-[rgba(225,220,201,0.12)] bg-[rgba(225,220,201,0.03)]'}`}>
          <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>AI FEEDBACK</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[{ l: 'STRENGTHS', v: 'Excellent grasp of normalization theory and ACID properties.' },
              { l: 'AREAS TO IMPROVE', v: 'Section C answers lack sufficient examples and schema diagrams.' },
              { l: 'RECOMMENDED NEXT', v: 'Practice full BCNF decomposition problems with complex schemas.' }].map((f, i) => (
              <div key={i}>
                <p className={`font-mono text-[8px] tracking-widest mb-1 ${sub}`}>{f.l}</p>
                <p className={`text-[10px] font-body leading-relaxed ${muted}`}>{f.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 animate-fade-in-up delay-300">
          <Link to="/create?mode=paper"
            className={`px-5 py-2.5 text-xs font-body rounded-sm transition-all ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
            RECOMMENDED NEXT PRACTICE
          </Link>
          <button onClick={onReset} className={`px-5 py-2.5 text-xs font-body border rounded-sm transition-all ${border} ${light ? 'hover:bg-[#E1DCC9]' : 'hover:bg-[#1F150C]'}`}>
            CREATE ANOTHER PAPER
          </button>
          <Link to="/create" className={`px-5 py-2.5 text-xs font-body border rounded-sm transition-all ${border} ${light ? 'hover:bg-[#E1DCC9]' : 'hover:bg-[#1F150C]'}`}>
            USE SAME KNOWLEDGE
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PracticePaper({ theme }) {
  const [phase, setPhase] = useState('setup');
  if (phase === 'setup') return <PaperSetup theme={theme} onStart={() => setPhase('paper')} />;
  if (phase === 'paper') return <PaperExperience theme={theme} onSubmit={() => setPhase('result')} />;
  return <PaperResult theme={theme} onReset={() => setPhase('setup')} />;
}
