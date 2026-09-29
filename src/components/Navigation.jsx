import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { KnowledgeSignal } from './KnowledgeSignal';

const USER = { name: 'Ruchi Navinchandra', initials: 'RN' };

function BellIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" /></svg>;
}

export function Navigation({ theme, onThemeToggle }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const light = theme === 'light';
  const links = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Knowledge', path: '/knowledge' },
    { label: 'History', path: '/history' },
    { label: 'Progress', path: '/progress' },
  ];

  return <nav className="nav-shell fixed left-0 right-0 top-0 z-50 border-b" style={{ background: light ? 'rgba(248,247,243,0.9)' : 'rgba(13,10,8,0.9)', borderColor: 'var(--border)', backdropFilter: 'blur(18px)' }}>
    <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
      <Link to="/dashboard" className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}><KnowledgeSignal size={18} light={light} animated /></div><span className="font-display text-sm tracking-[0.18em] uppercase">PrepMind</span></Link>
      <div className="hidden items-center gap-2 md:flex">{links.map((link) => <Link key={link.path} to={link.path} className="nav-link" style={{ background: location.pathname.startsWith(link.path) ? 'var(--accent)' : 'transparent', color: location.pathname.startsWith(link.path) ? 'var(--accent-foreground)' : 'var(--text-primary)' }}>{link.label}</Link>)}</div>
      <div className="flex items-center gap-2">
        <button onClick={onThemeToggle} className="icon-button" aria-label="Toggle theme">{light ? <SunIcon /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>}</button>
        <div className="relative hidden sm:block"><button type="button" onClick={() => setNotifOpen((open) => !open)} className="icon-button relative" aria-label="Open notifications"><BellIcon /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" /></button>{notifOpen && <div className="absolute right-0 top-12 w-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl" style={{ boxShadow: 'var(--shadow-soft)' }}><p className="px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Notifications</p>{[{ label: 'DBMS Quiz completed — 84%', time: '2m ago' }, { label: 'Notes exported as PDF', time: '1h ago' }, { label: 'New knowledge ready: OS Lecture', time: 'Yesterday' }].map((item) => <div key={item.label} className="rounded-xl px-3 py-2.5 hover:bg-[var(--surface-elevated)]"><p className="text-sm text-[var(--text-primary)]">{item.label}</p><p className="mt-1 font-mono text-[0.6rem] text-[var(--text-secondary)]">{item.time}</p></div>)}</div>}</div>
        <Link to="/create" className="nav-cta hidden sm:inline-flex">Create →</Link>
        <Link to="/profile" className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-left transition-colors hover:border-[var(--ring)]" aria-label="Open profile"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent)] text-[0.72rem] font-semibold text-[var(--accent-foreground)]">{USER.initials}</span><span className="hidden text-[0.92rem] font-medium text-[var(--text-primary)] xl:inline-block">{USER.name.split(' ')[0]}</span><span className="hidden text-[var(--text-secondary)] sm:block">↗</span></Link>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="icon-button md:hidden" aria-label="Toggle menu"><span className="flex flex-col gap-1.5"><span className="block h-px w-4 bg-current" /><span className="block h-px w-4 bg-current" /><span className="block h-px w-4 bg-current" /></span></button>
      </div>
    </div>
    {menuOpen && <div className="border-t border-[var(--border)] bg-[var(--background)] md:hidden">{links.map((link) => <Link key={link.path} to={link.path} onClick={() => setMenuOpen(false)} className="block border-b border-[var(--border)] px-5 py-3 text-[0.82rem] font-medium text-[var(--text-primary)]">{link.label}</Link>)}<Link to="/create" onClick={() => setMenuOpen(false)} className="block border-b border-[var(--border)] px-5 py-3 text-[0.82rem] font-medium text-[var(--text-primary)]">Create →</Link><Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-5 py-3 text-[0.82rem] font-medium text-[var(--text-primary)]">Profile</Link></div>}
  </nav>;
}
