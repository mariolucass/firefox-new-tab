/**
 * Reatribui `order` dentro de um subconjunto (ex.: só os favoritos) sem mexer
 * nos demais: os mesmos valores de `order` que o subconjunto já ocupava são
 * redistribuídos na nova sequência de ids.
 */
export function reorderByIds<T extends { id: string; order: number }>(
  items: T[],
  ids: string[],
): T[] {
  const wanted = new Set(ids);
  const slots = items
    .filter((item) => wanted.has(item.id))
    .map((item) => item.order)
    .sort((a, b) => a - b);
  const next = new Map(ids.map((id, index) => [id, slots[index]]));
  return items.map((item) =>
    next.has(item.id) && next.get(item.id) !== undefined
      ? { ...item, order: next.get(item.id)! }
      : item,
  );
}
