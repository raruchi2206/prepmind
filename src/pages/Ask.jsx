import { useState, useRef, useEffect } from 'react';
import { KnowledgeSignal } from '../components/KnowledgeSignal';

const prompts = [
  'Explain 3NF with an example.',
  'Summarize chapter on indexing.',
  'What are the most important exam topics?',
  'Compare 2NF and 3NF.',
  'What did the video explain about indexing?',
];

const sampleAnswers = {
  default: {
    text: `**Third Normal Form (3NF)** states that a relation is in 3NF if:
1. It is in 2NF
2. No non-prime attribute is transitively dependent on the primary key

**Example:** Consider EMPLOYEE(EmpID, EmpName, DeptID, DeptName, DeptHead).

Here, EmpID → DeptID → DeptName creates a transitive dependency (DeptName depends on DeptID, not directly on EmpID). This violates 3NF.

**To normalize to 3NF:**
- EMPLOYEE(EmpID, EmpName, DeptID)
- DEPARTMENT(DeptID, DeptName, DeptHead)

Now every non-prime attribute depends directly on the primary key only.`,
    source: 'DBMS Notes.pdf',
    page: 'Pages 14–16',
    topic: 'Normalization',
    confidence: 0.94,
  },
};

function Message({ role, text, source, page, topic, confidence, light }) {
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className={`max-w-md px-4 py-3 rounded-sm border text-sm font-body ${border}`}
          style={{ background: light ? '#E1DCC9' : '#1F150C' }}>
          {text}
        </div>
      </div>
    );
  }

  const lines = text.split('\n');
  return (
    <div className="flex gap-3 mb-6">
      <div className="flex-shrink-0 mt-1">
        <KnowledgeSignal size={24} animated light={light} />
      </div>
      <div className="flex-1">
        <p className={`font-mono text-[9px] tracking-widest mb-2 ${sub}`}>PREPMIND</p>
        <div className={`p-4 border rounded-sm mb-3 ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
          <div className="text-sm font-body leading-relaxed space-y-2">
            {lines.map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-mono text-[10px] tracking-wide opacity-80">{line.slice(2,-2)}</p>;
              }
              if (line.match(/^\d\./)) {
                return <p key={i} className={`flex gap-2 ${muted}`}>
                  <span className="flex-shrink-0 font-mono text-[10px]">{line[0]}.</span>
                  <span>{line.slice(2)}</span>
                </p>;
              }
              if (line.startsWith('-')) {
                return <p key={i} className={`flex gap-2 ml-3 ${muted}`}>
                  <span>·</span><span>{line.slice(2)}</span>
                </p>;
              }
              if (line.trim() === '') return <div key={i} className="h-1" />;
              return <p key={i} className="opacity-80">{line}</p>;
            })}
          </div>
        </div>
        {source && (
          <div className={`flex flex-wrap gap-2 items-center text-[9px] font-mono ${sub}`}>
            <span className={`px-2 py-1 rounded-sm border ${border}`}>📄 {source}</span>
            {page && <span className={`px-2 py-1 rounded-sm border ${border}`}>{page}</span>}
            {topic && <span className={`px-2 py-1 rounded-sm border ${border}`}>{topic}</span>}
            {confidence && <span className="opacity-50">{Math.round(confidence * 100)}% confidence</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Ask({ theme }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const light = theme === 'light';
  const border = light ? 'border-[rgba(65,45,21,0.1)]' : 'border-[rgba(225,220,201,0.08)]';
  const muted = light ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(225,220,201,0.4)]';
  const sub = light ? 'text-[rgba(0,0,0,0.25)]' : 'text-[rgba(225,220,201,0.25)]';

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (text = input) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      const ans = sampleAnswers.default;
      setMessages(prev => [...prev, { role: 'assistant', ...ans }]);
      setLoading(false);
    }, 1500);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="min-h-screen pt-14 flex flex-col" style={{ background: light ? '#F8F7F3' : '#000' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.08)' }}>
        <KnowledgeSignal size={20} animated light={light} />
        <div>
          <p className="font-display text-sm font-light">ASK PREPMIND</p>
          <p className={`text-[9px] font-mono ${sub}`}>Ask anything about your selected knowledge</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {['DBMS Notes.pdf', 'DBMS YouTube'].map((s, i) => (
            <span key={i} className={`text-[9px] font-mono px-2 py-1 rounded-sm border ${border}`}>{s}</span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-64 gap-8">
              <KnowledgeSignal size={80} animated light={light} />
              <div className="text-center">
                <p className="font-display text-2xl font-light mb-2">Ask about your knowledge</p>
                <p className={`text-xs font-body ${muted}`}>Get cited, source-backed answers from your uploaded material.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {prompts.map((p, i) => (
                  <button key={i} onClick={() => handleSend(p)}
                    className={`text-[10px] font-body px-3 py-1.5 border rounded-sm transition-all ${border} ${light ? 'hover:bg-[#E1DCC9]' : 'hover:bg-[#1F150C]'} opacity-60 hover:opacity-100`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message key={i} {...msg} light={light} />
          ))}

          {loading && (
            <div className="flex gap-3 mb-6">
              <KnowledgeSignal size={24} animated light={light} />
              <div className={`p-4 border rounded-sm ${border}`} style={{ background: light ? '#fff' : '#0A0703' }}>
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: light ? '#412D15' : '#E1DCC9', animation: `dots 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t" style={{ borderColor: light ? 'rgba(65,45,21,0.1)' : 'rgba(225,220,201,0.08)' }}>
        <div className="max-w-3xl mx-auto">
          {!isEmpty && (
            <div className="flex flex-wrap gap-2 mb-3">
              {prompts.slice(0, 3).map((p, i) => (
                <button key={i} onClick={() => handleSend(p)}
                  className={`text-[9px] font-body px-2.5 py-1 border rounded-sm transition-all ${border} opacity-40 hover:opacity-70`}>
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask PrepMind anything..."
              className={`flex-1 bg-transparent border rounded-sm px-4 py-3 text-sm font-body focus:outline-none transition-colors ${border}`}
              style={{ '--tw-placeholder-opacity': 0.3 }}
            />
            <button onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`px-5 py-3 text-xs font-body rounded-sm transition-all disabled:opacity-30 ${light ? 'bg-[#412D15] text-white hover:bg-[#1F150C]' : 'bg-[#E1DCC9] text-black hover:bg-white'}`}>
              ASK →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
