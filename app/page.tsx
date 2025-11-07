'use client';

import { ProjectionSystem } from '@/components/projection-system';
import { ProjectorManager } from '@/components/projector-manager';
import { ControlPanel } from '@/components/control-panel';
import { SurfaceManager } from '@/components/surface-manager';
import { EdgeBlendingControls } from '@/components/edge-blending-controls';
import { ModelImport } from '@/components/model-import';

export default function Home() {
  console.log("Rendering Home component");
  return (
    <main className="flex h-screen bg-gray-800 text-white">
      <div className="flex-grow">
        <ProjectionSystem />
      </div>
      <div className="w-96 p-4 space-y-4 overflow-y-auto">
        <ProjectorManager />
        <ControlPanel />
        <SurfaceManager />
        <EdgeBlendingControls />
        <ModelImport />
      </div>
    </main>
  );
}