import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeSignal } from '../components/KnowledgeSignal';

function HeroSignal() {
  const sources = ['PDF', 'PPT', 'DOCX', 'YouTube'];
  const outputs = ['SUMMARY', 'NOTES', 'QUIZ', 'PAPER', 'VIVA'];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 480, height: 480 }}>
      {/* Central signal */}
      <div className="absolute inset-0 flex items-center justify-center">
        <KnowledgeSignal size={240} animated />
      </div>
      {/* Input sources orbiting in */}
      {sources.map((s, i) => {
        const angle = (i / sources.length) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const r = 190;
        const x = 240 + r * Math.cos(rad);
        const y = 240 + r * Math.sin(rad);
        return (
          <div
            key={s}
            className="absolute font-mono text-[10px] tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            style={{
              left: x - 20,
              top: y - 10,
              animation: `pulse-ring ${3 + i * 0.5}s ease-in-out infinite ${i * 0.4}s`,
            }}
          >
            {s}
          </div>
        );
      })}
      {/* Output labels */}
      {outputs.map((o, i) => {
        const angle = (i / outputs.length) * 360 + 15;
        const rad = (angle * Math.PI) / 180;
        const r = 145;
        const x = 240 + r * Math.cos(rad);
        const y = 240 + r * Math.sin(rad);
        return (
          <div
            key={o}
            className="absolute font-mono text-[9px] tracking-widest"
            style={{
              left: x - 22,
              top: y - 8,
              color: '#E1DCC9',
              opacity: 0.7,
              animation: `fade-in 0.5s ease forwards ${1 + i * 0.2}s`,
            }}
          >
            {o}
          </div>
        );
      })}
    </div>
  );
}

function ScrollReveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const [ytUrl, setYtUrl] = useState('');
  const divider = 'border-t border-[rgba(225,220,201,0.08)]';

  return (
    <div className="min-h-screen bg-black text-[#F7F3E8]">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-[72px] border-b border-[rgba(225,220,201,0.08)]" style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          <KnowledgeSignal size={20} animated />
          <span className="font-display font-semibold tracking-[0.16em] text-[0.8rem] uppercase">PrepMind</span>
        </div>
        <div className="flex items-center gap-5 lg:gap-7">
          <a href="#how" className="nav-link text-[#F7F3E8] hidden sm:inline-flex">How it works</a>
          <a href="#features" className="nav-link text-[#F7F3E8] hidden sm:inline-flex">Features</a>
          <Link to="/login" className="nav-link text-[#F7F3E8]">Sign in</Link>
          <Link to="/signup" className="nav-cta">
            Get started <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-12 px-6 pb-16 pt-24 lg:flex-row lg:gap-16">
        <div className="w-full max-w-[560px] animate-fade-in-up">
          <p className="hero-kicker">AI learning platform</p>
          <h1 className="hero-title mt-5">
            Turn your knowledge<br />
            into intelligent<br />
            preparation.
          </h1>
          <p className="hero-subline mt-5">One knowledge base. Many ways to prepare.</p>
          <p className="hero-description mt-6">
            Upload your study material or educational videos and let PrepMind turn them into summaries, notes, quizzes, practice papers and AI-powered viva sessions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="btn btn-primary h-[52px] px-6 text-[0.78rem]">
              Start preparing <span aria-hidden="true">→</span>
            </Link>
            <a href="#how" className="btn btn-secondary h-[52px] px-6 text-[0.78rem]">
              See how it works <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <div className="w-full max-w-[470px] animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <HeroSignal />
        </div>
      </section>

      <section id="how" className={`px-6 py-20 ${divider}`}>
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="hero-kicker">How PrepMind works</p>
            <h2 className="mt-4 text-4xl leading-tight text-[#F7F3E8] md:text-5xl" style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-0.05em' }}>
              One knowledge base.<br />
              <span className="text-[#B8B0A3]">Multiple ways to prepare.</span>
            </h2>
          </ScrollReveal>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ScrollReveal delay={100}>
              <div>
                <p className="kicker">Input</p>
                <div className="mt-4 space-y-3">
                  {[
                    { icon: '⌁', label: 'PDF Documents', sub: 'Textbooks, lecture notes, papers' },
                    { icon: '▣', label: 'Presentations', sub: 'PPTX, slides, visual material' },
                    { icon: '▤', label: 'Documents', sub: 'DOCX, notes, essays' },
                    { icon: '▶', label: 'YouTube videos', sub: 'Educational lectures, tutorials' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-2xl border border-[rgba(225,220,201,0.10)] bg-[rgba(255,255,255,0.02)] p-3.5">
                      <span className="mt-0.5 font-mono text-base text-[#E1DCC9]">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[0.98rem] text-[#F7F3E8]">{item.label}</p>
                        <p className="mt-1 text-sm text-[#B8B0A3]">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[28px] border border-[rgba(225,220,201,0.10)] bg-[rgba(255,255,255,0.02)] px-4 py-8">
                <p className="kicker">PrepMind AI</p>
                <KnowledgeSignal size={150} animated />
                <p className="text-center text-sm text-[#B8B0A3]">Understands. Extracts.<br />Builds your knowledge base.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div>
                <p className="kicker">Create</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Summary', sub: 'Concise overview of the key ideas' },
                    { label: 'Notes', sub: 'Structured revision material' },
                    { label: 'Quiz', sub: 'Check recall and understanding' },
                    { label: 'Practice paper', sub: 'Exam-style preparation' },
                    { label: 'Viva', sub: 'Oral concept practice' },
                    { label: 'Ask', sub: 'Get grounded answers' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(225,220,201,0.10)] bg-[rgba(255,255,255,0.02)] p-3.5">
                      <div>
                        <p className="text-[0.76rem] font-medium uppercase tracking-[0.16em] text-[#F7F3E8]">{item.label}</p>
                        <p className="mt-1 text-sm text-[#B8B0A3]">{item.sub}</p>
                      </div>
                      <span className="text-lg text-[#B8B0A3]">→</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className={`px-6 py-20 ${divider}`} style={{ background: '#0A0703' }}>
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <ScrollReveal>
            <div>
              <p className="hero-kicker">YouTube integration</p>
              <h2 className="mt-4 text-4xl leading-tight text-[#F7F3E8] md:text-5xl" style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-0.05em' }}>
                Learn from videos.<br />
                <span className="text-[#B8B0A3]">Not just documents.</span>
              </h2>
              <p className="mt-6 max-w-[520px] text-lg leading-7 text-[#B8B0A3]">
                Turn educational videos into structured study material. PrepMind extracts the transcript, identifies key topics, and builds a rich knowledge base — ready for summaries, notes, quizzes, and viva sessions.
              </p>
              <div className="mt-8 rounded-2xl border border-[rgba(225,220,201,0.10)] bg-[rgba(225,220,201,0.03)] p-4">
                <p className="kicker">YouTube URL</p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={ytUrl}
                    onChange={e => setYtUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 rounded-xl border border-[rgba(225,220,201,0.12)] bg-transparent px-3 py-3 text-sm text-[#F7F3E8] placeholder:text-[#817A70] focus:border-[#E1DCC9] focus:outline-none"
                  />
                  <Link to="/signup" className="btn btn-primary h-[52px] px-4 text-[0.72rem]">
                    Analyze <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="space-y-3">
              {[
                { step: '01', label: 'Video', sub: 'Educational lecture, tutorial' },
                { step: '02', label: 'Transcript', sub: 'Captions extracted and refined' },
                { step: '03', label: 'Knowledge', sub: 'Topics and concepts organized' },
                { step: '04', label: 'Preparation', sub: 'Summary, notes, quiz, viva' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl border border-[rgba(225,220,201,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                  <span className="w-6 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[#8E877C]">{item.step}</span>
                  <div className="h-8 w-px bg-[rgba(225,220,201,0.12)]" />
                  <div className="flex-1">
                    <p className="text-[0.76rem] font-medium uppercase tracking-[0.16em] text-[#F7F3E8]">{item.label}</p>
                    <p className="mt-1 text-sm text-[#B8B0A3]">{item.sub}</p>
                  </div>
                  {i < 3 && <span className="text-lg text-[#8E877C]">↓</span>}
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Notes to PDF */}
      <section className={`py-24 px-8 ${divider}`}>
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="font-mono text-[10px] tracking-widest opacity-30 mb-4">STUDY NOTES</p>
                <h2 className="font-display text-4xl font-light leading-tight mb-6">
                  From lecture<br/>
                  to revision notes.
                </h2>
                <p className="text-sm opacity-50 leading-relaxed mb-8 font-body">
                  PrepMind reads your material, extracts what matters, and generates beautifully structured notes ready to download as PDF.
                </p>
                <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-[#E1DCC9] text-black text-xs font-body rounded-sm hover:bg-white transition-all group">
                  CREATE NOTES
                  <span className="group-hover:translate-x-1 inline-block transition-transform">→</span>
                </Link>
              </div>
              {/* PDF Preview mock */}
              <div className="border border-[rgba(225,220,201,0.1)] rounded-sm overflow-hidden"
                style={{ background: '#1A1108' }}>
                <div className="px-6 py-4 border-b border-[rgba(225,220,201,0.08)] flex items-center gap-3">
                  <KnowledgeSignal size={18} animated />
                  <div>
                    <p className="text-[10px] font-mono tracking-widest opacity-40">PREPMIND NOTES</p>
                    <p className="text-xs font-body opacity-70">Database Management Systems</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { title: 'Normalization', lines: 3 },
                    { title: 'Functional Dependencies', lines: 2 },
                    { title: 'Normal Forms', lines: 4 },
                  ].map((sec, i) => (
                    <div key={i}>
                      <p className="font-display text-sm mb-2">§{i + 1} {sec.title}</p>
                      {Array.from({ length: sec.lines }).map((_, j) => (
                        <div key={j} className="h-1.5 rounded-full mb-1.5"
                          style={{ background: 'rgba(225,220,201,0.12)', width: j === sec.lines - 1 ? '60%' : '100%' }} />
                      ))}
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[rgba(225,220,201,0.08)]">
                    <p className="text-[10px] font-mono opacity-30">GENERATED FROM: DBMS Notes.pdf + YouTube Lecture</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`py-24 px-8 ${divider}`} style={{ background: '#070503' }}>
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <p className="font-mono text-[10px] tracking-widest opacity-30 mb-4">WHAT PREPMIND CAN DO</p>
            <h2 className="font-display text-4xl font-light mb-16">One platform. Every mode of preparation.</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-[rgba(225,220,201,0.06)]" style={{ background: 'rgba(225,220,201,0.06)' }}>
            {[
              { label: 'SUMMARY', desc: 'Short, detailed or exam-focused distillation of any material.', icon: '∑' },
              { label: 'NOTES', desc: 'Structured revision notes with key definitions and exam points.', icon: '≡' },
              { label: 'QUIZ', desc: 'MCQ, multi-select, adaptive difficulty — tested and evaluated.', icon: '?' },
              { label: 'PRACTICE PAPER', desc: 'Full practice papers with sections, marks and AI evaluation.', icon: '◻' },
              { label: 'VIVA', desc: 'AI-driven oral examination with transcript and scoring.', icon: '◈' },
              { label: 'ASK PREPMIND', desc: 'Query your knowledge base, get answers with source citations.', icon: '⌁' },
            ].map((f, i) => (
              <ScrollReveal key={i} delay={i * 80}>
                <div className="p-8 hover:bg-[rgba(225,220,201,0.03)] transition-all group cursor-default" style={{ background: '#000' }}>
                  <span className="font-mono text-2xl opacity-30 group-hover:opacity-60 transition-opacity block mb-4">{f.icon}</span>
                  <p className="font-mono text-xs tracking-widest mb-2">{f.label}</p>
                  <p className="text-xs opacity-40 leading-relaxed font-body">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={`py-32 px-8 ${divider} relative overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <KnowledgeSignal size={600} animated />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="font-display text-5xl lg:text-7xl font-light leading-tight mb-8">
              Your material.<br/>
              Your knowledge.<br/>
              <em className="opacity-50 not-italic">Your preparation.</em>
            </h2>
            <Link to="/signup"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#E1DCC9] text-black text-sm font-body tracking-wide rounded-sm hover:bg-white transition-all group">
              START PREPARING
              <span className="group-hover:translate-x-1 inline-block transition-transform">→</span>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-8 ${divider}`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KnowledgeSignal size={16} animated />
            <span className="font-display text-xs opacity-40">PREPMIND</span>
          </div>
          <p className="text-[10px] opacity-20 font-mono">Turn your knowledge into intelligent preparation.</p>
        </div>
      </footer>
    </div>
  );
}
