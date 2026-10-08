# Manual de desarrollo de AgroVision Intelligence

Repositorio: https://github.com/luis-hdz7/AgroVision  
Ubicación de este manual: `instructions.md`, en la raíz del repositorio.  
Referencia de la revisión: `origin/master`, commit `0665791b875fa7cf37bd1b3a8586bc5c2f46c0cc`, del 7 de octubre de 2026.

Este manual permite configurar un clon limpio, ejecutar los servicios, ubicar cada responsabilidad y entregar cambios reproducibles. Los comandos se ejecutan desde la raíz de AgroVision, salvo que se indique otra carpeta. Cada integrante debe actualizar las secciones afectadas cuando cambien scripts, variables de entorno, rutas o contratos.

## 1. Estado de referencia

| Área | Estado comprobado en la revisión |
| --- | --- |
| Aplicación web | React, TypeScript y Vite; navegación en `frontend/src/app/AppRouter.tsx`. |
| API | Express y TypeScript; arranque en `backend/src/server.ts`. |
| GIS | MapLibre, Turf y Geoman; integrado mediante `MappingGIS` en Dashboard y Mapping. |
| Satélite y NDVI | Raster WMS de Copernicus; requieren una instancia configurada y acceso al servicio externo. |
| Clima | Servicio frontend que consulta Open-Meteo. |
| Servicio Python | FastAPI; analizador heurístico en `ai-service/app/visionAnalyser.py`. |
| Persistencia | Schema y migración inicial de Prisma presentes. `prisma.ts`, `database.types.ts` y `seeds.ts` contienen comentarios, pero aún carecen de implementación ejecutable. |
| Datos de negocio | Hay servicios con datos locales y simulados. Que un endpoint responda no demuestra que consulte PostgreSQL. |
| Pruebas | Existen scripts de smoke test y reportes; todavía no hay una suite general funcional bajo `npm test`. |

La configuración local de un integrante y los archivos no publicados en Git no forman parte de un clon limpio. Antes de asignar una integración, verificar la rama y los archivos realmente disponibles.

## 2. Estructura principal

```text
AgroVision/
├── instructions.md
├── README.md
├── package.json
├── package-lock.json
├── prisma7.config.ts
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seeds.ts
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── shared/
│       │   ├── database/
│       │   └── responses/
│       ├── data/mocks/
│       └── modules/
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── app/
│       ├── assets/
│       ├── shared/
│       └── features/
├── ai-service/
│   ├── requirements.txt
│   ├── main.py
│   └── app/
├── contracts/
└── docs/
```

| Ruta | Responsabilidad |
| --- | --- |
| `package.json` | Scripts de coordinación y dependencias de raíz. |
| `frontend/src/app/` | Shell de la aplicación, navegación y registro de páginas. |
| `frontend/src/features/<modulo>/` | Componentes, páginas, hooks, servicios, tipos y estilos de una funcionalidad. |
| `frontend/src/shared/` | UI reutilizable, estilos generales, utilidades y catálogo de endpoints. |
| `frontend/src/assets/` | Iconos, logotipos y recursos gráficos consumidos por la interfaz. |
| `backend/src/app.ts` | Configuración de Express y registro de la mayoría de las rutas. |
| `backend/src/server.ts` | Arranque del servidor; actualmente también registra las rutas de Mapping. |
| `backend/src/modules/<modulo>/` | Rutas, controladores, servicios, tipos y lógica de negocio. |
| `backend/src/shared/database/` | Punto compartido de integración con la persistencia. |
| `backend/prisma/` | Modelo de datos, historial de migraciones y futura carga inicial. |
| `ai-service/` | Servicio Python de análisis visual. |
| `contracts/` | Contratos y documentación de intercambio entre sistemas. |
| `docs/` | Arquitectura, guías técnicas, evidencia y documentación por área. |

## 3. Requisitos del equipo

Instalar Git, Node.js con npm y Visual Studio Code. Para el servicio Python, instalar Python y disponer de `venv` y `pip`. PostgreSQL es necesario cuando se trabaje con persistencia real.

Para este proyecto, utilizar Node.js **22.12 o superior dentro de la rama 22**, o una versión posterior compatible con todas las dependencias. Vite requiere una versión compatible; la indicación genérica “Node 20+” del README no es suficientemente precisa. Acordar una misma versión de Node y npm dentro del equipo.

Python 3.11 es la referencia inicial indicada en el repositorio. La instalación completa debe comprobarse contra las versiones declaradas en `ai-service/requirements.txt`; este manual no garantiza que todas tengan distribución disponible para cualquier versión de Python o sistema operativo.

