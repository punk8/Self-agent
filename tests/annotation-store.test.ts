import { beforeEach, describe, expect, it } from "vitest";
import { useAnnotationStore, type Annotation } from "@/stores/annotation-store";

function resetStore() {
  useAnnotationStore.setState({
    annotations: new Map(),
    activeSelection: null,
    activeAnnotationId: null,
  });
}

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "a1",
    messageId: "m1",
    startOffset: 0,
    endOffset: 3,
    selectedText: "txt",
    question: "q",
    answer: "a",
    followUps: [],
    ...overrides,
  };
}

describe("annotation-store", () => {
  beforeEach(() => {
    resetStore();
  });

  it("handles active selection lifecycle", () => {
    const state = useAnnotationStore.getState();
    const selection = {
      messageId: "m1",
      text: "hello",
      startOffset: 1,
      endOffset: 3,
      rect: {} as DOMRect,
    };

    state.setActiveSelection(selection);
    expect(useAnnotationStore.getState().activeSelection).toEqual(selection);

    state.clearSelection();
    expect(useAnnotationStore.getState().activeSelection).toBeNull();
  });

  it("sets and normalizes annotations", () => {
    useAnnotationStore.getState().setAnnotations("m1", [
      makeAnnotation({ followUps: undefined as unknown as [] }),
    ]);

    const ann = useAnnotationStore.getState().getAnnotationsForMessage("m1")[0];
    expect(ann.followUps).toEqual([]);
    expect(ann.isExpanded).toBe(false);
  });

  it("adds/updates/removes/toggles annotation", () => {
    const state = useAnnotationStore.getState();
    state.addAnnotation(makeAnnotation());

    expect(useAnnotationStore.getState().activeAnnotationId).toBe("a1");

    state.updateAnnotation("m1", "a1", { id: "a2", answer: "updated" });
    expect(useAnnotationStore.getState().activeAnnotationId).toBe("a2");

    const updated = useAnnotationStore.getState().getAnnotationsForMessage("m1")[0];
    expect(updated.answer).toBe("updated");

    state.toggleAnnotation("m1", "a2");
    expect(useAnnotationStore.getState().getAnnotationsForMessage("m1")[0].isExpanded).toBe(true);

    state.removeAnnotation("m1", "a2");
    expect(useAnnotationStore.getState().getAnnotationsForMessage("m1")).toEqual([]);
    expect(useAnnotationStore.getState().activeAnnotationId).toBeNull();
  });

  it("supports follow-up operations", () => {
    const state = useAnnotationStore.getState();
    state.addAnnotation(makeAnnotation());

    state.addFollowUp("m1", "a1", { question: "fq", answer: "fa", isStreaming: true });
    state.updateLastFollowUp("m1", "a1", { answer: "updated" });
    state.appendToLastFollowUp("m1", "a1", " +more");

    const followUps = useAnnotationStore.getState().getAnnotationsForMessage("m1")[0].followUps;
    expect(followUps).toEqual([{ question: "fq", answer: "updated +more", isStreaming: true }]);

    state.updateLastFollowUp("m1", "missing", { answer: "no-op" });
    state.appendToLastFollowUp("m1", "missing", "no-op");
    expect(useAnnotationStore.getState().getAnnotationsForMessage("m1")[0].followUps.length).toBe(1);
  });

  it("returns active annotation and supports manual active id", () => {
    const state = useAnnotationStore.getState();
    state.addAnnotation(makeAnnotation({ id: "a1", messageId: "m1" }));
    state.addAnnotation(makeAnnotation({ id: "a2", messageId: "m2" }));

    state.setActiveAnnotationId("a1");
    expect(state.getActiveAnnotation()?.id).toBe("a1");

    state.setActiveAnnotationId(null);
    expect(state.getActiveAnnotation()).toBeNull();
  });
});
