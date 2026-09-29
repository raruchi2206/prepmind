import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeSignal } from '../components/KnowledgeSignal';

const vivaQuestions = [
  {
    q: 'Explain how normalization reduces redundancy in a relational database.',
    followUp: 'Can you give a concrete example with a relation before and after normalization?',
  },
  {
    q: 'Why is normalization important for database design?',
    followUp: 'What are the anomalies that normalization helps prevent?',
  },
  {
    q: 'Can you explain what 2NF is and when a relation is in 2NF?',
    followUp: 'What distinguishes 2NF from 3NF in terms of dependency type?',
  },
  {
    q: 'What is BCNF and how does it differ from 3NF?',
    followUp: 'Can a relation be in 3NF but not in BCNF? Give an example.',
  },
  {
    q: 'Describe the ACID properties and their importance in transaction management.',
    followUp: 'How does isolation prevent dirty reads in concurrent transactions?',
  },
];

const transcript = [
  { role: 'PREPMIND', text: 'Explain how normalization reduces redundancy in a relational database.', time: '00:12' },
  { role: 'USER', text: 'Normalization is important because it organizes data to minimize redundancy. In an unnormalized table, the same data might appear in multiple rows. For example, if we store student and course data together, the student name repeats for every course they take. Normalization decomposes this into separate, well-structured relations.', time: '00:45' },
  { role: 'PREPMIND', text: 'Good. Can you give a concrete example with a relation before and after normalization?', time: '01:02' },
  { role: 'USER', text: 'Sure. Consider STUDENT_COURSE with attributes StudentID, StudentName, CourseID, CourseName. The student name repeats for every course they enroll in. We decompose this into STUDENT(StudentID, StudentName) and ENROLLMENT(StudentID, CourseID) and COURSE(CourseID, CourseName). This eliminates the redundancy.', time: '01:38' },
  { role: 'PREPMIND', text: 'Why is normalization important for database design?', time: '01:45' },
  { role: 'USER', text: 'Normalization prevents three types of anomalies: insertion anomalies where we cannot add data without adding unrelated data, update anomalies where changing one record requires changing many records, and deletion anomalies where deleting one record causes loss of other important data.', time: '02:20' },
];

