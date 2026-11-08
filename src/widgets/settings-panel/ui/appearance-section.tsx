"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { accents, type AccentId } from "@shared/config/theme";
import type { Appearance, ThemeChoice } from "@features/preferences/model/use-appearance";

type Props = {
  appearance: Appearance;
  onChange: (patch: Partial<Appearance>) => void;
};

const themes: { id: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { id: "system", label: "Sistema", Icon: Monitor },
  { id: "dark", label: "Escuro", Icon: Moon },
  { id: "light", label: "Claro", Icon: Sun },
];

/** Tema, cor de destaque e intensidade do fundo. Tudo local e aplicado na hora. */
export function AppearanceSection({ appearance, onChange }: Props) {
  return (
    <section className="settings-section">
      <h3 className="settings-caption">Aparência</h3>
      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-row-text">
            <span className="settings-row-title">Tema</span>
            <span className="settings-row-note">Sistema segue o do computador.</span>
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
          </span>
          <div className="swatches" role="radiogroup" aria-label="Cor de destaque">
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
