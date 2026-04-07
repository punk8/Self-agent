import { create } from "zustand";

export interface FollowUp {
  question: string;
  answer: string;
  isStreaming?: boolean;
}

export interface Annotation {
  id: string;
  messageId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  question: string;
  answer: string;
  followUps: FollowUp[];
  isStreaming?: boolean;
  isExpanded?: boolean;
}

interface AnnotationState {
  annotations: Map<string, Annotation[]>;
  activeSelection: {
    messageId: string;
    text: string;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  } | null;
  activeAnnotationId: string | null;

  setActiveSelection: (selection: AnnotationState["activeSelection"]) => void;
  clearSelection: () => void;

  setAnnotations: (messageId: string, annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (messageId: string, annotationId: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (messageId: string, annotationId: string) => void;
  toggleAnnotation: (messageId: string, annotationId: string) => void;

  // Follow-up support
  addFollowUp: (messageId: string, annotationId: string, followUp: FollowUp) => void;
  updateLastFollowUp: (messageId: string, annotationId: string, updates: Partial<FollowUp>) => void;
  appendToLastFollowUp: (messageId: string, annotationId: string, content: string) => void;

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
      map.set(messageId, annotations.map((a) => ({
        ...a,
        followUps: a.followUps || [],
        isExpanded: false,
      })));
      return { annotations: map };
    });
  },

  addAnnotation: (annotation) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(annotation.messageId) || [];
      map.set(annotation.messageId, [...existing, { ...annotation, followUps: annotation.followUps || [] }]);
      return { annotations: map, activeAnnotationId: annotation.id };
    });
  },

  updateAnnotation: (messageId, annotationId, updates) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(messageId) || [];
      map.set(messageId, existing.map((a) => (a.id === annotationId ? { ...a, ...updates } : a)));
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
      map.set(messageId, existing.filter((a) => a.id !== annotationId));
      const newActiveId = state.activeAnnotationId === annotationId ? null : state.activeAnnotationId;
      return { annotations: map, activeAnnotationId: newActiveId };
    });
  },

  toggleAnnotation: (messageId, annotationId) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(messageId) || [];
      map.set(messageId, existing.map((a) =>
        a.id === annotationId ? { ...a, isExpanded: !a.isExpanded } : a
      ));
      return { annotations: map };
    });
  },

  addFollowUp: (messageId, annotationId, followUp) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(messageId) || [];
      map.set(messageId, existing.map((a) =>
        a.id === annotationId ? { ...a, followUps: [...a.followUps, followUp] } : a
      ));
      return { annotations: map };
    });
  },

  updateLastFollowUp: (messageId, annotationId, updates) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(messageId) || [];
      map.set(messageId, existing.map((a) => {
        if (a.id !== annotationId || a.followUps.length === 0) return a;
        const fups = [...a.followUps];
        fups[fups.length - 1] = { ...fups[fups.length - 1], ...updates };
        return { ...a, followUps: fups };
      }));
      return { annotations: map };
    });
  },

  appendToLastFollowUp: (messageId, annotationId, content) => {
    set((state) => {
      const map = new Map(state.annotations);
      const existing = map.get(messageId) || [];
      map.set(messageId, existing.map((a) => {
        if (a.id !== annotationId || a.followUps.length === 0) return a;
        const fups = [...a.followUps];
        const last = fups[fups.length - 1];
        fups[fups.length - 1] = { ...last, answer: last.answer + content };
        return { ...a, followUps: fups };
      }));
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
