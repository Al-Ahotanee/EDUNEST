import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  children: ReactNode;
  /** Optional: name of the section being wrapped (e.g. "Timetable", "Reports").
   *  Shown in the error UI so the user knows which feature crashed. */
  sectionName?: string;
  /** Optional: custom fallback render. Receives the error + a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global ErrorBoundary — prevents blank-screen crashes.
 *
 * Before this component existed, any uncaught render error (e.g. a missing
 * import like the Round 6 `FileText` bug) would silently unmount the entire
 * React tree, leaving the user staring at a blank white page with no error
 * message and no way to recover except manually editing the URL.
 *
 * This boundary catches the error at render time and shows a user-friendly
 * fallback UI with three actions:
 *   1. Try Again — re-mounts the component tree (clears the error state)
 *   2. Go Home — navigates to /app/dashboard (or /login if not authed)
 *   3. Report Bug — copies the error stack to clipboard so the user can
 *      paste it into a support ticket
 *
 * In development, the full error stack is shown inline so developers can
 * debug immediately. In production, only the message is shown.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console for devtools
    console.error('[ErrorBoundary] Render error caught:', error, errorInfo);

    // Persist to sessionStorage so a page refresh preserves the error
    // context (useful for debugging "it crashed but I refreshed and lost
    // the stack trace" scenarios).
    try {
      sessionStorage.setItem('edunest_last_error', JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        sectionName: this.props.sectionName || 'unknown',
        url: window.location.href,
      }));
    } catch {
      // sessionStorage might be unavailable (private mode) — fail silently
    }

    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  goHome = () => {
    this.reset();
    // Use full-page navigation so we definitely clear all React state
    const token = localStorage.getItem('edunest_access_token');
    window.location.href = token ? '/app/dashboard' : '/login';
  };

  copyErrorToClipboard = () => {
    if (!this.state.error) return;
    const errorReport = [
      `EduNest Error Report`,
      `==================`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Section: ${this.props.sectionName || 'unknown'}`,
      `Browser: ${navigator.userAgent}`,
      ``,
      `Error: ${this.state.error.message}`,
      ``,
      `Stack:`,
      this.state.error.stack || '(no stack)',
      ``,
      `Component Stack:`,
      this.state.errorInfo?.componentStack || '(no component stack)',
    ].join('\n');

    navigator.clipboard.writeText(errorReport).then(
      () => {
        toast.success('Error report copied to clipboard');
      },
      () => alert('Could not copy. Please screenshot this page instead.')
    );
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }

    const isDev = import.meta.env.DEV;
    const sectionLabel = this.props.sectionName ? ` — ${this.props.sectionName}` : '';
    const error = this.state.error;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
            {/* Header bar */}
            <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-5 text-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold tracking-tight">
                  Something went wrong{sectionLabel}
                </h1>
                <p className="text-sm text-white/80 mt-0.5">
                  An unexpected error occurred while rendering this page.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Error message */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
                  Error Message
                </p>
                <p className="text-sm text-rose-900 font-mono break-all">
                  {error?.message || 'Unknown error'}
                </p>
              </div>

              {/* Stack trace — only in development */}
              {isDev && error?.stack && (
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Stack Trace (dev only)
                  </p>
                  <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-x-auto max-h-48">
                    {error.stack}
                  </pre>
                </div>
              )}

              {isDev && this.state.errorInfo?.componentStack && (
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Component Stack (dev only)
                  </p>
                  <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-x-auto max-h-48">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={this.reset}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  <RefreshCw size={15} /> Try Again
                </button>
                <button
                  onClick={this.goHome}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
                >
                  <Home size={15} /> Go to Dashboard
                </button>
                <button
                  onClick={this.copyErrorToClipboard}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
                >
                  <Bug size={15} /> Copy Error Report
                </button>
              </div>

              <p className="text-xs text-slate-400 pt-2">
                Your data is safe. This error only affected the page you were viewing.
                Try Again will reload the section; Go to Dashboard will return you to a known-good page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
