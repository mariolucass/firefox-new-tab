import { ArrowUpRight, Plus } from "lucide-react";
import type { Shortcut } from "@shared/model/settings";
import { Button } from "@shared/ui/button";
import { ShortcutIcon } from "@shared/ui/shortcut-icon";

type Props = {
  title: string;
  eyebrow: string;
  items: Shortcut[];
  onAdd: () => void;
  onEdit: (item: Shortcut) => void;
};

export function ShortcutGrid({ title, eyebrow, items, onAdd, onEdit }: Props) {
  return (
    <section className="section-block" aria-label={title}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <Button variant="ghost" className="text-button" onClick={onAdd}>
          <Plus size={15} /> Adicionar
        </Button>
      </div>
      {items.length ? (
        <div className="shortcut-grid">
          {items.map((item) => (
            <div className="shortcut-card" key={item.id}>
              <a
                href={item.url}
                className="shortcut-link"
                title={`Abrir ${item.label}`}
              >
                <span className="shortcut-icon" aria-hidden="true">
                  <ShortcutIcon icon={item.icon} label={item.label} />
                </span>
                <span className="shortcut-label">{item.label}</span>
                <ArrowUpRight
                  className="shortcut-arrow"
                  size={16}
                  aria-hidden="true"
                />
              </a>
              <button
                className="card-edit"
                onClick={() => onEdit(item)}
                aria-label={`Editar ${item.label}`}
              >
                •••
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          Nenhum atalho aqui. Adicione o primeiro para este espaço.
        </div>
      )}
    </section>
  );
}
