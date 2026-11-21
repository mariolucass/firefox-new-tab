import type { ComponentType, ReactNode } from "react";

type IconProps = { size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" };

type Props = {
  /** Ícone da seção (lucide), num glifo tingido pelo matiz da seção. */
  icon: ComponentType<IconProps>;
  title: string;
  /** Linha viva abaixo do título: "6 atalhos", "2 de 5 feitas"… */
  meta?: ReactNode;
  /** Teclas do atalho da seção, discretas ao lado do título. */
  hint?: string[];
  /** Ações à direita (de preferência botões de ícone com dica). */
  actions?: ReactNode;
};

/**
 * Cabeçalho único de seção. Glifo + título em serifa + metadados vivos + tecla,
 * ações à direita. Mantém `.section-heading` e o `h2`: o número da seção, o
 * brilho que percorre a linha e a entrada por máscara continuam no CSS.
 */
export function SectionHead({ icon: Icon, title, meta, hint, actions }: Props) {
  return (
    <div className="section-heading">
      <div className="section-title">
        <span className="section-glyph" aria-hidden="true">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <div className="section-title-text">
          <h2>
            {title}
            {hint && (
              <span className="section-hint" aria-hidden="true">
                {hint.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
            )}
          </h2>
          {meta && <p className="section-meta">{meta}</p>}
        </div>
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </div>
  );
}

type ActionProps = {
  icon: ComponentType<IconProps>;
  /** Rótulo para leitores de tela e dica ao pairar. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Número pequeno sobre o ícone (ex.: quantos abre). */
  badge?: number;
  /** Ação principal da seção: preenchida com o matiz. */
  primary?: boolean;
};

/** Botão de ícone das seções: quadrado de 40, dica nativa e rótulo acessível. */
export function SectionAction({ icon: Icon, label, onClick, disabled, badge, primary }: ActionProps) {
  return (
    <button
      type="button"
      className="section-action"
      data-primary={primary || undefined}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
      {badge !== undefined && badge > 0 && <span className="section-action-badge">{badge}</span>}
    </button>
  );
}
