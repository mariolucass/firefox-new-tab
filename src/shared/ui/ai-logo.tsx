import { aiLogos } from "./ai-logos";

/** Glifo branco da IA (a peça colorida vem do contêiner). */
export function AiGlyph({ id, size = 20 }: { id: string; size?: number }) {
  const logo = aiLogos[id];
  if (!logo) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" fillRule="evenodd" aria-hidden="true" focusable="false">
      {logo.paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
