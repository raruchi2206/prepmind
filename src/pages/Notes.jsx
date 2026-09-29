import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeSignal } from '../components/KnowledgeSignal';

const genStages = ['READING KNOWLEDGE', 'FINDING RELEVANT CONTENT', 'BUILDING CONTEXT', 'GENERATING NOTES', 'READY'];

const noteContent = `# Database Management Systems

## 1. Normalization

Normalization is the process of organizing a relational database to reduce redundancy and improve data integrity.

**Goals:**
- Eliminate redundant data
- Ensure data dependencies make sense

---

## 2. Functional Dependencies

A **functional dependency** X → Y means that the value of attribute X uniquely determines the value of Y.

**Example:** StudentID → StudentName

---

## 3. First Normal Form (1NF)

A relation is in 1NF if:
- All attributes contain atomic (indivisible) values
- No repeating groups or arrays

---

## 4. Second Normal Form (2NF)

A relation is in 2NF if:
- It is in 1NF
- Every non-key attribute is fully functionally dependent on the entire primary key

---

## 5. Third Normal Form (3NF)

A relation is in 3NF if:
- It is in 2NF
- No non-key attribute is transitively dependent on the primary key

---

## 6. BCNF (Boyce-Codd Normal Form)

A stricter form of 3NF where every determinant must be a candidate key.`;

const keyTakeaways = [
  'Normalization reduces redundancy and anomalies in database design.',
  '1NF → 2NF → 3NF → BCNF represents increasing strictness of normalization.',
  'BCNF resolves all functional dependency anomalies unlike 3NF.',
  'Denormalization may be intentional for performance in read-heavy systems.',
];

const examPoints = [
  'Explain the difference between 2NF and 3NF with examples.',
  'When would you prefer BCNF over 3NF? What is the trade-off?',
  'Identify functional dependencies in a given schema.',
];

