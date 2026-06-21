'use client';

import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Unlock } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import type { LockedParameter, ProjectionParameters } from '@/lib/types';

interface ParameterControlProps {
  label: string;
  value: number;
  param: keyof ProjectionParameters;
  min: number;
  max: number;
  step: number;
  unit?: string;
  lockedParameter: LockedParameter;
  onValueChange: (param: keyof ProjectionParameters, value: number) => void;
  onLockChange: (param: LockedParameter) => void;
}

function ParameterControl({
  label,
  value,
  param,
  min,
  max,
  step,
  unit,
  lockedParameter,
  onValueChange,
  onLockChange,
}: ParameterControlProps) {
  const isLocked = lockedParameter === param;

  return (
    <div className={cn('space-y-2', isLocked && 'opacity-50')}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onLockChange(isLocked ? null : (param as LockedParameter))}
        >
          {isLocked ? (
            <Lock className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Unlock className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          disabled={isLocked}
          onValueChange={([v]) => onValueChange(param, v)}
          className="flex-1"
        />
        <Input
          type="number"
          value={Number(value.toFixed(2))}
          min={min}
          max={max}
          step={step}
          disabled={isLocked}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onValueChange(param, v);
          }}
          className="w-20 h-8 text-xs"
        />
        {unit && (
          <span className="text-xs text-muted-foreground w-4">{unit}</span>
        )}
      </div>
    </div>
  );
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function ControlPanel() {
  const projectors = useAppStore((s) => s.projectors);
  const selectedProjectorIds = useAppStore((s) => s.selectedProjectorIds);
  const actions = useAppStore((s) => s.actions);

  const selectedProjector = projectors.find(
    (p) => p.id === selectedProjectorIds[0]
  );

  if (!selectedProjector) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a projector to edit parameters
          </p>
        </CardContent>
      </Card>
    );
  }

  const params = selectedProjector.parameters;

  const updateParam = (param: keyof ProjectionParameters, value: number) => {
    actions.updateProjectorParameter(selectedProjector.id, param, value);
  };

  const updateLock = (param: LockedParameter) => {
    actions.updateProjector(selectedProjector.id, {
      parameters: { ...params, lockedParameter: param },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Parameters{' '}
          <span className="text-muted-foreground font-normal">
            — {selectedProjector.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="optics">
          <TabsList className="w-full">
            <TabsTrigger value="optics" className="flex-1">
              Optics
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex-1">
              Layout
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1">
              Style
            </TabsTrigger>
          </TabsList>

          <TabsContent value="optics" className="space-y-4 mt-4">
            <ParameterControl
              label="Throw Distance"
              value={params.throwDistance}
              param="throwDistance"
              min={0.3}
              max={20}
              step={0.1}
              unit="m"
              lockedParameter={params.lockedParameter}
              onValueChange={updateParam}
              onLockChange={updateLock}
            />
            <ParameterControl
              label="Image Width"
              value={params.imageWidth}
              param="imageWidth"
              min={0.5}
              max={10}
              step={0.1}
              unit="m"
              lockedParameter={params.lockedParameter}
              onValueChange={updateParam}
              onLockChange={updateLock}
            />
            <ParameterControl
              label="Throw Ratio"
              value={params.throwRatio}
              param="throwRatio"
              min={0.3}
              max={7.5}
              step={0.05}
              lockedParameter={params.lockedParameter}
              onValueChange={updateParam}
              onLockChange={updateLock}
            />
            <div className="text-xs text-muted-foreground pt-1">
              Image Height: {params.imageHeight.toFixed(2)} m
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs">Position</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis} className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">
                      {axis}
                    </span>
                    <Input
                      type="number"
                      step={0.1}
                      value={Number(params.position[axis].toFixed(2))}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) {
                          actions.updateProjector(selectedProjector.id, {
                            parameters: {
                              ...params,
                              position: { ...params.position, [axis]: v },
                            },
                          });
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rotation (degrees)</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis} className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">
                      {axis}
                    </span>
                    <Input
                      type="number"
                      step={1}
                      value={Number(
                        radToDeg(params.rotation[axis]).toFixed(1)
                      )}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) {
                          actions.updateProjector(selectedProjector.id, {
                            parameters: {
                              ...params,
                              rotation: {
                                ...params.rotation,
                                [axis]: degToRad(v),
                              },
                            },
                          });
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <HexColorPicker
                color={selectedProjector.color}
                onChange={(color) =>
                  actions.updateProjector(selectedProjector.id, { color })
                }
                style={{ width: '100%' }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Name</Label>
              <Input
                value={selectedProjector.name}
                onChange={(e) =>
                  actions.updateProjector(selectedProjector.id, {
                    name: e.target.value,
                  })
                }
                className="h-8 text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
