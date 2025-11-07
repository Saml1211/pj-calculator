'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Trash2, Plus, Link, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProjectorManager() {
  const projectors = useAppStore((state) => state.projectors);
  const selectedProjectorIds = useAppStore((state) => state.selectedProjectorIds);
  const isLinkedMode = useAppStore((state) => state.isLinkedMode);
  const { addProjector, removeProjector, updateProjector, setSelectedProjectorIds, toggleLinkedMode, adaptProjectorsToSurface } = useAppStore((state) => state.actions);

  const handleSelect = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedProjectorIds(selectedProjectorIds.includes(id) ? selectedProjectorIds.filter(pid => pid !== id) : [...selectedProjectorIds, id]);
    } else {
      setSelectedProjectorIds([id]);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Projector Manager</CardTitle>
        <Button variant="ghost" size="icon" onClick={toggleLinkedMode}>
          {isLinkedMode ? <Link className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2">
          {projectors.map((projector) => (
            <Card
              key={projector.id}
              onClick={(e) => handleSelect(e, projector.id)}
              className={cn(
                'cursor-pointer',
                selectedProjectorIds.includes(projector.id) && 'bg-slate-700'
              )}
            >
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: projector.color }} />
                  <span>{projector.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateProjector(projector.id, { isVisible: !projector.isVisible });
                    }}
                  >
                    {projector.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProjector(projector.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button onClick={addProjector} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Add Projector
        </Button>
        <Button onClick={adaptProjectorsToSurface} className="w-full">
          Adapt to Curved Screen
        </Button>
      </CardContent>
    </Card>
  );
}
