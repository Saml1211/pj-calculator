import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, ProjectorConfig, ProjectionParameters } from './types';
import { adaptProjectorsToSurface, calculateProjectorWrapAround } from './calculations';
import { editOptics, type OpticParam } from './optics';
import { emptyHistory, record, undo as undoRing, redo as redoRing, type Ring } from './history';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

const initialProjectorParams: ProjectionParameters = {
  throwDistance: 5,
  imageWidth: 2,
  imageHeight: 2 / (16 / 9),
  throwRatio: 2.5,
  aspectRatio: 16 / 9,
  position: { x: 0, y: 1.5, z: 5 },
  rotation: { x: 0, y: 0, z: 0 },
  lockedParameter: 'throwRatio',
};

const projectorColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  projectors: [
    {
      id: uuidv4(),
      name: 'Projector 1',
      color: projectorColors[0],
      isVisible: true,
      parameters: initialProjectorParams,
    },
    {
      id: uuidv4(),
      name: 'Projector 2',
      color: projectorColors[1],
      isVisible: true,
      parameters: {
        ...initialProjectorParams,
        position: { x: -1.5, y: 1.5, z: 5 },
      },
    },
  ],
  selectedProjectorIds: [],
  isLinkedMode: false,
  customModelUrl: null,
  history: emptyHistory(),
  opticsMessage: null,
  surfaceConfig: {
    type: 'Flat',
    width: 5,
    height: 3,
    curvature: 0.1,
    segments: 32,
    position: { x: 0, y: 1.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  edgeBlendingConfig: {
    isEnabled: false,
    overlap: 20,
    feather: 50,
    showRegions: false,
  },
  actions: {
    addProjector: () =>
      set((state) => {
        const newProjector: ProjectorConfig = {
          id: uuidv4(),
          name: `Projector ${state.projectors.length + 1}`,
          color: projectorColors[state.projectors.length % projectorColors.length],
          isVisible: true,
          parameters: initialProjectorParams,
        };
        return { projectors: [...state.projectors, newProjector] };
      }),
    removeProjector: (id) =>
      set((state) => ({
        projectors: state.projectors.filter((p) => p.id !== id),
        selectedProjectorIds: state.selectedProjectorIds.filter((selectedId) => selectedId !== id),
      })),
    updateProjector: (id, newConfig) =>
      set((state) => ({
        projectors: state.projectors.map((p) =>
          p.id === id ? { ...p, ...newConfig } : p
        ),
      })),
    updateProjectorParameter: (id, param, value) => {
      if (!['throwDistance', 'imageWidth', 'throwRatio', 'aspectRatio'].includes(param)) return;
      const state = get();
      const primary = state.projectors.find((p) => p.id === id);
      if (!primary) return;
      const optic = param as OpticParam;
      const first = editOptics(primary.parameters, optic, value);
      // Linked mode (spec 3.5): the other selected projectors get the same change as a
      // delta, each through its own lock. Their transforms are never touched.
      const delta = first.params[optic] - primary.parameters[optic];
      const linked = state.isLinkedMode && state.selectedProjectorIds.includes(id);
      const projectors = state.projectors.map((p) => {
        if (p.id === id) return { ...p, parameters: first.params };
        if (!linked || !state.selectedProjectorIds.includes(p.id) || delta === 0) return p;
        return { ...p, parameters: editOptics(p.parameters, optic, p.parameters[optic] + delta).params };
      });
      const after = { ...state, projectors };
      set({
        projectors,
        opticsMessage: first.message ?? null,
        history: record(state.history, 'optics', state, after, Date.now(), `${id}:${param}`),
      });
    },
    setLock: (id, lock) =>
      set((state) => {
        const projectors = state.projectors.map((p) =>
          p.id === id ? { ...p, parameters: { ...p.parameters, lockedParameter: lock } } : p
        );
        return { projectors, opticsMessage: null, history: record(state.history, 'optics', state, { ...state, projectors }, Date.now()) };
      }),
    resetProjector: (id, part) =>
      set((state) => {
        const optics = part === 'optics' || part === 'all';
        const position = part === 'position' || part === 'all';
        const rotation = part === 'rotation' || part === 'all';
        const projectors = state.projectors.map((p) => {
          if (p.id !== id) return p;
          const { position: pos, rotation: rot, ...lens } = initialProjectorParams;
          let next = optics ? { ...p.parameters, ...lens } : { ...p.parameters };
          // Position resets to square in front of the surface centre at this lens's throw distance,
          // not the spec's (0,0,0), which would sit the projector inside the screen.
          if (position) {
            const home = calculateProjectorWrapAround(state.surfaceConfig, next, 0).position;
            next = { ...next, position: { x: home.x, y: home.y, z: home.z } };
          }
          if (rotation) next = { ...next, rotation: { ...rot } };
          return { ...p, parameters: next };
        });
        const after = { ...state, projectors };
        let history = state.history;
        if (optics) history = record(history, 'optics', state, after, Date.now());
        if (position || rotation) history = record(history, 'transforms', state, after, Date.now());
        return { projectors, history, opticsMessage: null };
      }),
    setProjectorTransform: (id, t) =>
      set((state) => {
        const projectors = state.projectors.map((p) =>
          p.id === id ? { ...p, parameters: { ...p.parameters, ...t } } : p
        );
        const key = `${id}:${Object.keys(t).join()}`;
        return { projectors, history: record(state.history, 'transforms', state, { ...state, projectors }, Date.now(), key) };
      }),
    undo: (ring: Ring) =>
      set((state) => {
        const r = undoRing(state.history, ring, state);
        return { history: r.history, projectors: r.scene.projectors, surfaceConfig: r.scene.surfaceConfig, opticsMessage: null };
      }),
    redo: (ring: Ring) =>
      set((state) => {
        const r = redoRing(state.history, ring, state);
        return { history: r.history, projectors: r.scene.projectors, surfaceConfig: r.scene.surfaceConfig, opticsMessage: null };
      }),
    loadScene: (scene) =>
      set({ ...scene, selectedProjectorIds: [], history: emptyHistory(), opticsMessage: null }),
    setSelectedProjectorIds: (ids) => set({ selectedProjectorIds: ids }),
    toggleLinkedMode: () => set((state) => ({ isLinkedMode: !state.isLinkedMode })),
    setSurfaceConfig: (newConfig) =>
      set((state) => {
        const surfaceConfig = { ...state.surfaceConfig, ...newConfig };
        const key = `surface:${Object.keys(newConfig).join()}`;
        return { surfaceConfig, history: record(state.history, 'transforms', state, { ...state, surfaceConfig }, Date.now(), key) };
      }),
    setEdgeBlendingConfig: (newConfig) =>
      set((state) => ({
        edgeBlendingConfig: { ...state.edgeBlendingConfig, ...newConfig },
      })),
    adaptProjectorsToSurface: () => {
      const { surfaceConfig, projectors } = get();
      logger.info('Adapting projectors to surface', {
        surfaceType: surfaceConfig.type,
        projectorCount: projectors.length,
      });
      const updated = adaptProjectorsToSurface(surfaceConfig, projectors);
      const state = get();
      set({ projectors: updated, history: record(state.history, 'transforms', state, { ...state, projectors: updated }, Date.now()) });
    },
    setCustomModelUrl: (url) => set({ customModelUrl: url }),
  },
}),
    {
      name: 'pj-calculator-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only serializable scene config. `actions` are functions and
      // `customModelUrl` is a transient object URL (revoked on reload), so both
      // are excluded.
      partialize: (state) => ({
        projectors: state.projectors,
        selectedProjectorIds: state.selectedProjectorIds,
        isLinkedMode: state.isLinkedMode,
        surfaceConfig: state.surfaceConfig,
        edgeBlendingConfig: state.edgeBlendingConfig,
      }),
    }
  )
);
