/**
 * =========================================
 * ExpectedImpactBadge
 * =========================================
 *
 * Badge visual para (impacto esperado).
 *
 * Finalidad:
 * - resumir el área de impacto;
 * - explicar beneficio esperado;
*/

import type { ExpectedImpact } from "../types/recommendations.types";

interface ExpectedImpactBadgeProps {
    readonly impact: ExpectedImpact;
}

export function ExpectedImpactBadge({ impact }: ExpectedImpactBadgeProps) {
    return (
        <article
            className="expectedImpactBadge"
            aria-label={`Impacto esperado: ${formatImpactArea(impact.impactArea)}`}
        >
            <div className="expectedImpactBadge__header">
                <span
                    className="expectedImpactBadge__indicator"
                    aria-hidden="true"
                />

                <small>Impacto esperado</small>
            </div>

            <strong className="expectedImpactBadge__area">
                {formatImpactArea(impact.impactArea)}
            </strong>

            <p className="expectedImpactBadge__description">
                {impact.description}
            </p>
        </article>
    );
}


// Formatea el valor técnico solo para lectura visual. esto significa que no cambia el dato original.
function formatImpactArea(value: string): string {
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^\w/, (character) => character.toUpperCase());
}