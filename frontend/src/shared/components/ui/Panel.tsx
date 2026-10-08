import type { ReactNode } from "react";

interface PanelProps {
  readonly title: string | ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly headerAction?: ReactNode;
  readonly showInfo?: boolean;
  readonly showCardTag?: boolean;
}

export function Panel({
  title,
  children,
  className = "",
  headerAction,
  
}: PanelProps) {
  return (
    <section className={`avPanel ${className}`}>
      <header className="avPanel__header">
        <div className="avPanel__title">
          <h2>{title}</h2>

          {/* Presentamos la acción opcional proporcionada por el consumidor. */}
          {headerAction}
        
        </div>
      </header>
      {children}
    </section>
  );
}
