'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ModelImport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import 3D Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Load a custom 3D model (.gltf, .glb) to use as a projection surface.
        </p>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input type="file" accept=".gltf,.glb" />
          <Button type="submit">Load</Button>
        </div>
      </CardContent>
    </Card>
  );
}
