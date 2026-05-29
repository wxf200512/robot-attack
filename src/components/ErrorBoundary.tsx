import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('捕获到 React 渲染错误:', error, info);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-600">
          <h2 className="text-lg font-bold mb-2">页面出错了 😢</h2>
          <p>请刷新页面或稍后再试。</p>
        </div>
      );
    }
    return this.props.children;
  }
}