Comprobar las herramientas:

```powershell
git --version
node --version
npm --version
python --version
```

En Windows, si `python` no identifica la instalación correcta, comprobar el lanzador con `py --version` y utilizar el intérprete acordado por el equipo.

## 4. Configuración desde un clon limpio

### 4.1. Clonar y abrir el proyecto

```powershell
git clone https://github.com/luis-hdz7/AgroVision.git
cd AgroVision
git branch --show-current
git status --short
```

Abrir esta carpeta raíz en Visual Studio Code. Si el comando de VS Code está disponible:

```powershell
code .
```

La rama predeterminada comprobada es `master`. Si el equipo asigna otra rama de integración, utilizar esa rama antes de instalar o desarrollar.

### 4.2. Instalar todas las dependencias JavaScript

Ejecutar en este orden desde la raíz:

```powershell
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

Existen tres `package.json` y tres `package-lock.json`. Una instalación únicamente en la raíz no instala por sí sola todos los paquetes del backend y del frontend. Actualmente ambos paquetes también declaran una dependencia local `file:..`, por lo que la instalación de raíz forma parte de la preparación.

`npm ci` utiliza el archivo de bloqueo y falla si no coincide con el manifiesto. Al fallar, leer el primer error y comprobar la rama y los archivos involucrados. La solución debe corregir el paquete afectado y su archivo de bloqueo; evitar regenerar todos los bloqueos sin identificar la causa.

### 4.3. Preparar la configuración local

| Archivo local | Uso | Estado de la plantilla en la revisión |
| --- | --- | --- |
| `frontend/.env.local` | Variables públicas del frontend y destino del proxy de desarrollo. | `frontend/.env.example` no estaba publicado en `master`. Si existe en otra rama, utilizar su contenido actualizado. |
| `backend/.env` | Configuración del backend cuando su inicialización carga este archivo. | Existe `backend/.env.example`. |
| `.env` en la raíz | Configuración que carga `prisma7.config.ts` al ejecutar Prisma desde la raíz. | No se encontró una plantilla de raíz publicada. |

Crear `frontend/.env.local` con los valores necesarios:

```dotenv
# Origen del backend utilizado por el proxy /api de Vite.
VITE_API_BASE_URL=http://localhost:3000

# Instancia WMS compartida por Sentinel-2 y NDVI.
VITE_COPERNICUS_SENTINEL_INSTANCE_ID=fec80739-7c5b-4940-a6b0-6acd67dea423
```

Si el archivo ya existe, agregar o ajustar estas entradas conservando sus otras variables. La instancia debe contener las capas que consume el código, como `NATURAL-COLOR` y `NDVI`. Reiniciar Vite después de modificar el entorno.

Las variables `VITE_*` llegan al navegador. Mantener credenciales privadas de base de datos, claves JWT y secretos de otros servicios exclusivamente en el backend o en la configuración de despliegue.

Preparar `backend/.env`, solo si aún no existe:

```powershell
Copy-Item backend/.env.example backend/.env
```

La plantilla actual contiene:

```dotenv
PORT=3000
NODE_ENV=development
AI_SERVICE_URL=http://localhost:8000
```

**Detalle de implementación:** en el arranque backend revisado no existe una carga explícita de `dotenv/config`. Crear `backend/.env` no basta para asegurar que ese proceso lea sus valores. El puerto 3000 funciona por el valor predeterminado de `server.ts`; para otros valores, utilizar variables del proceso o implementar la carga centralizada del entorno en el backend. `AI_SERVICE_URL` está documentada en la plantilla, pero el servicio de visión actual devuelve una respuesta simulada y aún no realiza esa conexión HTTP.

Para Prisma, crear `.env` en la raíz con la conexión proporcionada por el encargado de BD:

```dotenv
# Ejemplo: sustituir usuario, contraseña, servidor y nombre de base.
DIRECT_URL=postgresql://usuario:contrasena@localhost:5432/agrovision
```

`prisma7.config.ts` lee específicamente `DIRECT_URL`. Utilizar únicamente una base local o de desarrollo para los comandos de desarrollo. El backend futuro debe documentar por separado su conexión de ejecución si utiliza otra variable o un adaptador.

### 4.4. Preparar el servicio Python

Desde la raíz, en Windows PowerShell:

```powershell
python -m venv ai-service/.venv
& ./ai-service/.venv/Scripts/python.exe -m pip install -r ai-service/requirements.txt
```

Linux o macOS:

```bash
python3 -m venv ai-service/.venv
ai-service/.venv/bin/python -m pip install -r ai-service/requirements.txt
```

Usar el ejecutable del entorno evita depender de su activación en cada terminal. Si se prefiere activarlo en PowerShell:

```powershell
./ai-service/.venv/Scripts/Activate.ps1
```

La lista completa declarada actualmente es:

```text
fastapi
uvicorn
pydantic
python-multipart
torch==2.14.0
torchvision==0.29.0
networkx==3.7
numpy==2.5.3
optuna==5.0.0
```

Si `pip` informa que una versión no está disponible, la instalación completa no quedó resuelta. El responsable de IA debe revisar la compatibilidad y actualizar `requirements.txt` de forma conjunta. Los módulos Python actuales importan FastAPI y Pydantic; esto no convierte automáticamente el resto de las dependencias declaradas en dependencias validadas ni en un modelo entrenado.

## 5. Ejecutar AgroVision

Utilizar una terminal independiente por servicio.

### 5.1. Backend

Desde la raíz:

```powershell
npm run dev:backend
```

Dirección predeterminada: `http://localhost:3000`. Verificar:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Para definir temporalmente el puerto en PowerShell, en la misma terminal antes del arranque:

