import { ArrowUpRight, Plus } from "lucide-react";
import type { FocusItem } from "@shared/model/settings";
import { Button } from "@shared/ui/button";

type Props = {
  items: FocusItem[];
  onAdd: () => void;
  onEdit: (item: FocusItem) => void;
};

export function FocusArea({ items, onAdd, onEdit }: Props) {
  return (
    <section className="section-block focus-section" aria-label="Área de foco">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CONTINUE DE ONDE PAROU</span>
          <h2>Em foco</h2>
        </div>
        <Button variant="ghost" className="text-button" onClick={onAdd}>
          <Plus size={15} /> Adicionar
        </Button>
      </div>
      <div className="focus-grid">
        {items.length ? (
          items.map((item, index) => (
            <article className="focus-card" key={item.id}>
              <div className="focus-top">
                <span className="focus-number">0{index + 1}</span>
                <button
                  className="focus-edit"
                  onClick={() => onEdit(item)}
                  aria-label={`Editar ${item.title}`}
                >
                  Editar
                </button>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description || "Prioridade definida por você."}</p>
              {item.url ? (
                <a href={item.url} className="continue-link">
                  Continuar <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              ) : (
                <button
                  className="continue-link muted-link"
                  onClick={() => onEdit(item)}
                >
                  Configurar destino{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              )}
            </article>
          ))
        ) : (
          <div className="empty-state">
            Nenhuma prioridade neste contexto. Você pode fixar até três.
          </div>
        )}
      </div>
    </section>
  );
}