function PDFPreviewModal({ onClose, light }) {
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-2xl rounded-sm border shadow-2xl animate-fade-in-up overflow-hidden ${border}`}
        style={{ background: light ? '#fff' : '#1F150C', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* PDF header */}
        <div className={`px-8 py-5 border-b flex items-center gap-3 ${border}`} style={{ background: light ? '#F8F7F3' : '#0A0703' }}>
          <KnowledgeSignal size={20} animated light={light} />
          <div>
            <p className={`font-mono text-[9px] tracking-widest ${sub}`}>PREPMIND NOTES</p>
            <p className="text-xs font-body">Database Management Systems — Normalization</p>
          </div>
          <button onClick={onClose} className={`ml-auto text-xs opacity-40 hover:opacity-70 font-mono`}>✕</button>
        </div>
        <div className="px-8 py-6 space-y-6">
          <div>
            <p className={`font-mono text-[9px] tracking-widest mb-1 ${sub}`}>GENERATED FROM</p>
            <p className="text-xs font-body opacity-60">DBMS Notes.pdf · DBMS YouTube Lecture</p>
          </div>
          <div className="space-y-4">
            {['Normalization', 'Functional Dependencies', 'Normal Forms (1NF–BCNF)', 'Key Theorems'].map((sec, i) => (
              <div key={i}>
                <p className="font-display text-sm mb-2">§{i + 1} {sec}</p>
                <div className="space-y-1.5">
                  {Array.from({ length: i === 2 ? 4 : 2 }).map((_, j) => (
                    <div key={j} className="h-1.5 rounded-full"
                      style={{ background: light ? 'rgba(65,45,21,0.12)' : 'rgba(225,220,201,0.1)', width: j % 3 === 2 ? '55%' : '100%' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`px-8 py-4 border-t flex justify-between items-center ${border}`} style={{ background: light ? '#F8F7F3' : '#0A0703' }}>
          <p className={`text-[9px] font-mono ${sub}`}>9 pages · PrepMind Notes Export</p>
          <button className={`px-5 py-2 text-xs font-body rounded-sm ${light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'}`}>
            DOWNLOAD PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notes({ theme }) {
  const [generating, setGenerating] = useState(true);
  const [stage, setStage] = useState(0);
  const [notesType, setNotesType] = useState('detailed');
  const [showPDF, setShowPDF] = useState(false);
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  useEffect(() => {
    const interval = setInterval(() => {
      setStage(s => {
        if (s >= genStages.length - 1) { clearInterval(interval); setGenerating(false); return s; }
        return s + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  if (generating) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center" style={{ background: light ? '#F8F7F3' : '#000' }}>
        <div className="flex flex-col items-center gap-8">
          <KnowledgeSignal size={100} animated light={light} />
          <div className="text-center space-y-2">
            {genStages.map((s, i) => (
              <p key={i} className={`text-xs font-mono tracking-wide transition-all duration-500 ${i === stage ? 'opacity-100' : i < stage ? 'opacity-30' : 'opacity-10'}`}>
                {i < stage ? '✓ ' : i === stage ? '→ ' : '  '}{s}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14" style={{ background: light ? '#F8F7F3' : '#000' }}>
      {showPDF && <PDFPreviewModal onClose={() => setShowPDF(false)} light={light} />}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8 animate-fade-in-up">
          <div>
            <p className={`font-mono text-[10px] tracking-widest mb-1 ${sub}`}>NOTES</p>
            <h1 className="font-display text-3xl font-light mb-1">Database Management Systems</h1>
            <p className={`text-xs font-mono ${sub}`}>DBMS Notes.pdf · DBMS YouTube Lecture</p>
          </div>
          <div className="flex gap-2">
            {['quick', 'detailed', 'exam'].map(t => (
              <button key={t} onClick={() => setNotesType(t)}
                className={`px-3 py-1.5 text-[9px] font-mono tracking-wide rounded-sm transition-all ${
                  notesType === t
                    ? light ? 'bg-[#412D15] text-white' : 'bg-[#E1DCC9] text-black'
                    : `border ${border} opacity-40 hover:opacity-100`
                }`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className={`p-6 border rounded-sm ${border} animate-fade-in-up delay-100`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <div className="prose prose-sm max-w-none">
                {noteContent.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="font-display text-xl font-light mb-3">{line.slice(2)}</h1>;
                  if (line.startsWith('## ')) return <h2 key={i} className={`font-display text-sm font-normal mt-6 mb-2 ${muted}`}>{line.slice(3)}</h2>;
                  if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-mono text-[10px] tracking-wide mt-3 mb-1 opacity-70">{line.slice(2, -2)}</p>;
                  if (line.startsWith('- ')) return <p key={i} className={`text-xs font-body ml-3 mb-1 flex gap-2 ${muted}`}><span>·</span>{line.slice(2)}</p>;
                  if (line === '---') return <hr key={i} className={`my-4 border-0 border-t ${border}`} />;
                  if (line.trim() === '') return <div key={i} className="h-1" />;
                  return <p key={i} className="text-xs font-body leading-relaxed opacity-70 mb-1">{line}</p>;
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Key Takeaways */}
            <div className={`p-4 border rounded-sm animate-fade-in-up delay-200 ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>KEY TAKEAWAYS</p>
              <ul className="space-y-2">
                {keyTakeaways.map((t, i) => (
                  <li key={i} className={`text-[10px] font-body leading-relaxed flex gap-2 ${muted}`}>
                    <span className="flex-shrink-0 opacity-40">·</span>{t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Exam Points */}
            <div className={`p-4 border rounded-sm animate-fade-in-up delay-300 ${light ? 'border-[rgba(65,45,21,0.15)] bg-[rgba(65,45,21,0.04)]' : 'border-[rgba(225,220,201,0.12)] bg-[rgba(225,220,201,0.03)]'}`}>
              <p className={`font-mono text-[9px] tracking-widest mb-3 ${sub}`}>EXAM POINTS</p>
              <ul className="space-y-2">
                {examPoints.map((t, i) => (
                  <li key={i} className={`text-[10px] font-body leading-relaxed flex gap-2 ${muted}`}>
                    <span className="flex-shrink-0 font-mono opacity-40">0{i + 1}</span>{t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Source */}
            <div className={`p-4 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
              <p className={`font-mono text-[9px] tracking-widest mb-2 ${sub}`}>SOURCE</p>
              {['DBMS Notes.pdf', 'DBMS YouTube Lecture'].map((s, i) => (
                <p key={i} className={`text-[10px] font-body ${muted}`}>{s}</p>
              ))}
            </div>

            <button onClick={() => setShowPDF(true)}
              className={`w-full py-3 text-xs font-body tracking-wide rounded-sm transition-all ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
              DOWNLOAD AS PDF →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
