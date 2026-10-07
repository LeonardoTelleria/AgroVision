
/**
 * =========================================
 * ZoneInsight Map Adapter
 * =========================================
 *
 * Adaptador entre resultados prescriptivos y propiedades GIS.
 *
 * Responsabilidad:
 * - seleccionar el análisis más reciente de cada zona;
 * - comprobar la correspondencia de zoneId y fieldId;
 * - incorporar las métricas analíticas al GeoJSON;
 * - representar las zonas pendientes de evaluación;
 * - informar los análisis que carecen de correspondencia.
 *
 * Integración:
 * Recibe análisis validados mediante zoneInsightServices.ts
 * y conserva las geometrías proporcionadas por el consumidor.
 *
 * =========================================
 */

// Importamos el contrato geográfico compartido.
import type { ZoneFeatureCollection } from "../types/mappingGeo.types";

// Importamos el contrato del análisis prescriptivo.
import type { ZoneInsight } from "../types/zoneInsight.types";

/** Resultado de la asociación entre geometrías y análisis. */
export interface ZoneInsightMapResult {
    // Colección con las propiedades analíticas actualizadas.
    readonly zones: ZoneFeatureCollection;
    // Identificadores de análisis que carecen de una correspondencia válida.
    readonly unmatchedZoneIds: readonly string[];
}

/**
 * Incorpora los análisis vigentes a las propiedades de las zonas.
 *
 * Crea una colección, features y propiedades nuevas.
 * Conserva las referencias de las geometrías originales.
 *
 * @param zones Colección geográfica de zonas.
 * @param insights Análisis válidos disponibles para la asociación.
 * @returns Zonas enriquecidas e identificadores de análisis sin correspondencia.
 */
export function enrichZonesWithInsights(
    zones: ZoneFeatureCollection,
    insights: readonly ZoneInsight[],
): ZoneInsightMapResult {
    // Indexamos el análisis más reciente de cada zona.
    const byZone = new Map<string, ZoneInsight>();

    for (const insight of insights) {
        const existing = byZone.get(insight.zoneId);

        if (!existing || Date.parse(insight.generatedAt) > Date.parse(existing.generatedAt)) {
            byZone.set(insight.zoneId, insight);
        }
    }

    // Inicialmente todos los análisis están pendientes de asociarse.
    const unmatched = new Set(byZone.keys());

    const features = zones.features.map((zone) => {
        const insight = byZone.get(zone.properties.zoneId);

        // Exigimos la correspondencia de la zona y de su field.
        const matches = insight && String(zone.properties.fieldId) === insight.fieldId;

        if (matches) {
            unmatched.delete(insight.zoneId);
        }

        return {
            ...zone,
            properties: {
                ...zone.properties,
                // Aplicamos el análisis vigente o limpiamos las métricas anteriores.
                riskLevel: matches ? insight.finalRiskLevel : null,
                healthScore: matches ? insight.healthScore : null,
                mainCause: matches ? insight.mainCause : null,
                summary: matches ? insight.summary : null,
                recommendedAction: matches ? insight.recommendedAction : null,
                generatedAt: matches ? insight.generatedAt : null,
            },
        };
    });

    return {
        zones: {
            ...zones,
            features,
        },
        unmatchedZoneIds: [...unmatched],
    };
}

/**
 * =========================================
 * DOCUMENTACIÓN DEL MÓDULO
 * =========================================
 *
 * Asociación:
 * zoneId identifica la zona y fieldId confirma su pertenencia.
 * Los fieldId numéricos del GIS se comparan mediante su
 * representación textual con el contrato del backend.
 *
 * Selección temporal:
 * Cuando existen varios análisis de una zona, se selecciona
 * el de generatedAt más reciente. Después se comprueba que
 * pertenezca al field de la geometría.
 *
 * Correspondencia de propiedades:
 * finalRiskLevel se incorpora como riskLevel.
 * healthScore, mainCause, summary, recommendedAction y
 * generatedAt conservan sus valores originales.
 *
 * Zonas pendientes:
 * Cuando falta una asociación válida, las métricas analíticas
 * se establecen en null. Así se elimina información procedente
 * de una asociación anterior.
 *
 * Inmutabilidad:
 * La función crea una colección nueva y copia cada feature
 * y sus propiedades. Las geometrías mantienen sus referencias
 * porque la operación actualiza información descriptiva.
 *
 * Diagnóstico:
 * unmatchedZoneIds contiene identificadores de análisis que
 * carecen de geometría correspondiente o presentan otro fieldId.
 * Las zonas que carecen de análisis se reconocen por sus
 * propiedades analíticas en null.
 *
 * =========================================
 */