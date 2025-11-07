'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Unlock } from 'lucide-react';
import { LockedParameter, ProjectionParameters } from '@/lib/types';

import { HexColorPicker } from 'react-colorful';

interface ParameterControlProps {
  label: string;
  value: number;
  param: keyof ProjectionParameters;
  min: number;
  max: number;
  step: number;
  projectorId: string;
  lockedParameter: keyof ProjectionParameters | null;
  onValueChange: (param: keyof ProjectionParameters, value: number) => void;
  onLockChange: (param: keyof ProjectionParameters | null) => void;
}

const ParameterControl: React.FC<ParameterControlProps> = ({ label, value, param, min, max, step, projectorId, lockedParameter, onValueChange, onLockChange }) => {
  const isLocked = lockedParameter === param;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {onLockChange && (
          <Button variant="ghost" size="icon" onClick={() => onLockChange(isLocked ? null : param)}>
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Slider
          value={[value]}
          onValueChange={([val]) => onValueChange(param, val)}
          min={min}
          max={max}
          step={step}
          disabled={isLocked}
        />
        <Input
          type="number"
          value={value}
          onChange={(e) => onValueChange(param, parseFloat(e.target.value))}
          className="w-24"
          disabled={isLocked}
        />
      </div>
    </div>
  );
};

interface PositionControlProps {
  label: string;
  value: number;
  axis: string;
  onPositionChange: (axis: string, value: number) => void;
}

const PositionControl: React.FC<PositionControlProps> = ({ label, value, axis, onPositionChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-8">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onPositionChange(axis, parseFloat(e.target.value))}
      />
    </div>
  );
}

export function ControlPanel() {
  const selectedProjectorIds = useAppStore((state) => state.selectedProjectorIds);
  const projectors = useAppStore((state) => state.projectors);
  const { updateProjectorParameter, updateProjector } = useAppStore((state) => state.actions);

  const selectedProjector = projectors.find(p => p.id === selectedProjectorIds[0]);

  if (!selectedProjector) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Control Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Select a projector to see its controls.</p>
        </CardContent>
      </Card>
    );
  }

  const handleParameterChange = (param: keyof ProjectionParameters, value: any) => {
    updateProjectorParameter(selectedProjector.id, param, value);
  };

  const handleLockChange = (param: keyof ProjectionParameters | null) => {
    updateProjector(selectedProjector.id, { parameters: { ...selectedProjector.parameters, lockedParameter: param as LockedParameter } });
  };

  const handlePositionChange = (axis: string, value: number) => {
    const newPosition = { ...selectedProjector.parameters.position, [axis]: value };
    updateProjector(selectedProjector.id, { parameters: { ...selectedProjector.parameters, position: newPosition } });
  };

  const handleRotationChange = (axis: string, value: number) => {
    const newRotation = { ...selectedProjector.parameters.rotation, [axis]: value };
    updateProjector(selectedProjector.id, { parameters: { ...selectedProjector.parameters, rotation: newRotation } });
  };

  const { parameters } = selectedProjector;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control Panel: {selectedProjector.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="position">Position</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="space-y-4 pt-4">
            <ParameterControl
              label="Throw Distance (m)"
              value={parameters.throwDistance}
              param="throwDistance"
              min={0.3}
              max={20}
              step={0.1}
              projectorId={selectedProjector.id}
              lockedParameter={parameters.lockedParameter}
              onValueChange={handleParameterChange}
              onLockChange={handleLockChange}
            />
            <ParameterControl
              label="Image Width (m)"
              value={parameters.imageWidth}
              param="imageWidth"
              min={0.5}
              max={10}
              step={0.1}
              projectorId={selectedProjector.id}
              lockedParameter={parameters.lockedParameter}
              onValueChange={handleParameterChange}
              onLockChange={handleLockChange}
            />
            <ParameterControl
              label="Throw Ratio"
              value={parameters.throwRatio}
              param="throwRatio"
              min={0.3}
              max={7.5}
              step={0.1}
              projectorId={selectedProjector.id}
              lockedParameter={parameters.lockedParameter}
              onValueChange={handleParameterChange}
              onLockChange={handleLockChange}
            />
          </TabsContent>
          <TabsContent value="advanced" className="space-y-4 pt-4">
            <ParameterControl
              label="Aspect Ratio"
              value={parameters.aspectRatio}
              param="aspectRatio"
              min={0.5}
              max={3}
              step={0.01}
              projectorId={selectedProjector.id}
              lockedParameter={parameters.lockedParameter}
              onValueChange={handleParameterChange}
              onLockChange={handleLockChange}
            />
            <div className="space-y-2">
              <Label>Color</Label>
              <HexColorPicker color={selectedProjector.color} onChange={(color) => updateProjector(selectedProjector.id, { color })} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={selectedProjector.name}
                onChange={(e) => updateProjector(selectedProjector.id, { name: e.target.value })}
              />
            </div>
          </TabsContent>
          <TabsContent value="position" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Position (m)</Label>
              <div className="grid grid-cols-3 gap-2">
                <PositionControl label="X" value={parameters.position.x} axis="x" onPositionChange={handlePositionChange} />
                <PositionControl label="Y" value={parameters.position.y} axis="y" onPositionChange={handlePositionChange} />
                <PositionControl label="Z" value={parameters.position.z} axis="z" onPositionChange={handlePositionChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rotation (rad)</Label>
              <div className="grid grid-cols-3 gap-2">
                <PositionControl label="X" value={parameters.rotation.x} axis="x" onPositionChange={handleRotationChange} />
                <PositionControl label="Y" value={parameters.rotation.y} axis="y" onPositionChange={handleRotationChange} />
                <PositionControl label="Z" value={parameters.rotation.z} axis="z" onPositionChange={handleRotationChange} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}