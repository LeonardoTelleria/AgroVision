import type { ReactNode } from "react";

interface PanelProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly headerAction?: ReactNode;
  readonly showInfo?: boolean;
  readonly showCardTag?: boolean;
}

export function Panel({ title, children, className = "", headerAction, showInfo = true, showCardTag = false }: PanelProps) {
  return (
    <section className={`avPanel ${className}`}>
      <header className="avPanel__header">
        <div className="avPanel__title">
          <h2>{title}</h2>
          {showInfo && <span className="avInfoDot">i</span>}
        </div>

        {headerAction ?? (showCardTag && <span className="avCardTag">card</span>)}
      </header>

      {children}
    </section>
  );
}