import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KnowledgeSignal } from '../components/KnowledgeSignal';

function AuthShell({ theme, children }) {
  const light = theme === 'light';

  return (
    <div className="min-h-screen grid grid-cols-1 bg-[var(--background)] text-[var(--text-primary)] lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center" style={{ background: light ? '#F1EEE7' : '#1F150C' }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-80" style={{ background: light ? 'radial-gradient(circle at center, rgba(65,45,21,0.08), transparent 60%)' : 'radial-gradient(circle at center, rgba(225,220,201,0.08), transparent 60%)' }} />
        <div className="relative z-10 w-full max-w-md px-10 text-center">
          <div className="mb-8 flex justify-center">
            <KnowledgeSignal size={82} animated light={light} />
          </div>
          <p className="font-display text-[0.8rem] uppercase tracking-[0.22em] text-[var(--text-primary)]">PrepMind</p>
          <p className="mt-8 text-4xl leading-tight text-[var(--text-primary)]" style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-0.05em' }}>
            Your knowledge,<br />
            prepared intelligently.
          </p>
          <div className="mt-10 space-y-3 text-base text-[var(--text-secondary)]">
            {['Upload once. Prepare many ways.', 'Quizzes, notes, and viva — from one upload.', 'Track your preparation over time.'].map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-5 py-10 lg:px-10">
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <KnowledgeSignal size={24} animated light={light} />
          <span className="font-display text-sm uppercase tracking-[0.2em] text-[var(--text-primary)]">PrepMind</span>
        </div>
        <div className="w-full max-w-[500px]">
          {children}
        </div>
      </div>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, hint, theme }) {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  const light = theme === 'light';

  return (
    <div>
      <label className="mb-2 block text-[0.82rem] font-medium text-[var(--text-primary)]">{label}</label>
      <div className="relative">
        <input
          type={isPass && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border px-4 py-3.5 text-[0.96rem] text-[var(--text-primary)] placeholder:text-[#817A70] focus:border-[var(--primary)] focus:outline-none"
          style={{
            background: light ? '#F8F7F3' : '#14110D',
            borderColor: light ? '#D9D2C7' : '#3A342C',
          }}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}

export function Login({ theme }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <AuthShell theme={theme}>
      <div className="animate-fade-in-up">
        <p className="mb-2 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">Welcome back</p>
        <h1 className="mb-8 text-4xl leading-tight text-[var(--text-primary)] md:text-5xl" style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-0.05em' }}>Sign in</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <InputField label="Email or phone" type="email" value={email} onChange={setEmail} placeholder="you@example.com" theme={theme} />
          <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" theme={theme} />
          <div className="flex items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
              <div
                onClick={() => setRemember(!remember)}
                className="flex h-4 w-4 items-center justify-center rounded border transition-all"
                style={{
                  background: remember ? 'var(--primary)' : 'transparent',
                  borderColor: remember ? 'var(--primary)' : 'var(--border)',
                }}
              >
                {remember && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="black" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="btn btn-primary mt-2 h-[56px] w-full text-[0.78rem]">
            Log in <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--background)] px-3 text-[0.72rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">or</span>
          </div>
        </div>

        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 text-[0.96rem] text-[var(--text-primary)] hover:border-[var(--ring)] hover:bg-[var(--surface-elevated)]">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/><path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067C3.196 21.328 7.265 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z"/><path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21z"/><path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/></svg>
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-[var(--text-primary)] hover:underline">Create account</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function Signup({ theme }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const reqs = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];

  return (
    <AuthShell theme={theme}>
      <div className="animate-fade-in-up">
        <p className="mb-2 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">Get started</p>
        <h1 className="mb-8 text-4xl leading-tight text-[var(--text-primary)] md:text-5xl" style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-0.05em' }}>Create your account</h1>
        <form onSubmit={(e) => { e.preventDefault(); navigate('/dashboard'); }} className="space-y-4">
          <InputField label="Full name" type="text" value={name} onChange={setName} placeholder="Your name" theme={theme} />
          <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" theme={theme} />
          <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Create a password" theme={theme} />
          {password.length > 0 && (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              {reqs.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${r.ok ? 'bg-[#E1DCC9]' : 'bg-[rgba(225,220,201,0.25)]'}`} />
                  <p className={`text-xs ${r.ok ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{r.label}</p>
                </div>
              ))}
            </div>
          )}
          <InputField label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Confirm your password" theme={theme} />

          <button type="submit" className="btn btn-primary mt-2 h-[56px] w-full text-[0.78rem]">
            Create account <span aria-hidden="true">→</span>
          </button>
        </form>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 text-[0.96rem] text-[var(--text-primary)] hover:border-[var(--ring)] hover:bg-[var(--surface-elevated)]">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/><path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067C3.196 21.328 7.265 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z"/><path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21z"/><path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/></svg>
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--text-primary)] hover:underline">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function ForgotPassword({ theme }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <AuthShell theme={theme}>
      <div className="animate-fade-in-up">
        {!sent ? (
          <>
            <p className="mb-2 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">Account recovery</p>
            <h1 className="mb-4 text-4xl leading-tight text-[var(--text-primary)] md:text-5xl" style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-0.05em' }}>Reset your password</h1>
            <p className="mb-8 text-base text-[var(--text-secondary)]">Enter your email and we'll send you a secure reset link.</p>
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
              <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" theme={theme} />
              <button type="submit" className="btn btn-primary h-[56px] w-full text-[0.78rem]">
                Send reset link <span aria-hidden="true">→</span>
              </button>
            </form>
            <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
              <Link to="/login" className="hover:text-[var(--text-primary)]">← Back to login</Link>
            </p>
          </>
        ) : (
          <div className="text-center animate-fade-in-up">
            <div className="mb-6 flex justify-center">
              <KnowledgeSignal size={60} animated light={theme === 'light'} />
            </div>
            <p className="mb-2 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">Email sent</p>
            <h1 className="mb-4 text-4xl leading-tight text-[var(--text-primary)]" style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '-0.05em' }}>Check your email</h1>
            <p className="mb-8 text-base text-[var(--text-secondary)]">
              We've sent a password reset link to <strong className="text-[var(--text-primary)]">{email}</strong>.
            </p>
            <Link to="/login" className="btn btn-secondary h-[52px] px-6 text-[0.72rem]">
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
