'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { encodeScene, decodeScene } from '@/lib/scene-link';
import { Button } from '@/components/ui/button';
import { Link2, Redo2, Undo2 } from 'lucide-react';

/** Header controls: the two undo rings (spec 3.7, AC5) and the shareable scene link. */
export function SceneActions() {
  const hist = useAppStore((s) => s.history);
  const actions = useAppStore((s) => s.actions);
  const [note, setNote] = useState<string | null>(null);

  // Open a shared link: the hash replaces the saved scene once, then is cleared so a
  // reload keeps the user's later edits.
  useEffect(() => {
    if (!window.location.hash.startsWith('#s=')) return;
    decodeScene(window.location.hash).then((scene) => {
      if (scene) actions.loadScene(scene);
      setNote(scene ? 'Shared scene loaded' : 'That link is not a valid scene');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cmd/Ctrl+Z undoes the ring that changed last; Shift redoes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const h = useAppStore.getState().history;
      const ring = (h.optics.lastAt ?? 0) >= (h.transforms.lastAt ?? 0) ? 'optics' : 'transforms';
      e.preventDefault();
      if (e.shiftKey) actions.redo(ring);
      else actions.undo(ring);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2500);
    return () => clearTimeout(t);
  }, [note]);

  const copyLink = async () => {
    const s = useAppStore.getState();
    const hash = await encodeScene(s);
    const url = window.location.origin + window.location.pathname + hash;
    try {
      await navigator.clipboard.writeText(url);
      setNote('Link copied');
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  const ring = (name: 'optics' | 'transforms', label: string) => (
    <div className="flex items-center">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={hist[name].past.length === 0}
        onClick={() => actions.undo(name)} title={`Undo ${label}`} aria-label={`Undo ${label}`}>
        <Undo2 className="mr-1 h-3.5 w-3.5" />
        {label}
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 px-0" disabled={hist[name].future.length === 0}
        onClick={() => actions.redo(name)} title={`Redo ${label}`} aria-label={`Redo ${label}`}>
        <Redo2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="ml-3 flex items-center gap-1">
      {note && <span role="status" className="mr-2 text-xs text-muted-foreground">{note}</span>}
      {ring('optics', 'Optics')}
      {ring('transforms', 'Position')}
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copyLink} title="Copy a link to this scene">
        <Link2 className="mr-1.5 h-3.5 w-3.5" />
        Copy link
      </Button>
    </div>
  );
}
