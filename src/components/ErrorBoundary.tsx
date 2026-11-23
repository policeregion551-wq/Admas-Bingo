import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unexpected error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#071f17] text-[#f4f1ea] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#0d2b20] border border-white/10 rounded-2xl p-8 space-y-5">
            <h1 className="text-2xl font-semibold text-[#f4f1ea]">
              የሲስተም ችግር አጋጥሟል · System Error
            </h1>
            <p className="text-sm text-[#cbd5d0] leading-relaxed">
              ይቅርታ፣ ያልተጠበቀ ችግር ተፈጥሯል። እባክዎ ገጹን እንደገና ይጫኑ።
            </p>
            <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-xs font-mono-num text-amber-200/90 break-words">
              {this.state.message}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#eab308] text-[#071f17] text-sm font-semibold hover:bg-[#facc15] transition-colors whitespace-nowrap"
            >
              ገጹን አድስ · Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