function VivaSetup({ theme, onStart }) {
  const [duration, setDuration] = useState(10);
  const [qCount, setQCount] = useState(5);
  const [instruction, setInstruction] = useState('');
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="animate-fade-in-up">
          <p className={`font-mono text-[10px] tracking-widest mb-1 ${sub}`}>GENERATE</p>
          <h1 className="font-display text-4xl font-light mb-8">AI Viva Setup</h1>
          <div className="space-y-5">
            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>KNOWLEDGE</p>
              <div className="flex flex-wrap gap-2">
                {['DBMS Notes.pdf', 'DBMS YouTube Lecture'].map((s, i) => (
                  <span key={i} className={`text-[10px] font-body px-2.5 py-1 rounded-sm border ${border}`}>{s}</span>
                ))}
              </div>
            </div>
            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>DURATION</p>
              <div className="flex gap-2">
                {[5, 10, 15].map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`px-4 py-2 text-xs font-mono rounded-sm transition-all ${
                      duration === d
                        ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                        : `border ${border} opacity-50 hover:opacity-100`
                    }`}>{d} min</button>
                ))}
              </div>
            </div>
            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>QUESTIONS</p>
              <div className="flex gap-2">
                {[5, 10].map(n => (
                  <button key={n} onClick={() => setQCount(n)}
                    className={`w-12 h-10 text-xs font-mono rounded-sm transition-all ${
                      qCount === n
                        ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                        : `border ${border} opacity-50 hover:opacity-100`
                    }`}>{n}</button>
                ))}
              </div>
            </div>
            <div className={`p-5 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>CUSTOM INSTRUCTION — OPTIONAL</p>
              <input value={instruction} onChange={e => setInstruction(e.target.value)}
                placeholder={`"Focus on the normalization module."`}
                className={`w-full bg-transparent border rounded-sm px-3 py-2 text-xs font-body focus:outline-none transition-colors ${border}`} />
            </div>
            <button onClick={onStart}
              className={`w-full py-4 text-sm font-body tracking-wide rounded-sm transition-all group ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
              START VIVA <span className="group-hover:translate-x-1 inline-block transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VivaRoom({ theme, questions, onEnd }) {
  const [qIndex, setQIndex] = useState(0);
  const [vivaState, setVivaState] = useState('ready'); // ready | listening | analyzing | next
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  const isFollowUp = vivaState === 'next';
  const currentQ = isFollowUp ? questions[qIndex].followUp : questions[qIndex].q;

  const handleMic = () => {
    if (vivaState === 'ready') setVivaState('listening');
    else if (vivaState === 'listening') setVivaState('analyzing');
  };

  useEffect(() => {
    if (vivaState === 'analyzing') {
      const t = setTimeout(() => setVivaState('next'), 1500);
      return () => clearTimeout(t);
    }
  }, [vivaState]);

  const handleNext = () => {
    setAnswers(prev => [...prev, answer]);
    setAnswer('');
    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1);
      setVivaState('ready');
    } else {
      onEnd();
    }
  };

  const micColor = vivaState === 'listening' ? '#E74C3C' : vivaState === 'analyzing' ? '#E1DCC9' : (light ? '#412D15' : '#E1DCC9');
  const micLabel = { ready: 'SPEAK TO ANSWER', listening: 'LISTENING...', analyzing: 'ANALYZING...', next: 'NEXT QUESTION' };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.08)' }}>
        <span className="font-display text-sm font-light">PREPMIND AI VIVA</span>
        <div className="flex items-center gap-4">
          <span className={`font-mono text-[9px] tracking-widest ${sub}`}>Q {qIndex + 1} / {questions.length}</span>
          <span className={`font-mono text-[9px] ${muted}`}>AI EXAMINER</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 max-w-2xl mx-auto w-full">
        {/* Signal */}
        <div className="relative">
          <KnowledgeSignal size={80} animated light={light} />
          {vivaState === 'listening' && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1 items-end h-5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-0.5 bg-[#E1DCC9] rounded-full waveform-bar" style={{ minHeight: 4 }} />
              ))}
            </div>
          )}
        </div>

        {/* Question */}
        <div className="text-center">
          <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>
            {isFollowUp ? 'FOLLOW-UP QUESTION' : 'QUESTION'}
          </p>
          <p className="font-display text-xl font-light leading-relaxed max-w-lg text-center">
            "{currentQ}"
          </p>
        </div>

        {/* Answer input */}
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          rows={4}
          placeholder="Type your answer here (or use the microphone)..."
          className={`w-full bg-transparent border rounded-sm px-4 py-3 text-sm font-body resize-none focus:outline-none transition-colors ${border}`}
          style={{ '--tw-placeholder-opacity': 0.2 }}
        />

        {/* Mic button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleMic}
            disabled={vivaState === 'analyzing'}
            className="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ borderColor: micColor }}
          >
            {vivaState === 'listening' ? (
              <div className="w-4 h-4 rounded-sm" style={{ background: micColor }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={micColor} strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
          <p className={`font-mono text-[9px] tracking-widest ${sub}`}>{micLabel[vivaState]}</p>
        </div>

        {/* Next button */}
        {(vivaState === 'next' || answer.trim()) && (
          <button onClick={handleNext}
            className={`px-8 py-3 text-xs font-body rounded-sm transition-all animate-fade-in ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
            {qIndex < questions.length - 1 ? 'NEXT QUESTION →' : 'END VIVA →'}
          </button>
        )}
      </div>
    </div>
  );
}

function VivaTranscriptView({ theme, onContinue }) {
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className={`font-mono text-[10px] tracking-widest mb-1 ${sub}`}>VIVA TRANSCRIPT</p>
            <h1 className="font-display text-3xl font-light">DBMS Viva Session</h1>
          </div>
          <button onClick={onContinue}
            className={`px-5 py-2.5 text-xs font-body rounded-sm transition-all ${light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
            VIEW EVALUATION →
          </button>
        </div>

        <div className="space-y-4">
          {transcript.map((entry, i) => (
            <div key={i} className={`p-5 border rounded-sm animate-fade-in-up ${border}`}
              style={{ background: entry.role === 'PREPMIND' ? (light ? '#fff' : '#0A0703') : (light ? '#F0EDE4' : '#1F150C') }}>
              <div className="flex items-center justify-between mb-2">
                <p className={`font-mono text-[9px] tracking-widest ${entry.role === 'PREPMIND' ? muted : 'opacity-70'}`}>
                  {entry.role === 'PREPMIND' ? '◈ AI EXAMINER' : '◎ YOU'}
                </p>
                <p className={`font-mono text-[9px] ${sub}`}>{entry.time}</p>
              </div>
              <p className="text-sm font-body leading-relaxed">{entry.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VivaResult({ theme, onReset }) {
  const metrics = [
    { label: 'Technical Accuracy', val: 84 },
    { label: 'Conceptual Understanding', val: 81 },
    { label: 'Answer Relevance', val: 85 },
    { label: 'Completeness', val: 80 },
    { label: 'Communication', val: 78 },
  ];
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <p className={`font-mono text-[9px] tracking-widest mb-4 ${sub}`}>VIVA COMPLETE</p>
          <div className="font-display text-8xl font-light mb-2">82%</div>
          <p className={`font-body text-sm ${muted}`}>Overall Score</p>
        </div>

        <div className={`p-6 border rounded-sm mb-6 animate-fade-in-up delay-100 ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
          <p className={`font-mono text-[9px] tracking-widest mb-4 ${sub}`}>EVALUATION</p>
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
          <p className={`text-xs font-body leading-relaxed ${muted} mb-4`}>
            "Your explanation of normalization was technically correct and well-structured. The example you provided was relevant but could be more detailed. In the ACID properties question, your answer on isolation was slightly incomplete — consider elaborating on serializable isolation level."
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[{ l: 'STRONG AREAS', v: 'Normalization theory, SQL fundamentals, transaction basics.' },
              { l: 'WEAK AREAS', v: 'BCNF nuances, isolation levels, index implementation.' },
              { l: 'RECOMMENDED', v: 'Practice BCNF decomposition and transaction isolation.' }].map((f, i) => (
              <div key={i}>
                <p className={`font-mono text-[8px] tracking-widest mb-1 ${sub}`}>{f.l}</p>
                <p className={`text-[10px] font-body leading-relaxed ${muted}`}>{f.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 animate-fade-in-up delay-300">
          <Link to="/viva/transcript" className={`px-5 py-2.5 text-xs font-body border rounded-sm transition-all ${border} ${light ? 'hover:bg-[#E1DCC9]' : 'hover:bg-[#1F150C]'}`}>
            VIEW TRANSCRIPT
          </Link>
          <Link to="/create?mode=quiz"
            className={`px-5 py-2.5 text-xs font-body rounded-sm transition-all ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
            PRACTICE WEAK AREAS
          </Link>
          <button onClick={onReset} className={`px-5 py-2.5 text-xs font-body border rounded-sm transition-all ${border} ${light ? 'hover:bg-[#E1DCC9]' : 'hover:bg-[#1F150C]'}`}>
            USE SAME KNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
}

export function VivaTranscriptPage({ theme }) {
  return <VivaTranscriptView theme={theme} onContinue={() => {}} />;
}

export default function Viva({ theme }) {
  const [phase, setPhase] = useState('setup');
  const activeQs = vivaQuestions.slice(0, 5);

  if (phase === 'setup') return <VivaSetup theme={theme} onStart={() => setPhase('viva')} />;
  if (phase === 'viva') return <VivaRoom theme={theme} questions={activeQs} onEnd={() => setPhase('transcript')} />;
  if (phase === 'transcript') return <VivaTranscriptView theme={theme} onContinue={() => setPhase('result')} />;
  return <VivaResult theme={theme} onReset={() => setPhase('setup')} />;
}
