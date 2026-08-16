// src/components/common/ErrorBoundary.tsx
// Top-level crash guard. Catches render errors that would otherwise white-screen the
// app (e.g. a malformed scenario loaded from localStorage or an imported JSON bundle)
// and offers a way back instead of a blank page.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Unhandled error:', error, info.componentStack);
    }

    handleReload = () => {
        // Full reload rather than client-side navigation: the React tree that threw
        // may be left in a state hooks/context can't safely resume from.
        window.location.href = '/';
    };

    render() {
        if (!this.state.error) {
            return this.props.children;
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white border-2 border-red-200 rounded-lg shadow-sm p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
                    <h1 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h1>
                    <p className="text-sm text-gray-600 mb-4">
                        The app hit an unexpected error and can't continue safely. Your saved scenarios are
                        untouched — reloading will get you back to a working state.
                    </p>
                    <p className="text-xs font-mono text-gray-400 mb-5 break-words">{this.state.error.message}</p>
                    <button
                        onClick={this.handleReload}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reload App
                    </button>
                </div>
            </div>
        );
    }
}
