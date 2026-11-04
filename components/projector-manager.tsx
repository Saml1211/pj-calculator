'use client';

import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Trash2, Plus, Link, Unlink } from 'lucide-react';

export function ProjectorManager() {
  const projectors = useAppStore((s) => s.projectors);
  const selectedProjectorIds = useAppStore((s) => s.selectedProjectorIds);
  const isLinkedMode = useAppStore((s) => s.isLinkedMode);
  const actions = useAppStore((s) => s.actions);

  const handleRowClick = (id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const next = selectedProjectorIds.includes(id)
        ? selectedProjectorIds.filter((pid) => pid !== id)
        : [...selectedProjectorIds, id];
      actions.setSelectedProjectorIds(next);
    } else {
      actions.setSelectedProjectorIds([id]);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Projectors</CardTitle>
        <div className="flex items-center gap-2">
          {isLinkedMode && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
              Linked Mode
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => actions.toggleLinkedMode()}
          >
            {isLinkedMode ? (
              <Link className="h-4 w-4" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {projectors.map((projector) => {
          const isSelected = selectedProjectorIds.includes(projector.id);
          return (
            <div
              key={projector.id}
              onClick={(e) => handleRowClick(projector.id, e)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors',
                isSelected ? 'bg-accent' : 'hover:bg-muted'
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: projector.color }}
              />
              <span className="flex-1 text-sm truncate">{projector.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.updateProjector(projector.id, {
                    isVisible: !projector.isVisible,
                  });
                }}
              >
                {projector.isVisible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.removeProjector(projector.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        <div className="pt-2 space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => actions.addProjector()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Projector
          </Button>
          <Button
            variant="secondary"
            className="w-full text-sm"
            onClick={() => actions.adaptProjectorsToSurface()}
          >
            Adapt to Surface
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
