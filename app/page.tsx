'use client';

import { ProjectionSystem } from '@/components/projection-system';
import { ProjectorManager } from '@/components/projector-manager';
import { ControlPanel } from '@/components/control-panel';
import { SurfaceManager } from '@/components/surface-manager';
import { EdgeBlendingControls } from '@/components/edge-blending-controls';
import { ModelImport } from '@/components/model-import';
import { SceneErrorBoundary } from '@/components/scene-error-boundary';
import { SceneActions } from '@/components/scene-actions';
import { Button } from '@/components/ui/button';
import { Monitor, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const selectedProjectorIds = useAppStore((s) => s.selectedProjectorIds);
  const customModelUrl = useAppStore((s) => s.customModelUrl);
  const actions = useAppStore((s) => s.actions);

  const handleResetScene = () => {
    // Clear the most common error source (a failed custom model). Persisted
    // projector/surface config is intentionally kept.
    actions.setCustomModelUrl(null);
  };

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center gap-y-1 border-b border-border px-4 py-2 md:h-12 md:flex-nowrap md:py-0">
        <Monitor className="mr-2 h-5 w-5 text-primary" />
        <h1 className="whitespace-nowrap text-sm font-semibold tracking-tight">Projector Calculator</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {selectedProjectorIds.length > 0
            ? `${selectedProjectorIds.length} selected`
            : 'No selection'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-3 h-7 px-2 text-xs"
          onClick={handleResetScene}
          title="Clear imported model and recover the scene"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset scene
        </Button>
        <SceneActions />
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:flex-row md:overflow-hidden">
        {/* 3D Viewport */}
        <div className="relative h-[55vh] shrink-0 md:h-auto md:flex-1 md:shrink">
          <SceneErrorBoundary onReset={handleResetScene} resetKey={customModelUrl}>
            <ProjectionSystem />
          </SceneErrorBoundary>
          {/* Gradient overlay to blend sidebar edge */}
          <div className="pointer-events-none absolute right-0 hidden md:block top-0 h-full w-8 bg-gradient-to-l from-background to-transparent" />
        </div>

        {/* Sidebar */}
        <aside className="flex w-full flex-col border-t border-border bg-card/50 md:w-80 md:shrink-0 md:border-l md:border-t-0">
          <div className="space-y-3 p-3 md:flex-1 md:overflow-y-auto">
            <ProjectorManager />
            <ControlPanel />
            <SurfaceManager />
            <EdgeBlendingControls />
            <ModelImport />
          </div>
        </aside>
      </div>
    </div>
  );
}
