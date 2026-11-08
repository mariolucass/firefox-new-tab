import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

type Item = { id: string };

/**
 * Reordenação por arrastar (HTML5 DnD) e por teclado (Alt + setas). Durante o
 * arrasto a ordem é só local; grava uma vez, ao soltar. Os vizinhos deslizam
 * com FLIP (transform), sem animar layout.
 */
export function useReorder<T extends Item>(
  items: T[],
  onCommit: ((ids: string[]) => void) | undefined,
) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const before = useRef(new Map<string, DOMRect>());
  const refocus = useRef<string | null>(null);

  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = draft
    ? draft.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
    : items;
  const key = ordered.map((item) => item.id).join("|");

  const snapshot = useCallback(() => {
    before.current = new Map(
      [...nodes.current].map(([id, node]) => [
        id,
        node.getBoundingClientRect(),
      ]),
    );
  }, []);

  useLayoutEffect(() => {
    for (const [id, node] of nodes.current) {
      const from = before.current.get(id);
      if (!from) continue;
      const to = node.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (!dx && !dy) continue;
      node.style.transition = "none";
      node.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        node.style.transition =
          "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";
        node.style.transform = "";
      });
    }
    before.current = new Map();
    if (refocus.current) {
      nodes.current
        .get(refocus.current)
        ?.querySelector<HTMLElement>("a, button")
        ?.focus();
      refocus.current = null;
    }
  }, [key]);

  function place(ids: string[], id: string, target: number) {
    const next = ids.filter((value) => value !== id);
    next.splice(target, 0, id);
    return next;
  }

  const currentIds = ordered.map((item) => item.id);

  function itemProps(id: string) {
    return {
      ref: (node: HTMLElement | null) => {
        if (node) nodes.current.set(id, node);
        else nodes.current.delete(id);
      },
      draggable: Boolean(onCommit),
      "data-dragging": dragging === id,
      onDragStart(event: DragEvent) {
        if (event.target !== event.currentTarget) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id); // o Firefox exige
        setDragging(id);
        setDraft(currentIds);
      },
      onDragEnter(event: DragEvent) {
        if (!dragging || dragging === id) return;
        event.preventDefault();
        const target = currentIds.indexOf(id);
        if (target < 0) return;
        snapshot();
        setDraft(place(currentIds, dragging, target));
      },
      onDragEnd(event: DragEvent) {
        const changed =
          draft && draft.join("|") !== items.map((i) => i.id).join("|");
        // dropEffect "none": soltou fora ou apertou Esc, descarta.
        if (changed && event.dataTransfer.dropEffect !== "none")
          onCommit?.(draft!);
        setDragging(null);
        setDraft(null);
      },
      onKeyDown(event: KeyboardEvent) {
        if (!onCommit || !event.altKey) return;
        const step = /^Arrow(Left|Up)$/.test(event.key)
          ? -1
          : /^Arrow(Right|Down)$/.test(event.key)
            ? 1
            : 0;
        if (!step) return;
        const from = currentIds.indexOf(id);
        const to = from + step;
        if (to < 0 || to >= currentIds.length) return;
        event.preventDefault();
        snapshot();
        refocus.current = id;
        onCommit(place(currentIds, id, to));
      },
    };
  }

  const listProps = {
    onDragOver(event: DragEvent) {
      if (dragging) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }
    },
    onDrop(event: DragEvent) {
      if (dragging) event.preventDefault();
    },
  };

  return { ordered, itemProps, listProps };
}
