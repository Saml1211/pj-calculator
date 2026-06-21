'use client';

import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { logger } from '@/lib/logger';

interface CustomModelProps {
  url: string;
}

/**
 * Renders a user-imported GLTF/GLB model inside the projection scene.
 * The url is an object URL produced by the Import Model panel. Because
 * useGLTF caches by url, we clear that cache entry on unmount/url change so
 * a freshly re-imported file (which gets a new object URL) is not stale.
 */
export function CustomModel({ url }: CustomModelProps) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    logger.info('Custom model loaded', { url });
    return () => {
      // Drop the cached parse so re-importing reloads from the new blob URL.
      useGLTF.clear(url);
    };
  }, [url]);

  // Clone so multiple renders (or future multi-instance use) don't share the
  // same mutable object graph.
  return <primitive object={scene.clone()} />;
}
