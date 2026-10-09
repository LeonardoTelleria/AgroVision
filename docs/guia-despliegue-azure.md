# Guía de Azure y entrega de AgroVision

Esta guía explica cómo cumplir los cinco requisitos de entrega con una máquina virtual de Azure. Está adaptada al repositorio: React/Vite en `frontend`, Node/Express y Prisma en `backend`, PostgreSQL y FastAPI en `ai-service`. Es un procedimiento de despliegue; no certifica que el servidor ya esté creado ni que la aplicación haya pasado las verificaciones.

## Qué es Azure y qué vas a utilizar

Azure es la plataforma de servicios en la nube de Microsoft. Permite alquilar servidores, almacenamiento, redes y bases de datos. En este caso utilizarás:

| Recurso | Función |
|---|---|
| Suscripción | Cuenta que contiene los recursos y su facturación. |
| Grupo de recursos | Agrupa los elementos de la entrega, por ejemplo `rg-agrovision`. |
| Máquina virtual o VM | Servidor donde instalarás Ubuntu y ejecutarás la aplicación. |
| Disco administrado | Guarda el sistema, el código y los datos de PostgreSQL. |
| Red virtual y subred | Red donde está conectada la VM. |
| IP pública | Dirección a la que acceden los usuarios desde internet. |
| NSG | Grupo de seguridad que permite o bloquea conexiones por puerto. |
| SSH | Acceso remoto a la terminal de Ubuntu mediante una clave. |
| Nginx | Entrega los archivos de la web y dirige `/api/` hacia Node. |

La arquitectura propuesta es:

```text
Navegador → IP pública:80 → Nginx
                            ├─ /       → archivos de frontend/dist
                            └─ /api/   → Node:3000 → PostgreSQL:5432
                                                   → FastAPI:8000, si la ruta lo utiliza
Tu computadora → IP pública:22 → SSH
```

Para esta evaluación se utiliza HTTP por IP. Para un servicio de uso real, configura un dominio, certificado TLS y HTTPS; abrir el puerto 443 por sí solo no configura HTTPS.

## Antes de empezar

- Tener una suscripción activa de Azure y permiso para crear recursos.
- Tener el proyecto completo, sus `package-lock.json`, las migraciones y acceso a una terminal PowerShell con `ssh`, `scp` y `tar`.
- Sustituir `IP_PUBLICA`, `MI_IP_PUBLICA` y `CLAVE.pem` por los valores reales. No son valores para copiar literalmente.
- Los bloques PowerShell se ejecutan en Windows; los bloques Bash y SQL se ejecutan en la VM después de entrar por SSH.
- Consultar el precio que muestra Azure antes de crear la VM. La disponibilidad y el costo dependen de la región y la suscripción. La instalación completa de las dependencias Python de este repositorio puede requerir bastante memoria y disco.

## 1. Compilación y empaquetado de la aplicación

### 1.1 Preparar el frontend

Desde PowerShell, en la carpeta `AgroVision`:

```powershell
npm ci
npm --prefix frontend ci
npm --prefix frontend run build
```

El resultado debe estar en `frontend/dist`, con `index.html` y los recursos compilados. No confundirlo con una carpeta `dist` de otro nivel. Si la compilación falla, corregir los errores antes de entregar.

El frontend actual usa rutas relativas como `/api/alerts`. Si abres la web desde `http://IP_PUBLICA`, el navegador las convierte en `http://IP_PUBLICA/api/alerts`. Por ello, la configuración Nginx de esta guía permite conectarse a Azure sin introducir una IP en cada archivo.

