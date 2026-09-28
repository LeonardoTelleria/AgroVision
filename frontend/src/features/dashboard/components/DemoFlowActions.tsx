/**
 * =========================================
 * DemoFlowActions
 * =========================================
 *
 * Componente de navegación demo desde Dashboard.
 *
 * Finalidad:
 * - conectar visualmente las pantallas principales;
 * - guiar al usuario por el caso demo;
 * - explicar qué aporta cada módulo;
 * - evitar que el producto parezca un conjunto de páginas sueltas.
 *
 * Flujo esperado:
 * Dashboard → Alerts → Recommendations → Reports → Vision AI → Crops 
*/
/**
 * =========================================
 * DemoFlowActions
 * =========================================
 *
 * Navegación compacta entre módulos.
 */

type DemoRoutePath = "/alerts" | "/recommendations" | "/reports" | "/vision-ai" | "/crops" | "/mapping";

interface DemoFlowActionsProps {
  readonly fieldId: string;
  readonly zoneId: string;
  readonly cropType: string;
  readonly riskLevel: string;
}

const DEMO_FLOW_STEPS: ReadonlyArray<{ readonly path: DemoRoutePath; readonly label: string; readonly helper: string }> = [
  { path: "/mapping", label: "Mapping", helper: "Zona crítica" },
  { path: "/alerts", label: "Alertas", helper: "Riesgo detectado" },
  { path: "/recommendations", label: "Recomendaciones", helper: "Acción sugerida" },
  { path: "/reports", label: "Reporte", helper: "Trazabilidad" },
  { path: "/vision-ai", label: "Vision AI", helper: "Evidencia visual" },
  { path: "/crops", label: "Cultivos", helper: "Perfil agrícola" },
];

export function DemoFlowActions({ fieldId, zoneId, cropType, riskLevel }: DemoFlowActionsProps) {
  return (
    <section className="dashboardDemoFlow" aria-label="Flujo demo navegable">
      <header className="dashboardDemoFlow__header">
        <div>
          <p>Flujo prescriptivo</p>
          <h2>Explorar el caso activo</h2>
        </div>

        <span>{fieldId} · {zoneId} · {cropType} · {riskLevel}</span>
      </header>

      <div className="dashboardDemoFlow__grid">
        {DEMO_FLOW_STEPS.map((step) => (
          <button key={step.path} type="button" className="dashboardDemoStep" onClick={() => navigateToDemoRoute(step.path)}>
            <span className="dashboardDemoStep__icon">{/* SVG módulo */}</span>

            <span className="dashboardDemoStep__text">
              <strong>{step.label}</strong>
              <small>{step.helper}</small>
            </span>

            <span className="dashboardDemoStep__arrow">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function navigateToDemoRoute(path: DemoRoutePath) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event("popstate"));
}