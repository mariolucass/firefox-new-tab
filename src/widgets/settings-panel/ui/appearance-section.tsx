"use client";

import { Check, Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { accents, palettes, type AccentId } from "@shared/config/theme";
import {
  paletteIds,
  type Appearance,
  type ThemeChoice,
} from "@features/preferences/model/use-appearance";

type Props = {
  appearance: Appearance;
  onChange: (patch: Partial<Appearance>) => void;
};

const themes: { id: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { id: "system", label: "Sistema", Icon: Monitor },
  { id: "dark", label: "Escuro", Icon: Moon },
  { id: "light", label: "Claro", Icon: Sun },
];

/**
 * Tema, atmosfera, cor de destaque e intensidade do fundo. Tudo local e
 * aplicado na hora. Cada atmosfera aparece como uma mini-cena: o chão em
 * degradê, as três luzes, um anel do mostrador e o espectro de 7 matizes.
 */
export function AppearanceSection({ appearance, onChange }: Props) {
  const isLight = typeof document !== "undefined" && document.documentElement.dataset.theme === "light";

  return (
    <section className="settings-section">
      <h3 className="settings-caption">Aparência</h3>

      <div className="palette-grid" role="radiogroup" aria-label="Atmosfera">
        {paletteIds.map((id) => {
          const palette = palettes[id];
          const mode = palette[isLight ? "light" : "dark"];
          const active = appearance.palette === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              data-active={active}
              className="palette-card"
              onClick={() => onChange({ palette: id })}
              style={
                {
                  "--p-bg": mode.bg,
                  "--p-top": mode.top,
                  "--p-bottom": mode.bottom,
                  "--p-g1": mode.glow[0],
                  "--p-g2": mode.glow[1],
                  "--p-g3": mode.glow[2],
                  "--p-t1": mode.spectrum[0],
                  "--p-t2": mode.spectrum[2],
                  "--p-t3": mode.spectrum[1],
                } as React.CSSProperties
              }
            >
              <span className="palette-scene" aria-hidden="true">
                <svg viewBox="0 0 40 40" className="palette-dial">
                  <circle cx="20" cy="20" r="15" className="palette-dial-track" />
                  <circle cx="20" cy="20" r="15" className="palette-dial-a" pathLength={100} />
                  <circle cx="20" cy="20" r="10" className="palette-dial-track" />
                  <circle cx="20" cy="20" r="10" className="palette-dial-b" pathLength={100} />
                </svg>
                <span className="palette-spectrum">
                  {mode.spectrum.map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </span>
                {active && (
                  <span className="palette-check">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="palette-name">{palette.label}</span>
              <span className="palette-mood">{palette.mood}</span>
            </button>
          );
        })}
      </div>

      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-row-text">
            <span className="settings-row-title">Tema</span>
            <span className="settings-row-note">Sistema segue o do computador. Alt P troca a atmosfera.</span>
          </span>
          <div className="segmented" role="radiogroup" aria-label="Tema">
            {themes.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={appearance.theme === id}
                data-active={appearance.theme === id}
                onClick={() => onChange({ theme: id })}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <span className="settings-row-text">
            <span className="settings-row-title">Cor de destaque</span>
            <span className="settings-row-note">Automático usa a da atmosfera.</span>
          </span>
          <div className="swatches" role="radiogroup" aria-label="Cor de destaque">
            <button
              type="button"
              role="radio"
              aria-checked={appearance.accent === "auto"}
              aria-label="Automático"
              title="Automático (da atmosfera)"
              data-active={appearance.accent === "auto"}
              className="swatch-auto"
              onClick={() => onChange({ accent: "auto" })}
            >
              <Sparkles size={13} aria-hidden="true" />
            </button>
            {(Object.keys(accents) as AccentId[]).map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={appearance.accent === id}
                aria-label={accents[id].label}
                title={accents[id].label}
                data-active={appearance.accent === id}
                style={{ background: accents[id].dark[0] }}
                onClick={() => onChange({ accent: id })}
              />
            ))}
          </div>
        </div>
        <label className="settings-row">
          <span className="settings-row-text">
            <span className="settings-row-title">Luz do fundo</span>
            <span className="settings-row-note">Intensidade dos brilhos atrás da página.</span>
          </span>
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            step={5}
            value={appearance.glow}
            onChange={(event) => onChange({ glow: Number(event.target.value) })}
            aria-label="Luz do fundo"
          />
        </label>
      </div>
    </section>
  );
}
