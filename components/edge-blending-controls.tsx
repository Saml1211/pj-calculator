'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function EdgeBlendingControls() {
  const edgeBlendingConfig = useAppStore((s) => s.edgeBlendingConfig);
  const actions = useAppStore((s) => s.actions);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Edge Blending</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Enabled</Label>
          <Switch
            checked={edgeBlendingConfig.isEnabled}
            onCheckedChange={(checked) =>
              actions.setEdgeBlendingConfig({ isEnabled: checked })
            }
          />
        </div>

        {edgeBlendingConfig.isEnabled && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Overlap</Label>
                <span className="text-xs text-muted-foreground">
                  {edgeBlendingConfig.overlap}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[edgeBlendingConfig.overlap]}
                  min={0}
                  max={50}
                  step={1}
                  onValueChange={([v]) =>
                    actions.setEdgeBlendingConfig({ overlap: v })
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={edgeBlendingConfig.overlap}
                  min={0}
                  max={50}
                  step={1}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v))
                      actions.setEdgeBlendingConfig({ overlap: v });
                  }}
                  className="w-20 h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Feather</Label>
                <span className="text-xs text-muted-foreground">
                  {edgeBlendingConfig.feather}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[edgeBlendingConfig.feather]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) =>
                    actions.setEdgeBlendingConfig({ feather: v })
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={edgeBlendingConfig.feather}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v))
                      actions.setEdgeBlendingConfig({ feather: v });
                  }}
                  className="w-20 h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Regions</Label>
              <Switch
                checked={edgeBlendingConfig.showRegions}
                onCheckedChange={(checked) =>
                  actions.setEdgeBlendingConfig({ showRegions: checked })
                }
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