No basta con añadir `VITE_API_BASE_URL` a un `.env`: el código debe leer esa variable para que tenga efecto. Si posteriormente se adopta esa configuración, hay que compilar de nuevo al cambiarla. Nunca colocar contraseñas de PostgreSQL en variables `VITE_*`, porque se incorporan al código entregado al navegador. [Variables de Vite](https://vite.dev/guide/env-and-mode).

### 1.2 Comprimir el build y preparar el paquete del servidor

```powershell
Compress-Archive -Path .\frontend\dist\* -DestinationPath .\agrovision-web.zip
tar --exclude=node_modules --exclude=.git --exclude=.env --exclude=.env.local --exclude=.env.production.local --exclude=.venv --exclude=__pycache__ --exclude=agrovision-servidor.tar.gz -czf agrovision-servidor.tar.gz package.json package-lock.json backend frontend ai-service
```

Si ya existe un archivo de salida, usa un nombre nuevo de versión. Revisa el contenido antes de compartirlo:

```powershell
tar -tzf .\agrovision-servidor.tar.gz
Get-FileHash .\agrovision-web.zip -Algorithm SHA256
```

El ZIP contiene la web compilada. El TAR contiene el código y manifiestos necesarios para instalar y compilar el backend en Ubuntu; no contiene un backend ya verificado. La compilación de Node se completa en el paso 4, evitando trasladar módulos nativos instalados para Windows.

**Evidencia:** terminal con compilación exitosa, contenido de `frontend/dist`, ZIP y su hash. Vite genera por defecto el build para producción al ejecutar su comando de compilación. [Compilación de Vite](https://vite.dev/guide/build).

### 1.3 Si la entrega fuera móvil

Este repositorio es web: `npm run build` no produce un APK. Una entrega Android requiere un proyecto Android o una integración como Capacitor, configuración del identificador y versiones, permisos, URL de la API y firma de release.

Una vez exista el proyecto Android configurado, su tarea de release puede ejecutarse desde la carpeta Android con `./gradlew assembleRelease`. Debe entregarse un APK firmado e instalable; la ubicación exacta depende del módulo y las variantes del proyecto.

La página de descarga debe incluir nombre y versión, fecha, versión mínima de Android definida por `minSdk`, tamaño, permisos, instrucciones de instalación y botón al APK. Conviene incluir SHA-256. Publicar el archivo en `/var/www/agrovision/descargas/agrovision.apk` y enlazar `/descargas/agrovision.apk`; comprobar descarga e instalación en un dispositivo real. Si se impone inicio de sesión u otro requisito de descarga, debe implementarse y probarse específicamente. Para AgroVision web se entrega el build, sin APK.

## 2. Crear el servidor y demostrar SSH

1. Entrar al portal de Azure y abrir **Máquinas virtuales → Crear → Máquina virtual de Azure**.
2. Seleccionar la suscripción y crear `rg-agrovision`.
3. Nombre: `vm-agrovision`. Elegir una región disponible.
4. Imagen: **Ubuntu Server 24.04 LTS**. Elegir un tamaño que soporte Node, PostgreSQL y las dependencias Python; revisar memoria, disco y precio.
5. Autenticación: **clave pública SSH**. Usuario: `azureuser`. Generar una clave nueva o seleccionar una existente.
6. Habilitar SSH (22) y HTTP (80). En redes, confirmar que exista IP pública y NSG asociado. Después restringir SSH según el paso 3.
7. Revisar y crear. Si Azure genera la clave, descargar el `.pem` y guardarlo de forma privada.
8. En **Información general**, copiar la IP pública. Abrir el recurso de esa IP y confirmar asignación estática para que la dirección del despliegue sea estable.

El flujo oficial muestra la creación de una VM Ubuntu, acceso SSH e instalación de Nginx. [Crear una VM Linux](https://learn.microsoft.com/azure/virtual-machines/linux/quick-create-portal?tabs=ubuntu).

Desde PowerShell:

```powershell
ssh -i "C:\ruta\CLAVE.pem" azureuser@IP_PUBLICA
```

Comprobar la huella del host antes de aceptar la primera conexión. Dentro de Ubuntu:

```bash
whoami
hostname
cat /etc/os-release
uname -a
```

**Evidencia:** captura del portal con VM, estado e imagen; captura de la terminal mostrando el comando SSH, `azureuser`, hostname y Ubuntu. No mostrar la clave privada. [Conectar por SSH](https://learn.microsoft.com/en-us/azure/virtual-machines/linux-vm-connect).

## 3. IP pública, red y puertos

En la VM, abrir **Redes / Configuración de red** y acceder al NSG. En **Reglas de seguridad de entrada**, configurar reglas TCP de permiso con prioridades únicas, por ejemplo:

| Prioridad | Nombre | Origen | Puerto destino | Uso |
|---|---|---|---|---|
| 100 | Allow-SSH-MyIP | `MI_IP_PUBLICA/32` | 22 | Administración desde tu conexión actual. |
| 110 | Allow-HTTP | Internet | 80 | Acceso web y API mediante Nginx. |
| 120 | Allow-HTTPS | Internet | 443 | Solo cuando hayas configurado TLS. |

Usar puerto de origen `*`. Revisar cualquier regla SSH previa para que no siga permitiendo acceso desde cualquier IP. Si cambia tu IP doméstica, actualizar la regla SSH.

No se necesitan reglas públicas para 3000, 5432 u 8000 en esta arquitectura. Nginx recibe las peticiones externas y los demás servicios se comunican dentro de la VM. Si existen NSG tanto en la subred como en la interfaz, ambos deben permitir el tráfico. [Funcionamiento de los NSG](https://learn.microsoft.com/azure/virtual-network/network-security-group-how-it-works).

Si UFW está activo en Ubuntu, permitir también SSH y HTTP allí antes de cerrar la sesión actual. Comprobar:

```bash
sudo ufw status
sudo ss -lntp
```

Después de instalar Nginx, probar desde Windows:

```powershell
Test-NetConnection IP_PUBLICA -Port 22
Test-NetConnection IP_PUBLICA -Port 80
```

**Evidencia:** IP pública del portal, reglas del NSG y `TcpTestSucceeded: True`. Una regla abierta no demuestra que el servicio esté escuchando: se necesitan ambas comprobaciones.

## 4. Instalar y verificar el entorno y la base de datos

### 4.1 Instalar servicios y Node

En Ubuntu:

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib python3 python3-venv python3-pip build-essential curl unzip
sudo systemctl enable --now nginx postgresql
```

Instalar una versión Node compatible con las versiones fijadas de Vite y Prisma. Como procedimiento reproducible, instalar NVM siguiendo su README oficial y ejecutar:

```bash
nvm install 22
nvm use 22
node --version
npm --version
python3 --version
psql --version
```

Usar la revisión más reciente disponible de Node 22 y comprobar los requisitos `engines` de los paquetes instalados. Fuente para instalar NVM: [README oficial](https://github.com/nvm-sh/nvm#installing-and-updating). No continuar si aparecen errores de compatibilidad.

### 4.2 Subir los archivos

En PowerShell, desde `AgroVision`:

```powershell
scp -i "C:\ruta\CLAVE.pem" .\agrovision-servidor.tar.gz azureuser@IP_PUBLICA:/home/azureuser/
```

En Ubuntu:

```bash
mkdir -p /home/azureuser/agrovision
tar -xzf /home/azureuser/agrovision-servidor.tar.gz -C /home/azureuser/agrovision
```

### 4.3 Crear PostgreSQL y configurar Prisma

Entrar al administrador:

```bash
sudo -u postgres psql
```

Ejecutar en SQL, sustituyendo la contraseña:

```sql
CREATE USER agrovision_app WITH PASSWORD 'CAMBIAR_POR_UNA_CLAVE_UNICA';
CREATE DATABASE agrovision OWNER agrovision_app;
\q
```

Crear `/home/azureuser/agrovision/backend/.env` con `nano`:

```dotenv
PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://agrovision_app:CAMBIAR_POR_UNA_CLAVE_UNICA@127.0.0.1:5432/agrovision"
AI_SERVICE_URL=http://127.0.0.1:8000
```

Codificar los caracteres especiales de la contraseña cuando se inserta en una URL. Mantener este archivo fuera del paquete público.

```bash
chmod 600 /home/azureuser/agrovision/backend/.env
cd /home/azureuser/agrovision
npm ci
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
test -f dist/server.js
```

Estos comandos deben terminar correctamente. Prisma está fijado a la versión 7 en el proyecto; usar el CLI local instalado, sin actualizarlo a otra versión durante la entrega. `migrate deploy` aplica las migraciones existentes; no sustituirlo por `migrate dev` en el servidor. [Referencia de Prisma](https://docs.prisma.io/docs/orm/reference/prisma-cli-reference).

Comprobar tablas y conexión, introduciendo la contraseña cuando se solicite:

```bash
psql -h 127.0.0.1 -U agrovision_app -d agrovision -W -c 'SELECT current_database(), current_user, version();'
psql -h 127.0.0.1 -U agrovision_app -d agrovision -W -c '\dt'
```

Revisar `prisma/seeds.ts` antes de ejecutar opcionalmente `npx prisma db seed`: contiene datos de demostración y un `passwordHash` de ejemplo. No presentarlo como una autenticación lista para producción.

### 4.4 Mantener Node encendido después de cerrar SSH

Con Node seleccionado en NVM, ejecutar `command -v node`. Copiar su ruta absoluta. Crear con `sudo nano /etc/systemd/system/agrovision-api.service`:

```ini
[Unit]
Description=AgroVision API
After=network.target postgresql.service

[Service]
User=azureuser
WorkingDirectory=/home/azureuser/agrovision/backend
Environment=NODE_ENV=production
ExecStart=/RUTA/ABSOLUTA/DE/node dist/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Sustituir `/RUTA/ABSOLUTA/DE/node`; systemd no carga NVM automáticamente. La aplicación carga `.env` desde su directorio de trabajo mediante dotenv.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now agrovision-api
sudo systemctl status agrovision-api --no-pager
curl -i http://127.0.0.1:3000/api/health
```

El endpoint real consulta PostgreSQL con `SELECT 1`. Debe devolver HTTP 200 y `data.status`, `data.backend` y `data.database` con valor `UP`. Si devuelve 503, revisar la conexión a PostgreSQL. `success: true` por sí solo no basta para aprobar esta comprobación.

### 4.5 Instalar y ejecutar Python/FastAPI

```bash
cd /home/azureuser/agrovision/ai-service
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m pip check
```

El archivo incluye versiones fijadas de Torch y otras bibliotecas. Si alguna no está disponible o es incompatible con Python/Ubuntu, resolver esa compatibilidad y actualizar el manifiesto de manera explícita antes de declarar completa la instalación. No omitir silenciosamente dependencias para afirmar que se instaló el entorno completo.

Crear `/etc/systemd/system/agrovision-ai.service`:

```ini
[Unit]
Description=AgroVision FastAPI
After=network.target

[Service]
User=azureuser
WorkingDirectory=/home/azureuser/agrovision/ai-service
ExecStart=/home/azureuser/agrovision/ai-service/.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now agrovision-ai
curl -i http://127.0.0.1:8000/health
```

Debe devolver HTTP 200 y `{"status":"UP"}`. El analizador actual es heurístico; tener FastAPI funcionando no demuestra que exista un modelo entrenado ni que Node esté llamando al servicio. Si se exige esa integración, comprobar también una solicitud real de análisis y sus logs.

**Evidencia del punto 4:** versiones, instalación sin errores, servicios activos, tablas de PostgreSQL, health de Node con base `UP` y health de FastAPI.

## 5. Publicar la web y demostrar la conexión a Azure

### 5.1 Instalar el build en Nginx

```bash
sudo mkdir -p /var/www/agrovision
sudo cp -r /home/azureuser/agrovision/frontend/dist/. /var/www/agrovision/
sudo find /var/www/agrovision -type d -exec chmod 755 {} \;
sudo find /var/www/agrovision -type f -exec chmod 644 {} \;
```

Crear `/etc/nginx/sites-available/agrovision`:

```nginx
server {
    listen 80 default_server;
    server_name _;
    root /var/www/agrovision;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

No añadir una barra al final de `proxy_pass`: aquí se conserva el prefijo `/api/` que espera Express. Desactivar el sitio predeterminado solo si se trata de una VM nueva dedicada a esta entrega:

```bash
sudo unlink /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/agrovision /etc/nginx/sites-enabled/agrovision
sudo nginx -t
sudo systemctl reload nginx
```

Si los enlaces ya fueron configurados, no repetir su creación. Si `nginx -t` falla, corregir la configuración antes de recargar.

### 5.2 Probar desde fuera de Azure

En Windows:

```powershell
curl.exe -i http://IP_PUBLICA/api/health
```

Abrir `http://IP_PUBLICA` en el navegador. Abrir herramientas de desarrollador → **Network/Red** y recargar una pantalla que consulte la API. Guardar una captura con:

- URL de solicitud: `http://IP_PUBLICA/api/...`.
- Método y código HTTP exitoso.
- Respuesta real del servidor.

Las rutas relativas cumplen este requisito: el navegador se conecta a la IP pública donde está alojada la página. Las direcciones `127.0.0.1` de Nginx, PostgreSQL y Python son comunicaciones internas válidas del servidor.

El frontend contiene servicios con datos de respaldo o mocks. Ver información en pantalla no prueba conectividad. Para demostrar envío y recepción, realizar una operación de escritura en un endpoint persistido, guardar su respuesta, consultar el registro por API y comprobarlo en PostgreSQL. Usar los campos del esquema real de ese endpoint; no asumir que todos los módulos persisten datos. Si la pantalla aún no envía escrituras, deberá conectarse antes de aprobar esa parte.

Cerrar SSH y volver a abrir la web desde otra conexión, por ejemplo datos móviles. Esto prueba que el funcionamiento no depende de una terminal de desarrollo local.

**Evidencia:** web abierta por IP, Network mostrando solicitudes a esa IP, health público con base `UP`, escritura y lectura verificadas y acceso desde otra red.

## Entrega y exposición

| Requisito | Qué entregar o mostrar | Criterio de aprobación |
|---|---|---|
| 1. Compilación | ZIP web, paquete servidor y log de build | Build exitoso y página servida por Nginx. APK solo si existe versión Android. |
| 2. Servidor | Portal y terminal SSH | VM activa, Ubuntu identificado y acceso remoto comprobado. |
| 3. Red | IP pública, NSG y prueba de puertos | HTTP accesible desde internet y SSH desde tu IP autorizada. |
| 4. Entorno y BD | Versiones, servicios, tablas y health | Node, Python y PostgreSQL funcionan dentro de la VM. |
| 5. Nube | Network, respuesta API y registro persistido | El navegador usa Azure y se comprueba envío y recepción de datos. |

Organizar las capturas como `01-build`, `02-vm-ssh`, `03-ip-puertos`, `04-entorno-bd` y `05-conexion-nube`. Acompañarlas con la URL, fecha de prueba, versiones y hash del paquete. Ocultar secretos.

## Problemas habituales

| Síntoma | Comprobación |
|---|---|
| SSH no conecta | IP, ruta de clave, usuario, IP de origen autorizada, estado de VM y NSG. |
| Web no responde | Puerto 80 en NSG/UFW, `systemctl status nginx` y `nginx -t`. |
| API devuelve 502 | `systemctl status agrovision-api` y `journalctl -u agrovision-api -n 80 --no-pager`. |
| Health devuelve 503 | `.env`, usuario/contraseña, base creada y prueba `psql`. |
| Pantalla funciona pero API falla | Revisar Network: podría estar mostrando mocks de respaldo. |
| Refrescar una ruta produce 404 | Confirmar `try_files` para la aplicación React. |
| Una ruta API devuelve 404 | Comparar rutas frontend/backend; por ejemplo, el catálogo frontend incluye `/api/farm/overview`, mientras el backend registra `/api/farms/overview`. |
| Compilación falla | Corregir TypeScript, Prisma generado y versiones antes de declarar el build listo. |

Esta guía cubre una entrega académica con una sola VM. La disponibilidad para uso final también depende de corregir fallos funcionales, comprobar las operaciones reales y configurar los controles necesarios para los datos que se vayan a manejar. Al terminar la práctica, revisar los recursos facturables: detener el sistema dentro de Ubuntu no equivale a desasignar la VM en Azure, y discos/IP pueden seguir generando cargos.
