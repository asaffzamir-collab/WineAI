'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  errorTitle?: string;
  retryLabel?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CellarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Cellar error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-7 w-7 text-destructive" strokeWidth={1.5} />
          </div>
          <h3 className="text-heading text-foreground mb-1">
            {this.props.errorTitle || 'Something went wrong'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {this.props.fallbackMessage || 'An error occurred. Please try again.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            {this.props.retryLabel || 'Try again'}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
