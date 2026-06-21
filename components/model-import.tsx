'use client';

import { useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function ModelImport() {
  const customModelUrl = useAppStore((s) => s.customModelUrl);
  const actions = useAppStore((s) => s.actions);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleLoad = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setFileName(file.name);
    actions.setCustomModelUrl(url);
  };

  const handleRemove = () => {
    if (customModelUrl) {
      URL.revokeObjectURL(customModelUrl);
    }
    setFileName(null);
    actions.setCustomModelUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loaded = !!customModelUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Import Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Import a 3D model in GLTF or GLB format. The model will be displayed
          in the scene alongside the projection setup.
        </p>

        {!loaded ? (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".gltf,.glb"
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-accent"
            />
            <Button size="sm" className="w-full" onClick={handleLoad}>
              Load Model
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <span className="flex-1 text-xs truncate">
                {fileName ?? 'Model loaded'}
              </span>
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleRemove}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