```powershell
$env:PORT = "3001"
npm run dev:backend
```

Si se cambia el puerto, actualizar `VITE_API_BASE_URL` y reiniciar Vite. El smoke test actual tiene `http://localhost:3000` escrito en su código, por lo que también requiere ajuste si se prueba otro puerto.

### 5.2. Frontend

En otra terminal, desde la raíz:

```powershell
npm run dev:frontend
```

Abrir la dirección que imprime Vite. Normalmente es `http://localhost:5173`, pero la configuración publicada no fija un puerto estricto y Vite puede seleccionar otro si está ocupado.

Las páginas registradas incluyen `/dashboard`, `/mapping`, `/crops`, `/vision-ai`, `/alerts`, `/recommendations`, `/reports` y `/field-notebook`.

El Dashboard y Mapping forman parte de la aplicación normal. No es necesario iniciar un segundo frontend ni ejecutar el ejemplo `mappingGisPreview.tsx` para ver el GIS integrado. El ejemplo aislado solo se ejecuta cuando su HTML de entrada y sus scripts están configurados; no es una ruta de aplicación por existir dentro de `examples/`.

### 5.3. Servicio de IA

En Windows, desde la raíz:

```powershell
& ./ai-service/.venv/Scripts/python.exe -m uvicorn main:app --app-dir ai-service --reload --port 8000
```

Linux o macOS:

```bash
ai-service/.venv/bin/python -m uvicorn main:app --app-dir ai-service --reload --port 8000
```

Comprobar `http://localhost:8000/health`. La documentación interactiva de FastAPI está en `http://localhost:8000/docs`.

Levantar este servicio no modifica el servicio de visión del backend. La integración entre ambos debe implementarse expresamente y validarse con una petición real.

### 5.4. Detener y reiniciar

Presionar `Ctrl + C` en cada terminal. Reiniciar el servicio afectado después de cambiar variables de entorno o dependencias. Para actualizar un clon sin cambios locales pendientes:

```powershell
git pull --ff-only
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

Reinstalar Python si cambió `ai-service/requirements.txt`. Revisar migraciones si cambió `backend/prisma/`. Si hay cambios locales, resolver su situación con Git antes de actualizar la rama.

## 6. Gestión de dependencias

### 6.1. JavaScript y TypeScript

Instalar cada paquete en el lugar donde se consume. La distribución actual incluye dependencias GIS en la raíz; cualquier traslado al frontend debe modificar los manifiestos y bloqueos correspondientes en el mismo cambio.

Ejemplos desde la raíz:

```powershell
# Dependencia de ejecución del frontend.
npm --prefix frontend install nombre-del-paquete

# Herramienta de desarrollo del frontend.
npm --prefix frontend install -D nombre-del-paquete

# Dependencia de ejecución del backend.
npm --prefix backend install nombre-del-paquete

