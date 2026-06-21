'use client';

import { ProjectionSystem } from '@/components/projection-system';
import { ProjectorManager } from '@/components/projector-manager';
import { ControlPanel } from '@/components/control-panel';
import { SurfaceManager } from '@/components/surface-manager';
import { EdgeBlendingControls } from '@/components/edge-blending-controls';
import { ModelImport } from '@/components/model-import';
import { Monitor } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const selectedProjectorIds = useAppStore((s) => s.selectedProjectorIds);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <Monitor className="mr-2 h-5 w-5 text-primary" />
        <h1 className="text-sm font-semibold tracking-tight">Projector Calculator</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {selectedProjectorIds.length > 0
            ? `${selectedProjectorIds.length} selected`
            : 'No selection'}
        </span>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* 3D Viewport */}
        <div className="relative flex-1">
          <ProjectionSystem />
          {/* Gradient overlay to blend sidebar edge */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent" />
        </div>

        {/* Sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card/50">
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
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
