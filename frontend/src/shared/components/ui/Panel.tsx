import type { ReactNode } from "react";
import infoIcon from '../../../assets/icons/info-icon2.svg'
interface PanelProps {
  readonly title: string | ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly headerAction?: ReactNode;
  readonly showInfo?: boolean;
  readonly showCardTag?: boolean;
}
                                                       //headerAction
export function Panel({ title, children, className = "", showInfo = true, showCardTag = false }: PanelProps) {
  return (
    <section className={`avPanel ${className}`}>
      <header className="avPanel__header">
        <div className="avPanel__title">
          <h2>{title}</h2>
          
        </div>

        {/* {headerAction ?? (showCardTag && <span className="avCardTag">card</span>)} */}
      </header>

      {children}
    </section>
  );
}