# Herramienta de desarrollo del backend.
npm --prefix backend install -D nombre-del-paquete
```

Para eliminar un paquete:

```powershell
npm --prefix frontend uninstall nombre-del-paquete
```

Entregar juntos el `package.json` y el `package-lock.json` del paquete afectado. Comprobar después que un clon puede instalar con `npm ci`. Evitar instalaciones globales como requisito oculto para ejecutar comandos del proyecto.

### 6.2. Python

Instalar en `ai-service/.venv` y actualizar `ai-service/requirements.txt`. Si el archivo se mantiene como una captura completa del entorno, ejecutar desde un entorno limpio dedicado únicamente a AgroVision:

```powershell
& ./ai-service/.venv/Scripts/python.exe -m pip freeze | Set-Content -Encoding utf8 ai-service/requirements.txt
```

Revisar el diff antes de confirmar: ese comando incluye dependencias transitivas y cambia el formato de una lista que contenga solo dependencias directas. Mantener una única política de dependencias Python acordada por el equipo.

## 7. Organización y conexiones entre módulos

### 7.1. Frontend

| Módulo | Ruta | Conexiones principales |
| --- | --- | --- |
| Dashboard | `frontend/src/features/dashboard/` | Resumen agrícola, componentes compartidos, GIS y clima. |
| Mapping | `frontend/src/features/mapping/` | MapLibre, Geoman, Turf, Copernicus, análisis por zona y datos GIS. |
| Weather | `frontend/src/features/weather/` | Open-Meteo y modal meteorológico consumido por la interfaz. |
| Crops | `frontend/src/features/crops/` | Perfiles de cultivo y contratos agrícolas. |
| Vision AI | `frontend/src/features/vision-ai/` | Endpoint de visión y presentación de resultados. |
| Alerts | `frontend/src/features/alerts/` | API de alertas y navegación hacia sus zonas. |
| Recommendations | `frontend/src/features/recommendations/` | Recomendaciones, evidencia e impacto. |
| Reports | `frontend/src/features/reports/` | Reportes prescriptivos y evidencia. |
| Field Notebook | `frontend/src/features/field-notebook/` | Registro y consulta de operaciones de campo. |

Una funcionalidad nueva organiza sus archivos en `pages/`, `components/`, `hooks/`, `services/`, `types/` y `utils/` según sus responsabilidades. Crear solo las carpetas que tengan contenido real. Registrar su navegación en `frontend/src/app/AppRouter.tsx` y actualizar los tipos y el shell cuando corresponda.

### 7.2. Backend

Los módulos presentes son `farms`, `fields`, `crops`, `sensors`, `telemetry`, `users`, `mapping`, `vegetation`, `vision`, `analysis`, `risk`, `alerts`, `recommendations`, `reports`, `field-notebook` y `dashboard`. La presencia de una carpeta o de tipos no implica que exista un CRUD, una ruta registrada o persistencia.

Para nuevos módulos, usar rutas coherentes:

| Carpeta | Responsabilidad |
| --- | --- |
| `backend/src/modules/<modulo>/routes/` | Método HTTP, URL y conexión con el controlador. |
| `backend/src/modules/<modulo>/controllers/` | Entrada HTTP validada y respuesta API. |
| `backend/src/modules/<modulo>/services/` | Reglas de negocio y coordinación de operaciones. |
| `backend/src/modules/<modulo>/repositories/` | Consultas y escritura en BD, cuando se implemente esa separación. |
| `backend/src/modules/<modulo>/schemas/` | Validación de datos de entrada y otros límites externos. |
| `backend/src/modules/<modulo>/types/` | Contratos del módulo. |

`repositories/` es la ubicación propuesta para nuevas integraciones de persistencia, no una carpeta ya implementada en todos los módulos. Reutilizar los servicios y reglas existentes antes de crear equivalentes.

Existen rutas históricas como `farms/routs/`, `farms/service/`, `dashboard/service/` y servicios dentro de `vegetation/types/services/`. Al normalizarlas, actualizar todos sus imports y comprobar la compilación en el mismo cambio; una corrección de carpeta aislada puede romper consumidores.

### 7.3. Contrato de API

El backend utiliza `backend/src/shared/responses/apiResponses.ts`:

```typescript
interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly message: string;
  readonly error: string | null;
  readonly timestamp: string;
}
```

Los servicios frontend deben comprobar el estado HTTP, el éxito de la respuesta y la validez de `data`. Un cast de TypeScript no valida JSON recibido. Los adaptadores convierten tipos de BD y respuestas externas al contrato de la interfaz.

Centralizar las rutas frontend en `frontend/src/shared/api/endpoints.ts`. Verificar su correspondencia con Express: actualmente `farmOverview` declara `/api/farm/overview`, mientras que el backend registra `/api/farms/overview`. El catálogo requiere esa corrección antes de conectar ese consumidor a la API real.

Los IDs deben conservar una identidad consistente entre BD, API, GeoJSON, navegación y análisis. Los IDs numéricos del schema y los IDs de demostración como `field-001` no son intercambiables sin una conversión definida. Documentar también el formato ISO de fechas, unidades y tratamiento de `Decimal` en las respuestas JSON.

## 8. Desarrollo GIS

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `layers/baseMap.ts` | Configuración central del mapa base. |
| `hooks/useAgroMap.ts` | Creación, disponibilidad y limpieza de la instancia MapLibre. |
| `layers/` | Fuentes y representación de campos, zonas, riesgo, trayectoria, rover y raster. |
| `services/mappingEngine.ts` | Coordinación de las capas de una instancia. |
| `hooks/useMappingLayers.ts` | Integración del coordinador con React. |
| `hooks/useZoneInsights.ts` | Solicitudes, cancelación e identidad de análisis por zona. |
| `services/zoneInsightServices.ts` | Consulta y validación de la respuesta de análisis. |
| `services/zoneInsightMapAdapter.ts` | Correspondencia entre análisis y features GIS. |
| `hooks/useGeoman.ts` | Ciclo de vida y herramientas de edición de geometrías. |
| `components/MappingGIS.tsx` | Composición reutilizable del mapa y sus controles. |
| `pages/MappingPage.tsx` | Estado de la pantalla, filtros, inspector, borradores y recorrido. |
| `mappingGis.css` | Estilos del GIS y adaptación responsive. |
| `utils/copernicusWms.ts` | Construcción compartida de solicitudes WMS. |
| `data/` | GeoJSON y recorridos de demostración mientras se integra la fuente persistente. |

Mantener una instancia cartográfica por contenedor. Registrar listeners con su limpieza correspondiente. Eliminar las capas antes de su fuente. Las actualizaciones de datos deben reutilizar fuentes y capas cuando sea posible, conservando el estado de navegación.

El contrato GeoJSON utiliza coordenadas `[longitud, latitud]` en grados. Las distancias mostradas deben indicar su unidad. Los cálculos del rover y las mediciones utilizan Turf; la simulación visual no equivale a telemetría real.

Los borradores conservan su estado durante la sesión de la pantalla y al reabrir el editor. Su exportación GeoJSON no implica almacenamiento en PostgreSQL. El borrado de dibujos del editor y la retirada de la ruta del rover son acciones distintas.

Comprobar antes de entregar cambios GIS:

1. El mapa se renderiza en Dashboard y Mapping y se redimensiona con su contenedor.
2. Las capas visibles coinciden con el selector.
3. Los polígonos permanecen legibles sobre satélite y NDVI.
4. Selección y popup muestran la zona correcta.
5. Medición, edición, borrado individual y limpieza de borradores funcionan.
6. Una ruta dibujada y su edición actualizan el recorrido y el panel del rover.
7. Pausa, reanudación, retirada y desmontaje liberan la animación.
8. La interfaz permite usar las herramientas y cerrar el inspector en pantallas pequeñas.

El raster Sentinel-2 tiene una resolución espacial propia; aumentar el zoom o el tamaño del tile no crea detalle nuevo. Distinguir un límite de resolución de errores de carga o de opacidad.

## 9. Base de datos y Prisma

### 9.1. Archivos oficiales

| Archivo | Función |
| --- | --- |
| `prisma7.config.ts` | Configuración CLI; apunta al schema y migraciones del backend y lee `DIRECT_URL`. |
| `backend/prisma/schema.prisma` | Definición de modelos y relaciones. |
| `backend/prisma/migrations/` | Historial versionado de cambios de esquema. |
| `backend/prisma/seeds.ts` | Ubicación prevista para datos iniciales; pendiente de implementación. |
| `backend/src/shared/database/prisma.ts` | Ubicación prevista para la conexión compartida; pendiente de implementación. |
| `backend/src/generated/prisma/` | Salida del generador indicada por el schema. |

El schema incluye usuarios, fincas, campos, perfiles de cultivo, cultivos, sensores, telemetría, inspecciones visuales, vegetación, evidencia, análisis por zona, alertas, recomendaciones, cuaderno y reportes. En el schema revisado no existe un modelo `Zone` ni geometrías PostGIS; muchos registros contienen `zoneId` como texto. Esa parte necesita diseño y migraciones para persistir las zonas GIS con relaciones reales.

### 9.2. CLI y versiones

La raíz declara Prisma `^7.10.0`; el backend declara Prisma `^8.0.0-rc.19` y cliente `^7.10.0`. Esta divergencia necesita alineación antes de estandarizar la ejecución Prisma del backend.

Mientras se conserva la configuración revisada, ejecutar la CLI instalada en la raíz y pasar siempre el archivo de configuración explícitamente. Desde la raíz:

```powershell
# Comprobar la versión local y validar el schema.
node ./node_modules/prisma/build/index.js --version
node ./node_modules/prisma/build/index.js validate --config ./prisma7.config.ts

