# Backend Local Run Guide

Guía para ejecutar y validar el backend de AgroVision en un entorno local.

---

# Requisitos

Antes de ejecutar el proyecto asegúrese de tener instalado:

- Node.js 20 o superior.
- npm.
- TypeScript (instalado mediante las dependencias del proyecto).

---

# Configuración inicial

1. Ingresar a la carpeta `backend`.

```bash
cd backend
```

2. Instalar las dependencias.

```bash
npm install
```

3. Crear el archivo `.env` utilizando como referencia `.env.example`.

Variables mínimas:

```env
PORT=3000
NODE_ENV=development
AI_SERVICE_URL=http://localhost:8000
```

---

# Ejecutar el backend

Para iniciar el servidor en modo desarrollo ejecutar:

```bash
npm run dev
```

Si el servidor inicia correctamente, estará disponible en:

```
http://localhost:3000
```

---

# Verificar el estado del servidor

Comprobar que el backend está funcionando accediendo al endpoint:

```
GET /api/health
```

Ejemplo:

```
http://localhost:3000/api/health
```

Una respuesta correcta debe devolver un código **200 OK** utilizando el contrato `ApiResponse`.

---

# Validar los endpoints principales

Con el servidor en ejecución se pueden validar los endpoints críticos mediante el Smoke Test.

Ejecutar:

```bash
npm run smoke:test
```

El resultado esperado es que todos los endpoints respondan correctamente con estado **VERIFICADO**.

---

# Compilar el proyecto

Para verificar que no existen errores de TypeScript ejecutar:

```bash
npm run build
```

Si la compilación finaliza sin errores, el backend está listo para ejecutarse.

---

# Errores comunes

### Error

```
Cannot find module
```

**Posible solución**

Ejecutar nuevamente:

```bash
npm install
```

---

### Error

```
Port 3000 already in use
```

**Posible solución**

Cerrar el proceso que utiliza el puerto o configurar otro puerto en el archivo `.env`.

---

### Error

El Smoke Test devuelve errores de conexión.

**Posible solución**

Verificar que el servidor backend se encuentre en ejecución antes de ejecutar:

```bash
npm run smoke:test
```

---

# Validación final

Antes de entregar cambios al repositorio verificar que:

- El servidor inicia correctamente.
- `npm run build` finaliza sin errores.
- `npm run smoke:test` valida todos los endpoints críticos.
- Los endpoints responden utilizando el contrato `ApiResponse`.