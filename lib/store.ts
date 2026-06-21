import { create } from 'zustand';
import { AppState, ProjectorConfig, ProjectionParameters } from './types';
import { calculateLinkedParameters, adaptProjectorsToSurface } from './calculations';
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

export const useAppStore = create<AppState>((set, get) => ({
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
    updateProjectorParameter: (id, param, value) =>
      set((state) => {
        const targetProjectors = state.isLinkedMode ? state.projectors.filter(p => state.selectedProjectorIds.includes(p.id)) : state.projectors.filter(p => p.id === id);
        const updatedProjectors = [...state.projectors];

        targetProjectors.forEach(proj => {
            const newParams = calculateLinkedParameters(proj.parameters, param, value);
            const projIndex = updatedProjectors.findIndex(p => p.id === proj.id);
            if (projIndex !== -1) {
                updatedProjectors[projIndex] = { ...updatedProjectors[projIndex], parameters: newParams };
            }
        });

        return { projectors: updatedProjectors };
      }),
    setSelectedProjectorIds: (ids) => set({ selectedProjectorIds: ids }),
    toggleLinkedMode: () => set((state) => ({ isLinkedMode: !state.isLinkedMode })),
    setSurfaceConfig: (newConfig) =>
      set((state) => ({
        surfaceConfig: { ...state.surfaceConfig, ...newConfig },
      })),
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
      set({ projectors: updated });
    },
    setCustomModelUrl: (url) => set({ customModelUrl: url }),
  },
}));
