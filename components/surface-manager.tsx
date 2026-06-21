'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SurfaceType } from '@/lib/types';

export function SurfaceManager() {
  const surfaceConfig = useAppStore((s) => s.surfaceConfig);
  const actions = useAppStore((s) => s.actions);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Surface</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Surface Type</Label>
          <Select
            value={surfaceConfig.type}
            onValueChange={(v) =>
              actions.setSurfaceConfig({ type: v as SurfaceType })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Flat">Flat</SelectItem>
              <SelectItem value="Cylindrical">Cylindrical</SelectItem>
              <SelectItem value="Spherical">Spherical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Width</Label>
            <span className="text-xs text-muted-foreground">
              {surfaceConfig.width.toFixed(1)} m
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              value={[surfaceConfig.width]}
              min={1}
              max={50}
              step={0.5}
              onValueChange={([v]) => actions.setSurfaceConfig({ width: v })}
              className="flex-1"
            />
            <Input
              type="number"
              value={surfaceConfig.width}
              min={1}
              max={50}
              step={0.5}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) actions.setSurfaceConfig({ width: v });
              }}
              className="w-20 h-8 text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Height</Label>
            <span className="text-xs text-muted-foreground">
              {surfaceConfig.height.toFixed(1)} m
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              value={[surfaceConfig.height]}
              min={1}
              max={50}
              step={0.5}
              onValueChange={([v]) => actions.setSurfaceConfig({ height: v })}
              className="flex-1"
            />
            <Input
              type="number"
              value={surfaceConfig.height}
              min={1}
              max={50}
              step={0.5}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) actions.setSurfaceConfig({ height: v });
              }}
              className="w-20 h-8 text-xs"
            />
          </div>
        </div>

        {surfaceConfig.type !== 'Flat' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Curvature</Label>
              <span className="text-xs text-muted-foreground">
                {surfaceConfig.curvature.toFixed(3)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Slider
                value={[surfaceConfig.curvature]}
                min={0.001}
                max={1}
                step={0.001}
                onValueChange={([v]) =>
                  actions.setSurfaceConfig({ curvature: v })
                }
                className="flex-1"
              />
              <Input
                type="number"
                value={surfaceConfig.curvature}
                min={0.001}
                max={1}
                step={0.001}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) actions.setSurfaceConfig({ curvature: v });
                }}
                className="w-20 h-8 text-xs"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Segments</Label>
            <span className="text-xs text-muted-foreground">
              {surfaceConfig.segments}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              value={[surfaceConfig.segments]}
              min={4}
              max={128}
              step={1}
              onValueChange={([v]) =>
                actions.setSurfaceConfig({ segments: v })
              }
              className="flex-1"
            />
            <Input
              type="number"
              value={surfaceConfig.segments}
              min={4}
              max={128}
              step={1}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) actions.setSurfaceConfig({ segments: v });
              }}
              className="w-20 h-8 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
