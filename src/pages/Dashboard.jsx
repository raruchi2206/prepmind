import { Link } from 'react-router-dom';
import { KnowledgeSignal } from '../components/KnowledgeSignal';

const recentActivity = [
  { title: 'DBMS Quiz', type: 'QUIZ', score: 84, time: 'Today', path: '/history' },
  { title: 'Normalization Notes', type: 'NOTES', score: null, time: 'Yesterday', sub: 'Generated PDF', path: '/history' },
  { title: 'DBMS Viva', type: 'VIVA', score: 82, time: '2 days ago', path: '/history' },
];

const capabilities = [
  { label: 'SUMMARY', sub: 'Turn material into a concise summary.', icon: '∑', path: '/create?mode=summary' },
  { label: 'NOTES', sub: 'Create structured revision notes.', icon: '≡', path: '/create?mode=notes' },
  { label: 'QUIZ', sub: 'Test your understanding.', icon: '?', path: '/create?mode=quiz' },
  { label: 'PRACTICE PAPER', sub: 'Generate a complete practice paper.', icon: '◻', path: '/create?mode=paper' },
  { label: 'VIVA', sub: 'Practice an oral examination.', icon: '◈', path: '/create?mode=viva' },
  { label: 'ASK', sub: 'Ask anything about your knowledge.', icon: '⌁', path: '/ask' },
];

const knowledge = [
  { title: 'DBMS Notes', type: 'PDF', meta: '42 pages · 8 topics', tone: 'Ready' },
  { title: 'AI/ML Lecture', type: 'YouTube', meta: '38:42 · 6 topics', tone: 'Ready' },
  { title: 'Operating Systems', type: 'PPTX', meta: '56 slides · 10 topics', tone: 'Ready' },
];

const progress = [
  { label: 'Normalization', value: 82 },
  { label: 'Transactions', value: 64 },
  { label: 'Indexes', value: 78 },
  { label: 'SQL', value: 71 },
];

export default function Dashboard({ theme }) {
  const light = theme === 'light';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page-shell" style={{ background: light ? '#F8F7F3' : '#000000' }}>
      <div className="page-inner">
        <header className="mb-6 animate-fade-in-up">
          <p className="section-label">Dashboard</p>
          <h1 className="page-title mt-4">{greeting}, Ruchi.</h1>
          <p className="page-subtitle mt-3">What do you want to prepare today?</p>
        </header>

        <section className="panel mb-6 p-5 sm:p-6 animate-fade-in-up" style={{ background: light ? '#fffdf9' : 'var(--surface)' }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label">Your knowledge is ready</p>
              <h2 className="mt-3 text-3xl leading-tight text-[var(--text-primary)]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Create from your knowledge.</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">12 documents · 3 videos · 48 topics</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/create" className="btn btn-primary">Create →</Link>
              <Link to="/knowledge" className="btn btn-secondary">Add knowledge</Link>
            </div>
          </div>
        </section>

        <section className="panel mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up delay-100" style={{ background: light ? 'rgba(65,45,21,0.04)' : 'rgba(225,220,201,0.04)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <KnowledgeSignal size={26} animated light={light} />
            <div className="min-w-0">
              <p className="section-label">PrepMind recommendation</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Your recent quizzes suggest <strong className="text-[var(--text-primary)]">Transactions</strong> needs more practice.
              </p>
            </div>
          </div>
          <Link to="/create?mode=quiz&topic=transactions" className="btn btn-secondary btn-sm whitespace-nowrap">Practice this topic →</Link>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
          <div className="space-y-6 animate-fade-in-up delay-200">
            <section className="panel p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="section-label">Your knowledge</p>
                <Link to="/knowledge" className="text-[0.62rem] uppercase tracking-[0.15em] text-[var(--text-secondary)]">View all →</Link>
              </div>

              <div className="space-y-3">
                {knowledge.map((item) => (
                  <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{item.title}</span>
                        <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.type}</span>
                      </div>
                      <p className="mt-2 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.meta}</p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="rounded-full border border-[var(--border)] px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.tone}</span>
                      <Link to="/knowledge" className="btn btn-ghost btn-sm">View</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="section-label">Continue preparing</p>
                <Link to="/history" className="text-[0.62rem] uppercase tracking-[0.15em] text-[var(--text-secondary)]">History →</Link>
              </div>

              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <Link key={item.title} to={item.path} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 transition-colors hover:bg-[var(--surface-muted)]">
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{item.title}</p>
                      <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.type} · {item.time}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.score ? <span className="font-display text-xl text-[var(--text-primary)]">{item.score}%</span> : <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">PDF</span>}
                      <span className="text-base text-[var(--text-secondary)]">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 animate-fade-in-up delay-300">
            <section className="panel p-4 sm:p-5">
              <p className="section-label">Your progress</p>
              <div className="mt-4 space-y-4">
                {progress.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
                      <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/progress" className="btn btn-secondary mt-5 w-full">View progress</Link>
            </section>

            <section className="panel p-4 sm:p-5">
              <p className="section-label">What you can do</p>
              <div className="mt-4 space-y-2">
                {capabilities.map((cap) => (
                  <Link key={cap.label} to={cap.path} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 transition-colors hover:bg-[var(--surface-muted)]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-muted)] font-mono text-base text-[var(--text-secondary)]">{cap.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{cap.label}</p>
                      <p className="mt-1 text-sm text-[var(--text-primary)]">{cap.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
