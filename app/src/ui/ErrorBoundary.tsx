import { Component, type ReactNode } from "react";

/** Keeps one broken view from blanking the whole app; the error shows in its block. */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: string | null; key: string }> {
  state = { error: null as string | null, key: this.props.resetKey };

  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }

  static getDerivedStateFromProps(p: { resetKey: string }, s: { key: string }) {
    return p.resetKey !== s.key ? { error: null, key: p.resetKey } : null;
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <p className="empty">This view couldn't render: {this.state.error}. Ask again, or pick a question from the ask box.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