# Generar el cliente definido por el schema.
node ./node_modules/prisma/build/index.js generate --config ./prisma7.config.ts

# Consultar el estado del historial de migraciones.
node ./node_modules/prisma/build/index.js migrate status --config ./prisma7.config.ts
```

El archivo de configuración lee `DIRECT_URL` al cargarse, por lo que debe estar definida incluso para estos comandos. Generar el cliente no implementa una conexión que todavía está vacía ni conecta automáticamente los servicios existentes.

### 9.3. Aplicar o crear migraciones

Para aplicar el historial existente a una base de desarrollo preparada por el encargado:

```powershell
node ./node_modules/prisma/build/index.js migrate deploy --config ./prisma7.config.ts
```

Para crear una migración después de modificar el schema, únicamente sobre una base de desarrollo apropiada:

```powershell
node ./node_modules/prisma/build/index.js migrate dev --name descripcion_del_cambio --config ./prisma7.config.ts
node ./node_modules/prisma/build/index.js generate --config ./prisma7.config.ts
```

Prisma 7 requiere generar el cliente y ejecutar la carga inicial explícitamente; la migración no debe considerarse equivalente a esas dos operaciones. No existe aún un comando de seed funcional que este manual pueda recomendar en el estado revisado.

Entregar el schema modificado junto con su nueva migración. Mantener intactas las migraciones ya compartidas y aplicadas. Si trabajan dos encargados de BD, acordar quién crea cada migración y quién revisa su relación con las demás; evitar generar en paralelo cambios incompatibles para las mismas tablas.

### 9.4. Integración de un módulo persistente

1. Confirmar las entidades, relaciones, IDs, unidades y datos requeridos por la interfaz.
2. Implementar la conexión compartida y la validación del entorno.
3. Implementar las operaciones de persistencia del módulo.
4. Reutilizar las reglas de negocio de su servicio.
5. Adaptar los registros al contrato API existente.
6. Validar entrada, existencia de relaciones y errores de consulta.
7. Registrar o actualizar la ruta backend y su consumidor frontend.
8. Probar con registros reales y documentar qué datos dejaron de ser simulados.

La migración desde mocks debe ser explícita. Un fallo de BD no debe convertirse silenciosamente en datos ficticios presentados como reales.

## 10. Recursos y estilos

Ubicar recursos importados por componentes en `frontend/src/assets/`. Utilizar `frontend/public/` cuando el archivo deba servirse directamente por URL; crear esa carpeta solo si hace falta.

Los recursos web se importan desde TypeScript/TSX o se referencian mediante una URL válida. AgroVision no utiliza el flujo `.qrc` del proyecto Qt. Vite prepara los recursos durante la compilación.

Conservar tokens y estilos compartidos en `frontend/src/shared/styles/`. Ubicar estilos específicos dentro de su feature. Mantener nombres de clases consistentes y comprobar que el orden de imports no cambie otras pantallas.

Antes de eliminar un icono, componente o módulo histórico, buscar sus referencias. La presencia de un reemplazo visual no demuestra que todos sus consumidores hayan migrado.

## 11. Estándar de código y documentación

Cada módulo nuevo o modificado debe comenzar con un bloque `/** ... */` que describa su propósito, responsabilidades y contratos relevantes. En archivos CSS, utilizar comentarios `/* ... */`; `//` no es sintaxis válida de comentario CSS.

