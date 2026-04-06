import { create } from "zustand";

export interface Annotation {
  id: string;
  messageId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  question: string;
  answer: string;
  isStreaming?: boolean;
  isExpanded?: boolean;
}

interface AnnotationState {
  annotations: Map<string, Annotation[]>; // messageId -> annotations
  activeSelection: {
    messageId: string;
    text: string;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  } | null;
  activeAnnotationId: string | null; // currently viewing in panel

  setActiveSelection: (selection: AnnotationState["activeSelection"]) => void;
  clearSelection: () => void;

  setAnnotations: (messageId: string, annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (messageId: string, annotationId: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (messageId: string, annotationId: string) => void;
  toggleAnnotation: (messageId: string, annotationId: string) => void;

  setActiveAnnotationId: (id: string | null) => void;
  getAnnotationsForMessage: (messageId: string) => Annotation[];
  getActiveAnnotation: () => Annotation | null;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: new Map(),
  activeSelection: null,
  activeAnnotationId: null,

  setActiveSelection: (selection) => set({ activeSelection: selection }),
  clearSelection: () => set({ activeSelection: null }),

  setAnnotations: (messageId, annotations) => {
    set((state) => {
      const map = new Map(state.annotations);
      map.set(messageId, annotations.map((a) => ({ ...a, isExpanded: false })));
      return { annotations: map };
    });
  },

  addAnnotation: (annotation) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(annotation.messageId) || [];
      map.set(annotation.messageId, [...existing, annotation]);
      return { annotations: map, activeAnnotationId: annotation.id };
    });
  },

  updateAnnotation: (messageId, annotationId, updates) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(messageId) || [];
      map.set(
        messageId,
        existing.map((a) => (a.id === annotationId ? { ...a, ...updates } : a))
      );
      // If the annotation ID changed (temp -> persisted), update activeAnnotationId
      if (updates.id && state.activeAnnotationId === annotationId) {
        return { annotations: map, activeAnnotationId: updates.id };
      }
      return { annotations: map };
    });
  },

  removeAnnotation: (messageId, annotationId) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(messageId) || [];
      map.set(
        messageId,
        existing.filter((a) => a.id !== annotationId)
      );
      const newActiveId = state.activeAnnotationId === annotationId ? null : state.activeAnnotationId;
      return { annotations: map, activeAnnotationId: newActiveId };
    });
  },

  toggleAnnotation: (messageId, annotationId) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(messageId) || [];
      map.set(
        messageId,
        existing.map((a) =>
          a.id === annotationId ? { ...a, isExpanded: !a.isExpanded } : a
        )
      );
      return { annotations: map };
    });
  },

  setActiveAnnotationId: (id) => set({ activeAnnotationId: id }),

  getAnnotationsForMessage: (messageId) => {
    return get().annotations.get(messageId) || [];
  },

  getActiveAnnotation: () => {
    const { activeAnnotationId, annotations } = get();
    if (!activeAnnotationId) return null;
    for (const annots of annotations.values()) {
      const found = annots.find((a) => a.id === activeAnnotationId);
      if (found) return found;
    }
    return null;
  },
}));
