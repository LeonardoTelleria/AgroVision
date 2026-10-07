/**
 * =========================================
 * useGeoman
 * =========================================
 *
 * Hook de dibujo y edición de borradores geográficos.
 *
 * Responsabilidad:
 * - cargar Geoman cuando se habilita la edición;
 * - administrar su instancia y sus eventos;
 * - coordinar los modos de dibujo y edición;
 * - emitir la colección GeoJSON de borradores;
 * - liberar los recursos al finalizar la sesión.
 *
 * Integración:
 * El consumidor monta un editor por instancia de MapLibre,
 * proporciona un mapa cargado y utiliza isReady para habilitar
 * las acciones de edición.
 *
 * Datos:
 * onChange entrega las geometrías administradas por Geoman.
 * El consumidor valida los borradores, asigna sus relaciones
 * de dominio y gestiona su persistencia.
 *
 * Concurrencia:
 * Las acciones se ejecutan en orden. Cada cambio de modo
 * desactiva los modos anteriores antes de activar el siguiente.
 * La reinicialización espera a que termine la limpieza anterior.
 *
 * =========================================
 */

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { Map } from "maplibre-gl";

// Importamos los tipos; la implementación se carga cuando se habilita la edición.
import type { DrawModeName, Geoman } from "@geoman-io/maplibre-geoman-free";

// Estilos oficiales de los elementos de dibujo y edición.
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";

/** Opciones de la sesión de edición. */
export interface UseGeomanOptions {
    // Habilita el editor; el valor predeterminado es false.
    readonly enabled?: boolean;
    // Entrega la colección completa de borradores después de un cambio.
    readonly onChange?: (draft: FeatureCollection) => void;
    // Notifica los errores de inicialización del editor.
    readonly onError?: (error: Error) => void;
}

/** Contrato público de las acciones de edición. */
export interface UseGeomanResult {
    readonly isReady: boolean;
    readonly drawZone: () => Promise<void>;
    readonly drawSamplingPoint: () => Promise<void>;
    readonly drawMeasurement: () => Promise<void>;
    readonly edit: () => Promise<void>;
    readonly cancel: () => Promise<void>;
}

/**
 * Conecta Geoman con una instancia cargada de MapLibre.
 *
 * @param map Instancia cartográfica disponible o null durante su carga.
 * @param options Configuración y callbacks del consumidor.
 * @returns Disponibilidad del editor y acciones asíncronas de dibujo y edición.
 */
export function useGeoman(map: Map | null, options: UseGeomanOptions = {}): UseGeomanResult {
    const { enabled = false } = options;

    // Conservamos la instancia que terminó de inicializarse.
    const geomanRef = useRef<Geoman | null>(null);

    // Asociamos la disponibilidad con el mapa concreto que posee el editor.
    const [readyMap, setReadyMap] = useState<Map | null>(null);

    // Serializamos las acciones y conservamos la limpieza pendiente.
    const commands = useRef<Promise<void>>(Promise.resolve());
    const teardown = useRef<Promise<void>>(Promise.resolve());

    // Utilizamos los callbacks vigentes sin reconstruir el editor por su identidad.
    const notifyChange = useEffectEvent((draft: FeatureCollection) => options.onChange?.(draft));
    const notifyError = useEffectEvent((error: Error) => options.onError?.(error));

    useEffect(() => {
        if (!map || !enabled) return;

        // Estas referencias pertenecen a esta sesión del efecto.
        let disposed = false;
        let geoman: Geoman | null = null;

        // Exportamos la colección completa después de crear, editar o eliminar una geometría.
        const handleChange = (): void => {
            if (geoman && !disposed) notifyChange(geoman.features.exportGeoJson());
        };

        // Liberamos la sesión una sola vez, incluso si coinciden desmontaje y eliminación del mapa.
        const dispose = (): void => {
            if (disposed) return;
            disposed = true;

            map.off("remove", dispose);
            setReadyMap((current) => current === map ? null : current);

            const instance = geoman;
            geoman = null;
            if (!instance) return;

            // Invalidamos las acciones pendientes vinculadas con esta instancia.
            if (geomanRef.current === instance) geomanRef.current = null;

            // Retiramos los listeners antes de destruir los recursos del editor.
            instance.mapAdapter.off("gm:create", handleChange);
            instance.mapAdapter.off("gm:editend", handleChange);
            instance.mapAdapter.off("gm:remove", handleChange);

            // Esperamos las acciones pendientes antes de liberar las fuentes de Geoman.
            teardown.current = commands.current.catch(() => undefined).then(() => instance.destroy({ removeSources: true })).catch(() => undefined);
        };

        // Liberamos también el editor cuando se elimina la instancia cartográfica.
        map.on("remove", dispose);

        // La carga y la inicialización pueden finalizar después de que termine esta sesión.
        void (async () => {
            try {
                // Esperamos a que finalice la limpieza de la sesión anterior.
                await teardown.current;
                if (disposed) return;

                // Cargamos la implementación únicamente al solicitar la edición.
                const { Geoman } = await import("@geoman-io/maplibre-geoman-free");
                if (disposed) return;

                // La interfaz de AgroVision proporciona los controles de edición.
                geoman = new Geoman(map, { settings: { controlsUiEnabledByDefault: false } });

                // Esperamos a que estén disponibles los recursos internos del plugin.
                const loaded = await geoman.waitForGeomanLoaded();
                if (disposed) return;
                if (!loaded) throw new Error("Geoman no pudo completar su inicialización.");

                // Escuchamos los cambios realizados sobre los borradores.
                geoman.mapAdapter.on("gm:create", handleChange);
                geoman.mapAdapter.on("gm:editend", handleChange);
                geoman.mapAdapter.on("gm:remove", handleChange);

                // Entregamos la instancia a las acciones cuando terminó de inicializarse.
                geomanRef.current = geoman;
                setReadyMap(map);
            } catch (error) {
                if (!disposed) {
                    // Liberamos la sesión antes de comunicar el fallo de inicialización.
                    dispose();
                    notifyError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        })();

        return dispose;
    }, [map, enabled]);

    /** Ejecuta una acción sobre la instancia vigente después de desactivar los modos anteriores. */
    const run = (operation: (instance: Geoman) => Promise<void>): Promise<void> => {
        // Capturamos la instancia a la que pertenece esta solicitud.
        const instance = geomanRef.current;

        // Una acción fallida permite que las solicitudes posteriores continúen.
        const command = commands.current.catch(() => undefined).then(async () => {
            if (!instance || instance !== geomanRef.current) throw new Error("Geoman todavía no está disponible para esta acción.");

            await instance.disableAllModes();

            // Ejecutamos la operación cuando la sesión continúa vigente.
            if (instance === geomanRef.current) await operation(instance);
        });

        commands.current = command;
        return command;
    };

    // Compartimos la activación de los modos de dibujo.
    const draw = (shape: DrawModeName): Promise<void> => run((instance) => instance.enableDraw(shape));

    return {
        isReady: enabled && map !== null && readyMap === map,
        // Dibuja un polígono que el consumidor puede convertir en una zona de dominio.
        drawZone: () => draw("polygon"),
        // Dibuja un punto de muestreo como marcador geográfico.
        drawSamplingPoint: () => draw("marker"),
        // Dibuja una línea cuyo largo puede calcular el consumidor con Turf.
        drawMeasurement: () => draw("line"),
        // Habilita la edición de las geometrías administradas por Geoman.
        edit: () => run((instance) => instance.enableGlobalEditMode()),
        // Finaliza los modos activos y conserva los borradores ya completados.
        cancel: () => run(async () => undefined),
    };
}