Agregar comentarios `//` descriptivos para explicar decisiones, transformaciones, ciclos de vida y operaciones importantes. Conservar los comentarios vigentes y corregir la documentación que haya dejado de coincidir con el comportamiento.

Ejemplo de una llamada corta:

```typescript
// Leemos la visibilidad registrada en el estilo del mapa.
const visibility = map.getLayoutProperty(RISK_HEATMAP_LAYER_ID, "visibility");
```

Para objetos o llamadas largas, mantener saltos que favorezcan la lectura. Separar responsabilidades y evitar comprimir bloques completos de lógica en una sola línea.

Los módulos nuevos deben terminar con documentación de integración breve: entradas, salidas, consumidores, actualización de estado, limpieza y condiciones relevantes. Describir lo que el módulo hace y sus contratos con lenguaje útil para futuros desarrolladores.

Reglas de implementación:

- Reutilizar configuraciones, tipos y utilidades centrales antes de duplicarlas.
- Utilizar `import type` para imports exclusivamente de tipos.
- Validar los límites externos: peticiones, JSON, entorno y datos de servicios.
- Conservar referencias estables cuando formen parte del contrato de snapshots React.
- Mantener render y efectos sin mutaciones accidentales de datos compartidos.
- Cancelar peticiones y limpiar listeners, observers, temporizadores y animaciones.
- Mantener separadas las reglas de negocio, persistencia, transporte HTTP y UI.
- Conservar accesibilidad, foco, estados de carga, vacío y error, y adaptación responsive.
- Entregar cambios relacionados con su objetivo y conservar el trabajo ajeno.

