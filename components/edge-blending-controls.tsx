'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EdgeBlendingControlProps {
  label: string;
  value: number;
  param: string;
  min: number;
  max: number;
  step: number;
  onValueChange: (param: string, value: number) => void;
}

const EdgeBlendingControl: React.FC<EdgeBlendingControlProps> = ({ label, value, param, min, max, step, onValueChange }) => {
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

export function EdgeBlendingControls() {
  const edgeBlendingConfig = useAppStore((state) => state.edgeBlendingConfig);
  const { setEdgeBlendingConfig } = useAppStore((state) => state.actions);

  const handleValueChange = (param: string, value: any) => {
    setEdgeBlendingConfig({ [param]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edge Blending</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Enable Edge Blending</Label>
          <Switch
            checked={edgeBlendingConfig.isEnabled}
            onCheckedChange={(checked) => handleValueChange('isEnabled', checked)}
          />
        </div>
        {edgeBlendingConfig.isEnabled && (
          <>
            <EdgeBlendingControl
              label="Overlap (%)"
              value={edgeBlendingConfig.overlap}
              param="overlap"
              min={0}
              max={50}
              step={1}
              onValueChange={handleValueChange}
            />
            <EdgeBlendingControl
              label="Feather (%)"
              value={edgeBlendingConfig.feather}
              param="feather"
              min={0}
              max={100}
              step={1}
              onValueChange={handleValueChange}
            />
            <div className="flex items-center justify-between">
              <Label>Show Blend Regions</Label>
              <Switch
                checked={edgeBlendingConfig.showRegions}
                onCheckedChange={(checked) => handleValueChange('showRegions', checked)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
