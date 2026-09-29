import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const questions = [
  {
    q: 'Which normal form eliminates partial dependencies from a relation?',
    opts: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
    correct: 1,
    topic: 'Normalization',
  },
  {
    q: 'A relation R(A, B, C, D) has the functional dependency A → B and C → D. If {A, C} is the primary key, which normal form violation exists?',
    opts: ['1NF violation', 'Partial dependency (2NF violation)', 'Transitive dependency (3NF violation)', 'BCNF violation'],
    correct: 1,
    topic: 'Normalization',
  },
  {
    q: 'Which ACID property ensures that once a transaction is committed, it remains committed even in case of system failure?',
    opts: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    correct: 3,
    topic: 'Transactions',
  },
  {
    q: 'In SQL, which JOIN type returns all rows from both tables, including unmatched rows with NULL values?',
    opts: ['INNER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN'],
    correct: 3,
    topic: 'SQL',
  },
  {
    q: 'Which index structure is most commonly used in relational databases and supports ordered traversal efficiently?',
    opts: ['Hash Index', 'Bitmap Index', 'B+ Tree Index', 'Inverted Index'],
    correct: 2,
    topic: 'Indexing',
  },
  {
    q: 'What does the "I" in ACID stand for, and what does it guarantee?',
    opts: [
      'Integrity — data remains valid',
      'Isolation — transactions do not interfere with each other',
      'Indexing — fast data access',
      'Identity — unique row identification',
    ],
    correct: 1,
    topic: 'Transactions',
  },
  {
    q: 'Which of the following is TRUE about BCNF?',
    opts: [
      'Every relation in 3NF is also in BCNF',
      'BCNF is less strict than 3NF',
      'Every determinant in BCNF must be a candidate key',
      'BCNF allows transitive dependencies',
    ],
    correct: 2,
    topic: 'Normalization',
  },
  {
    q: 'In a B+ Tree index, data records are stored at:',
    opts: ['Internal nodes only', 'Leaf nodes only', 'Both internal and leaf nodes', 'The root node only'],
    correct: 1,
    topic: 'Indexing',
  },
  {
    q: 'Which SQL command is used to permanently save a transaction?',
    opts: ['ROLLBACK', 'SAVEPOINT', 'COMMIT', 'RELEASE'],
    correct: 2,
    topic: 'Transactions',
  },
  {
    q: 'A relation is in 3NF but NOT in BCNF. This implies:',
    opts: [
      'The relation has no primary key',
      'There exists a non-trivial FD where the determinant is not a superkey',
      'There are repeating groups in the relation',
      'All attributes are dependent on the entire primary key',
    ],
    correct: 1,
    topic: 'Normalization',
  },
];