## 12. Validación antes de entregar

### 12.1. Comandos publicados

Desde la raíz:

```powershell
npm run build:backend
npm run build:frontend
npm --prefix frontend run lint
```

Con el backend ejecutándose en el puerto 3000:

```powershell
npm --prefix backend run smoke:test
```

Prueba específica de reportes:

```powershell
npm --prefix backend run field-report:test
```

El comando correcto es `field-report:test`, en singular. El README backend contiene una referencia distinta que debe corregirse.

### 12.2. Límites actuales de los scripts

- `npm --prefix backend test` es un marcador que falla intencionalmente; todavía no ejecuta una suite general.
- `mi:test` apunta a `src/modules/analysis/data/x.ts`, archivo ausente en la revisión.
- El smoke test imprime resultados por endpoint, pero su código actual no garantiza un exit code distinto de cero ante fallos. Revisar sus filas `FAIL`; finalizar el proceso no equivale a aprobarlo.
- Los scripts `check:mapping`, `lint:mapping`, `test:mapping`, `dev:mapping` y `build:mapping` no estaban publicados en `frontend/package.json` de `master`. Ejecutarlos solo en una rama que incluya esos scripts y sus archivos de configuración.

Consultar los scripts reales de la rama antes de ejecutar una guía de otra versión:

```powershell
npm run
npm --prefix frontend run
npm --prefix backend run
```

Si hay fallos previos ajenos al cambio, documentar su comando y error por separado. La entrega debe distinguir las comprobaciones aprobadas, las fallidas y las que no se ejecutaron.

### 12.3. Verificación manual mínima

Comprobar salud del backend, navegación y la pantalla afectada. Verificar carga, vacío, error, datos válidos y adaptación móvil. Para servicios reales, comprobar la petición en la pestaña Network y confirmar el origen de los datos. Una interfaz que muestra mocks puede funcionar aun cuando el backend esté detenido.

## 13. Compilación y ejecución de versiones construidas

```powershell
npm run build:backend
npm run build:frontend
```

Backend compilado:

```powershell
npm run start:backend
```

Vista previa local del frontend construido:

```powershell
npm --prefix frontend run preview
```

`preview` es una comprobación local del build, no un despliegue. El proxy configurado en `server.proxy` de Vite corresponde al desarrollo. La publicación debe resolver `/api` en el servidor de hosting o mediante una configuración de API implementada en los consumidores, y debe servir las rutas SPA para accesos directos a páginas como `/mapping`.

## 14. Visual Studio Code

