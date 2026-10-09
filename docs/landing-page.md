# Landing de AgroVision

La página pública está en `/`; el sistema existente sigue disponible en `/dashboard` y sus otras rutas. Las imágenes proceden de los recursos del proyecto y se presentan como vistas de referencia, sin afirmar que son capturas de datos en vivo.

## Puesta en marcha

Desde `backend`, con `DATABASE_URL` configurada:

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

En otra terminal, desde `frontend`:

```bash
npm run dev
```

El proxy existente de Vite dirige `/api` al backend. En Azure, usar la configuración de Nginx de la guía de despliegue. Compilar el frontend con `npm run build` y publicar su `dist`.

## Solicitudes

`POST /api/demo-requests` valida nombre, correo, organización opcional, mensaje y autorización de contacto. Guarda los datos en PostgreSQL, tabla `demo_requests`, incluyendo fecha de consentimiento. Devuelve 201 únicamente cuando la escritura tiene éxito; datos inválidos reciben 400 y una base no disponible devuelve 503. El formulario presenta errores sin simular un envío exitoso. No envía correos automáticamente.

No se incluye una ruta pública para listar solicitudes. El panel administrativo con autenticación es un componente pendiente. Mientras se implementa, las solicitudes pueden consultarse mediante acceso autorizado a PostgreSQL:

```sql
SELECT id, name, email, organization, message, "createdAt"
FROM demo_requests ORDER BY "createdAt" DESC;
```

## Revisión manual

1. Abrir `/` en escritorio y móvil: verificar navegación por secciones y acceso al dashboard.
2. Intentar enviar campos vacíos, correo inválido o sin consentimiento: no debe registrarse la solicitud.
3. Enviar datos válidos con la migración aplicada: comprobar HTTP 201 y registro en PostgreSQL.
4. Detener el backend: debe aparecer un mensaje de error, sin confirmación de guardado.
5. Navegar con teclado y comprobar los mensajes del formulario y los enlaces.
