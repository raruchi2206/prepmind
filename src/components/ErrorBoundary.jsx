import { Component } from "react";
import { Link } from "react-router-dom";

/**
 * Catches render errors so one failing component shows a recoverable message
 * instead of blanking the whole page.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[PrepMind] Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Navigating to another page clears the error
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="page-shell">
        <div className="page-inner flex min-h-[60vh] items-center justify-center">
          <div className="panel w-full max-w-lg p-8 text-center" role="alert">
            <p className="section-label">Something went wrong</p>
            <h1 className="mt-4 font-display text-3xl text-[var(--text-primary)]">
              This page couldn't be displayed
            </h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              An unexpected error stopped this page from rendering. Your data is safe. Try again,
              or go back to your dashboard.
            </p>
            <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-left font-mono text-[0.7rem] text-[var(--text-secondary)]">
              {String(this.state.error?.message || this.state.error).slice(0, 300)}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="btn btn-primary"
              >
                Try again
              </button>
              <Link to="/dashboard" className="btn btn-secondary" onClick={() => this.setState({ error: null })}>
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