Los comandos de terminal son la referencia oficial. Como comodidad local, puede crearse `.vscode/tasks.json` con tareas para frontend y backend:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "AgroVision: frontend",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev:frontend"],
      "options": { "cwd": "${workspaceFolder}" },
      "problemMatcher": []
    },
    {
      "label": "AgroVision: backend",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev:backend"],
      "options": { "cwd": "${workspaceFolder}" },
      "problemMatcher": []
    }
  ]
}
```

Ejecutarlas desde `Terminal > Ejecutar tarea`. Esta configuración no asigna `Ctrl + Shift + B` ni implica que esa combinación ya esté preparada en el repositorio. `.vscode/` está ignorado por Git actualmente; para compartir tareas, acordar la excepción correspondiente en `.gitignore`.

## 15. Trabajo en equipo y Git

Iniciar una tarea desde una rama actualizada y sin cambios locales pendientes:

```powershell
git switch master
git pull --ff-only origin master
git switch -c feat/nombre-del-cambio
```

Antes del commit:

```powershell
git status --short
git diff
git diff --check
```

Agregar rutas concretas relacionadas con la tarea:

```powershell
git add ruta-del-archivo ruta-del-otro-archivo
git diff --cached
git commit -m "feat(modulo): descripcion del cambio"
git push -u origin feat/nombre-del-cambio
```

Crear un Pull Request hacia la rama acordada. Explicar el cambio observable, sus archivos relevantes, contratos o migraciones, variables nuevas y comprobaciones realizadas. Si dos personas trabajan en el mismo módulo, acordar archivos y contratos antes de modificarlo.

### Archivos que acompañan a cada cambio

| Cambio | Archivos que se entregan juntos |
| --- | --- |
| Dependencia npm | `package.json` y `package-lock.json` del paquete afectado. |
| Dependencia Python | Código consumidor y `ai-service/requirements.txt`. |
| Variable nueva | Código que la carga, plantilla `.env.example` correspondiente y este manual. |
| Entidad o relación BD | Schema, migración, operaciones de persistencia, adaptadores y pruebas pertinentes. |
| Endpoint | Ruta, controlador, servicio, validación, contrato y consumidor correspondiente. |
| Recurso gráfico | Archivo del recurso y referencias que lo utilizan. |
| Cambio GIS | Capa o coordinador, contrato de datos, integración y estilos cuando corresponda. |

### Archivos locales o generados

Mantener fuera de los commits `node_modules/`, `.env`, `.env.local`, entornos virtuales, builds, cachés, logs y credenciales. El cliente de Prisma en `backend/src/generated/` se regenera con la CLI; conservar versionados el schema y las migraciones.

La revisión encontró archivos Python `__pycache__` ya versionados. Deben retirarse del seguimiento en una limpieza específica y añadir reglas para `__pycache__/` y `*.pyc`. Agregar una regla a `.gitignore` no retira por sí sola un archivo previamente versionado.

## 16. Diagnóstico rápido

| Síntoma | Comprobación y siguiente acción |
| --- | --- |
| `Missing script` | Consultar `npm run` del paquete y confirmar la rama. |
| `npm ci` falla por el bloqueo | Comparar manifiesto y lock del paquete afectado; corregirlos juntos. |
| Vite no arranca por Node | Comparar `node --version` con los requisitos compatibles de Vite. |
| Frontend abre en otro puerto | Utilizar la URL impresa por Vite y comprobar qué ocupa el puerto habitual. |
| `/api` no responde | Comprobar backend, `/api/health`, proxy y `VITE_API_BASE_URL`; reiniciar Vite. |
| Satélite o NDVI no disponibles | Revisar variable en `frontend/.env.local`, reinicio y capas existentes en la instancia WMS. |
| WMS responde error | Revisar respuesta Network, Instance ID, nombre de capa, acceso y parámetros del proveedor. |
| `.env` backend parece ignorado | Comprobar que el arranque carga el archivo o que la variable existe en el proceso. |
| Prisma solicita `DIRECT_URL` | Revisar `.env` de raíz y usar `--config ./prisma7.config.ts`. |
| BD migrada pero API usa datos locales | Revisar la implementación del servicio y su conexión con persistencia. |
| Seed no carga registros | Confirmar que `seeds.ts` tiene implementación y un comando configurado; actualmente está pendiente. |
| `pip` no encuentra una versión | Revisar requisito exacto, intérprete y plataforma con el responsable de IA. |
| Servicio IA activo pero backend sigue simulado | Revisar `VisionService`; levantar FastAPI no implementa el proxy HTTP. |
| Build pasa pero el mapa no aparece | Revisar dimensiones del contenedor, carga del estilo, consola y ciclo de vida. |

## 17. Pendientes de mantenimiento identificados

Estos puntos describen la revisión de referencia y deben cerrarse mediante cambios verificables:

1. Publicar plantillas `.env.example` de raíz y frontend, sin credenciales privadas.
2. Centralizar y validar la carga del entorno backend.
3. Alinear Prisma CLI, cliente y dependencias de ejecución entre raíz y backend.
4. Implementar conexión de BD y seed antes de documentarlos como funcionales.
5. Definir entidades y geometrías persistentes para zonas y otros datos GIS.
6. Corregir `/api/farm/overview` frente a `/api/farms/overview`.
7. Corregir scripts de prueba ausentes y hacer que el smoke test informe fallos mediante exit code.
8. Publicar los scripts y configuraciones de pruebas GIS si se adoptan como comprobación oficial.
9. Verificar la instalación Python completa y documentar su plataforma compatible.
10. Retirar cachés Python versionadas y actualizar sus reglas de exclusión.
11. Mantener README, este manual y los contratos alineados con el comportamiento real.

## 18. Referencias oficiales

- Vite: requisitos e instalación — https://vite.dev/guide/
- Vite: variables de entorno — https://vite.dev/guide/env-and-mode
- npm: instalación reproducible con `npm ci` — https://docs.npmjs.com/cli/commands/npm-ci/
- Prisma 7: comandos y migraciones — https://www.prisma.io/docs/orm/v7/reference/prisma-cli-reference
- Prisma: configuración explícita — https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference

Este manual se considera actualizado cuando sus comandos y rutas coinciden con la rama compartida y las operaciones documentadas han sido comprobadas. Cada entrega que cambie la instalación, ejecución o integración debe actualizarlo en el mismo Pull Request.