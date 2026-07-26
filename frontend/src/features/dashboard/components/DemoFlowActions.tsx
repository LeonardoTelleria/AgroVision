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

type DemoRoutePath =
    | "/alerts"
    | "/recommendations"
    | "/reports"
    | "/vision-ai"
    | "/crops";

interface DemoFlowActionsProps {
    readonly fieldId: string;
    readonly zoneId: string;
    readonly cropType: string;
    readonly riskLevel: string;
}

/**
 * Definición de cada paso del recorrido demo.
 *
 * path:
 * Ruta interna a la que navegará el botón.
 *
 * label:
 * Nombre visible del módulo.
 *
 * description:
 * Explica qué valida el usuario en esa pantalla.
 *
 * status:
 * Estado visual resumido para la tarjeta.
 */
const DEMO_FLOW_STEPS: ReadonlyArray<{
    readonly path: DemoRoutePath;
    readonly label: string;
    readonly description: string;
    readonly status: "ACTIVE" | "PENDING" | "HIGH";
    readonly actionLabel: string;
}> = [
    {
        path: "/alerts",
        label: "Alertas",
        description: "Revisar la alerta generada para la zona crítica y su evidencia técnica.",
        status: "ACTIVE",
        actionLabel: "Abrir alertas",
    },
    {
        path: "/recommendations",
        label: "Recomendaciones",
        description: "Consultar la acción sugerida, su razón técnica y el impacto esperado.",
        status: "PENDING",
        actionLabel: "Ver recomendación",
    },
    {
        path: "/reports",
        label: "Reporte",
        description: "Validar trazabilidad completa: riesgo, evidencia, alertas y acciones.",
        status: "HIGH",
        actionLabel: "Abrir reporte",
    },
    {
        path: "/vision-ai",
        label: "Vision AI",
        description: "Ver análisis visual preliminar y limitación técnica del resultado.",
        status: "ACTIVE",
        actionLabel: "Ir a Vision AI",
    },
    {
        path: "/crops",
        label: "Cultivos",
        description: "Revisar perfiles estratégicos y criterios de análisis por cultivo.",
        status: "ACTIVE",
        actionLabel: "Ver cultivos",
    },
];

/**
 * Renderiza acciones de navegación del flujo demo.
 *
 * Funcionamiento:
 * - muestra el caso oficial field/zone/crop/risk;
 * - lista los módulos conectados;
 * - permite navegar sin instalar router externo;
 * - dispara evento popstate para que App.tsx actualice activePath si lo escucha.
 */
export function DemoFlowActions({fieldId, zoneId, cropType, riskLevel}: DemoFlowActionsProps) {
    return (
        <section className="dashboardDemoFlow" aria-label="Flujo demo navegable">
            <header className="dashboardDemoFlow__header">
                <div>
                    <p>Flujo demo navegable</p>
                    <h2>Del riesgo a la decisión técnica</h2>
                    <span>
                        Sigue el caso {fieldId} · {zoneId} · {cropType} para entender cómo
                        AgroVision conecta evidencia, alertas, recomendaciones y reporte.
                    </span>
                </div>
                <strong>{riskLevel}</strong>
            </header>

            <div className="dashboardDemoFlow__grid">
                {DEMO_FLOW_STEPS.map((step) => (
                <article key={step.path} className="dashboardDemoStep">
                    <div className="dashboardDemoStep__content">
                        <StatusBadge status={step.status} />
                        <h3>{step.label}</h3>
                        <p>{step.description}</p>
                    </div>

                    <button
                    type="button"
                    className="dashboardDemoStep__button"
                    onClick={() => navigateToDemoRoute(step.path)}
                    >
                    {step.actionLabel}
                    </button>
                </article>
                ))}
            </div>
        </section>
    );
}

interface StatusBadgeProps {
    readonly status: "ACTIVE" | "PENDING" | "HIGH";
}

/**
 * Renderiza badge de estado para cada paso.
 *
 * ACTIVE:
 * Módulo activo dentro del flujo demo.
 *
 * PENDING:
 * Acción pendiente o sugerida.
 *
 * HIGH:
 * Riesgo alto o elemento crítico.
 */
function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span className={`dashboardDemoStatus dashboardDemoStatus--${status.toLowerCase()}`}>{status}</span>
    );
}

/**
 * Navega internamente sin instalar router externo.
 *
 * Funcionamiento:
 * - cambia la URL con history.pushState;
 * - dispara evento popstate;
 * - App.tsx puede reaccionar y actualizar activePath;
 * - si App.tsx no escucha popstate, el href/sidebar seguirá siendo fallback manual.
 */
function navigateToDemoRoute(path: DemoRoutePath) {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new Event("popstate"));
}

