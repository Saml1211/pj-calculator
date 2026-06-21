'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
  /** Called when the user clicks "Reset scene" — should clear transient state
   *  (e.g. a failed custom model) so the next render can succeed. */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Catches render-time errors thrown inside the 3D Canvas (e.g. a malformed
 * GLB failing to parse) so a single bad asset doesn't blank the whole app.
 */
export class SceneErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    logger.error('Scene render error', {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium">The 3D scene failed to render</p>
            {this.state.message ? (
              <p className="max-w-md text-xs text-muted-foreground break-words">
                {this.state.message}
              </p>
            ) : null}
          </div>
          <Button size="sm" onClick={this.handleReset}>
            Reset scene
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
