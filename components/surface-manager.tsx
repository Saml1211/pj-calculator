'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SurfaceType } from '@/lib/types';

interface SurfaceControlProps {
  label: string;
  value: number;
  param: string;
  min: number;
  max: number;
  step: number;
  onValueChange: (param: string, value: number) => void;
}

const SurfaceControl: React.FC<SurfaceControlProps> = ({ label, value, param, min, max, step, onValueChange }) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Slider
          value={[value]}
          onValueChange={([val]) => onValueChange(param, val)}
          min={min}
          max={max}
          step={step}
        />
        <Input
          type="number"
          value={value}
          onChange={(e) => onValueChange(param, parseFloat(e.target.value))}
          className="w-24"
        />
      </div>
    </div>
  );
};

export function SurfaceManager() {
  const surfaceConfig = useAppStore((state) => state.surfaceConfig);
  const { setSurfaceConfig } = useAppStore((state) => state.actions);

  const handleValueChange = (param: string, value: any) => {
    setSurfaceConfig({ [param]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Surface Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={surfaceConfig.type}
            onValueChange={(value: SurfaceType) => handleValueChange('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a surface type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Flat">Flat</SelectItem>
              <SelectItem value="Cylindrical">Cylindrical</SelectItem>
              <SelectItem value="Spherical">Spherical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SurfaceControl
          label="Width (m)"
          value={surfaceConfig.width}
          param="width"
          min={1}
          max={50}
          step={0.5}
          onValueChange={handleValueChange}
        />
        <SurfaceControl
          label="Height (m)"
          value={surfaceConfig.height}
          param="height"
          min={1}
          max={50}
          step={0.5}
          onValueChange={handleValueChange}
        />
        {surfaceConfig.type !== 'Flat' && (
          <SurfaceControl
            label="Curvature"
            value={surfaceConfig.curvature}
            param="curvature"
            min={0.001}
            max={1}
            step={0.001}
            onValueChange={handleValueChange}
          />
        )}
        <SurfaceControl
          label="Segments"
          value={surfaceConfig.segments}
          param="segments"
          min={4}
          max={128}
          step={1}
          onValueChange={handleValueChange}
        />
      </CardContent>
    </Card>
  );
}