function QuizSetup({ theme, onStart }) {
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('adaptive');
  const [qType, setQType] = useState('mcq');
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="animate-fade-in-up">
          <p className={`font-mono text-[10px] tracking-widest mb-1 ${sub}`}>GENERATE</p>
          <h1 className="font-display text-4xl font-light mb-8">Quiz Setup</h1>

          <div className="space-y-6">
            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>KNOWLEDGE</p>
              <div className="flex flex-wrap gap-2">
                {['DBMS Notes.pdf', 'DBMS YouTube Lecture'].map((s, i) => (
                  <span key={i} className={`text-[10px] font-body px-2.5 py-1 rounded-sm border ${border}`}>{s}</span>
                ))}
              </div>
            </div>

            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>QUESTIONS</p>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`w-12 h-10 text-xs font-mono rounded-sm transition-all ${
                      count === n
                        ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                        : `border ${border} opacity-50 hover:opacity-100`
                    }`}>{n}</button>
                ))}
              </div>
            </div>

            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>DIFFICULTY</p>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard', 'adaptive'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 text-[9px] font-mono tracking-wide rounded-sm transition-all ${
                      difficulty === d
                        ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                        : `border ${border} opacity-50 hover:opacity-100`
                    }`}>{d.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>QUESTION TYPE</p>
              <div className="flex gap-2">
                {['MCQ', 'Multi-Select', 'Mixed'].map(t => (
                  <button key={t} onClick={() => setQType(t)}
                    className={`px-4 py-2 text-[9px] font-mono tracking-wide rounded-sm transition-all ${
                      qType === t
                        ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                        : `border ${border} opacity-50 hover:opacity-100`
                    }`}>{t.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <button onClick={() => onStart(count)}
              className={`w-full py-4 text-sm font-body tracking-wide rounded-sm transition-all group ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
              GENERATE QUIZ <span className="group-hover:translate-x-1 inline-block transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizExperience({ questions, theme, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const q = questions[current];
  const selected = answers[current];
  const formatTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = ((current + 1) / questions.length) * 100;

  const handleSubmit = () => onComplete(answers);

  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: light ? '#F8F7F3' : '#000' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.08)' }}>
        <span className="font-display text-sm font-light">PREPMIND QUIZ</span>
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs opacity-40">Q {current + 1} / {questions.length}</span>
          <span className="font-mono text-xs opacity-60">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: light ? 'rgba(65,45,21,0.08)' : 'rgba(225,220,201,0.06)' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: light ? '#412D15' : '#E1DCC9' }} />
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <p className={`font-mono text-[9px] tracking-widest mb-4 ${light ? 'text-[rgba(0,0,0,0.3)]' : 'text-[rgba(225,220,201,0.3)]'}`}>
            QUESTION {current + 1}
          </p>
          <p className="font-display text-xl font-light mb-8 leading-relaxed">{q.q}</p>
          <div className="space-y-3">
            {q.opts.map((opt, i) => {
              const labels = ['A', 'B', 'C', 'D'];
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers(prev => ({ ...prev, [current]: i }))}
                  className={`w-full flex items-start gap-4 px-5 py-4 border rounded-sm text-left transition-all ${
                    isSelected
                      ? light ? 'border-[#412D15] bg-[rgba(65,45,21,0.06)]' : 'border-[rgba(225,220,201,0.5)] bg-[rgba(225,220,201,0.05)]'
                      : `${border} ${light ? 'hover:bg-white' : 'hover:bg-[#0A0703]'}`
                  }`}
                >
                  <span className={`font-mono text-[10px] flex-shrink-0 mt-0.5 ${isSelected ? 'opacity-80' : 'opacity-30'}`}>{labels[i]}</span>
                  <span className="text-sm font-body leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex justify-between items-center" style={{ borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.08)' }}>
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-5 py-2.5 text-xs font-body border rounded-sm disabled:opacity-20 transition-all hover:opacity-60"
          style={{ borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.12)' }}
        >
          ← PREVIOUS
        </button>
        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className={`px-5 py-2.5 text-xs font-body rounded-sm transition-all ${light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}
          >
            NEXT →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className={`px-5 py-2.5 text-xs font-body rounded-sm transition-all ${light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}
          >
            SUBMIT QUIZ →
          </button>
        )}
      </div>
    </div>
  );
}

function QuizResult({ questions, answers, theme, onReset }) {
  const correct = questions.filter((q, i) => answers[i] === q.correct).length;
  const pct = Math.round((correct / questions.length) * 100);

  const topicMap = {};
  questions.forEach((q, i) => {
    if (!topicMap[q.topic]) topicMap[q.topic] = { total: 0, correct: 0 };
    topicMap[q.topic].total++;
    if (answers[i] === q.correct) topicMap[q.topic].correct++;
  });

  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <p className={`font-mono text-[9px] tracking-widest mb-4 ${sub}`}>QUIZ COMPLETE</p>
          <div className="font-display text-8xl font-light mb-2">{pct}%</div>
          <p className={`font-body text-sm ${muted}`}>{correct} / {questions.length} CORRECT</p>
        </div>

        {/* Topic performance */}
        <div className={`p-6 border rounded-sm mb-6 animate-fade-in-up delay-100 ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
          <p className={`font-mono text-[9px] tracking-widest mb-4 ${sub}`}>TOPIC PERFORMANCE</p>
          <div className="space-y-4">
            {Object.entries(topicMap).map(([topic, data]) => {
              const p = Math.round((data.correct / data.total) * 100);
              return (
                <div key={topic}>
                  <div className="flex justify-between mb-1">
                    <p className="text-xs font-body">{topic}</p>
                    <p className="text-xs font-mono">{p}%</p>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: light ? 'rgba(65,45,21,0.08)' : 'rgba(225,220,201,0.08)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: p >= 80 ? '#6BA37A' : p >= 60 ? '#E1DCC9' : '#C17C74' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Feedback */}
        <div className={`p-6 border rounded-sm mb-6 animate-fade-in-up delay-200 ${light ? 'border-[rgba(65,45,21,0.15)] bg-[rgba(65,45,21,0.04)]' : 'border-[rgba(225,220,201,0.12)] bg-[rgba(225,220,201,0.03)]'}`}>
          <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>OVERALL EVALUATION</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {[{ l: 'Strengths', v: 'Strong on 3NF theory, SQL JOINs, and ACID fundamentals.' },
              { l: 'Weak Areas', v: 'BCNF nuances and partial dependency identification need practice.' },
              { l: 'Recommended', v: 'Practice 5 more questions on normalization theory.' }].map((f, i) => (
              <div key={i}>
                <p className={`font-mono text-[8px] tracking-widest mb-1 ${sub}`}>{f.l.toUpperCase()}</p>
                <p className={`text-[10px] font-body leading-relaxed ${muted}`}>{f.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 animate-fade-in-up delay-300">
          <Link to="/create?mode=quiz&topic=normalization"
            className={`px-5 py-2.5 text-xs font-body rounded-sm transition-all ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
            PRACTICE WEAK TOPICS
          </Link>
          <button onClick={onReset} className={`px-5 py-2.5 text-xs font-body border rounded-sm transition-all ${border} ${light ? 'hover:bg-[#E1DCC9]' : 'hover:bg-[#1F150C]'}`}>
            CREATE ANOTHER QUIZ
          </button>
          <Link to="/create" className={`px-5 py-2.5 text-xs font-body border rounded-sm transition-all ${border} ${light ? 'hover:bg-[#E1DCC9]' : 'hover:bg-[#1F150C]'}`}>
            USE SAME KNOWLEDGE
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Quiz({ theme }) {
  const [phase, setPhase] = useState('setup');
  const [qCount, setQCount] = useState(10);
  const [userAnswers, setUserAnswers] = useState({});

  const activeQuestions = questions.slice(0, qCount);

  if (phase === 'setup') {
    return <QuizSetup theme={theme} onStart={(n) => { setQCount(n); setPhase('quiz'); }} />;
  }
  if (phase === 'quiz') {
    return <QuizExperience questions={activeQuestions} theme={theme} onComplete={(a) => { setUserAnswers(a); setPhase('result'); }} />;
  }
  return <QuizResult questions={activeQuestions} answers={userAnswers} theme={theme} onReset={() => setPhase('setup')} />;
}
