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

  setActiveSelection: (selection: AnnotationState["activeSelection"]) => void;
  clearSelection: () => void;

  setAnnotations: (messageId: string, annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (messageId: string, annotationId: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (messageId: string, annotationId: string) => void;
  toggleAnnotation: (messageId: string, annotationId: string) => void;

  getAnnotationsForMessage: (messageId: string) => Annotation[];
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: new Map(),
  activeSelection: null,

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
      return { annotations: map };
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
      return { annotations: map };
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

  getAnnotationsForMessage: (messageId) => {
    return get().annotations.get(messageId) || [];
  },
}));
