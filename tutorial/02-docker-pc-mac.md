# Práctica 2 — GPS Route Viewer con Docker en tu PC o Mac

**TecNM · Instituto Tecnológico de Tijuana**
Duración estimada: 60 min · Nivel: básico

## Objetivo

Ejecutar *GPS Route Viewer* en un **contenedor Docker** en tu propio equipo, entender la diferencia entre **imagen** y **contenedor**, y usar un modo de desarrollo en el que los cambios al código se ven sin reconstruir la imagen.

## Conceptos clave

| Concepto | Qué es |
|---|---|
| **Imagen** | Plantilla de solo lectura con todo lo necesario para ejecutar algo (aquí: nginx y el sitio). Se crea con `docker build` a partir de un `Dockerfile`. |
| **Contenedor** | Una instancia en ejecución de una imagen. Se pueden crear, detener y borrar sin afectar la imagen. |
| **Puerto publicado** | `-p 8080:80` conecta el puerto 8080 de tu equipo con el 80 del contenedor. |
| **Volumen / bind mount** | Carpeta de tu equipo montada dentro del contenedor. |
| **Docker Compose** | Archivo `compose.yaml` que describe los servicios para levantarlos con un solo comando. |

## Paso 1 — Instalar Docker

| Sistema | Instalación |
|---|---|
| **Windows 10/11** | [Docker Desktop](https://www.docker.com/products/docker-desktop/). Al instalar, deja activada la opción **WSL 2**. Reinicia cuando lo pida. |
| **macOS** | [Docker Desktop](https://www.docker.com/products/docker-desktop/). Elige **Apple Silicon** (M1/M2/M3/M4) o **Intel** según tu equipo:  → *Acerca de esta Mac*. |
| **Linux (Ubuntu)** | `sudo apt install -y docker.io docker-compose-v2 && sudo usermod -aG docker $USER` y luego cierra la sesión y vuelve a entrar. |

> Docker Desktop es gratuito para uso educativo y personal.

Abre Docker Desktop y espera a que indique *Engine running*. Después, en una terminal:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

✅ **Verificación:** `hello-world` imprime *"Hello from Docker!"*.

## Paso 2 — Obtener el proyecto

```bash
git clone https://github.com/tectijuana/OpenVTSmapsTutorial.git gps-route-viewer
cd gps-route-viewer
```

Si no tienes git, descarga el `.zip` que comparta el docente, descomprímelo y entra a la carpeta con `cd`.

Archivos que usaremos:

```
Dockerfile      → cómo construir la imagen (nginx + index.html + src/)
compose.yaml    → servicios "web" (producción) y "dev" (desarrollo)
.dockerignore   → archivos que NO se copian a la imagen
```

Revisa el `Dockerfile`: son solo 4 instrucciones.

```dockerfile
FROM nginx:stable-alpine
COPY index.html /usr/share/nginx/html/index.html
COPY src /usr/share/nginx/html/src
EXPOSE 80
```

## Paso 3 — Construir y ejecutar con `docker` (paso a paso)

```bash
docker build -t gps-route-viewer .
docker images gps-route-viewer                       # la imagen y su tamaño
docker run -d --name grv -p 8080:80 gps-route-viewer
docker ps                                            # el contenedor en ejecución
```

Abre <http://localhost:8080/?demo>.

✅ **Verificación:** aparece la ruta demo de Tomás Aquino a Otay; **▶ Reproducir** mueve el vehículo.

Comandos útiles:

```bash
docker logs -f grv          # peticiones HTTP (Ctrl+C para salir)
docker exec -it grv sh      # entrar al contenedor
  ls /usr/share/nginx/html  #   (dentro) ver los archivos servidos
  exit
docker stop grv             # detener
docker start grv            # volver a iniciar
docker rm -f grv            # borrar el contenedor (la imagen se conserva)
```

📝 **Pregunta:** después de `docker rm -f grv`, ¿sigue existiendo la imagen? Compruébalo con `docker images`.

## Paso 4 — Lo mismo con Docker Compose

```bash
docker compose up -d --build      # construye y levanta el servicio "web"
docker compose ps
docker compose logs -f web
docker compose down               # detiene y borra el contenedor
```

### Si el puerto 8080 está ocupado

```bash
# macOS / Linux
PORT=8081 docker compose up -d --build

# Windows PowerShell
$env:PORT=8081; docker compose up -d --build
```

## Paso 5 — Modo desarrollo (editar y ver cambios)

El servicio `dev` **no copia** el código a la imagen: lo monta desde tu carpeta.

```bash
docker compose down
docker compose --profile dev up dev
```

1. Abre <http://localhost:8080/?demo>.
2. En tu editor, abre `src/assets/styles.css` y cambia `--primary: #1b396a;` por otro color, por ejemplo `#7c2d12`.
3. Guarda y recarga el navegador con `Ctrl+Shift+R` (`Cmd+Shift+R` en Mac).

✅ **Verificación:** el encabezado cambia de color **sin** reconstruir la imagen.

📝 **Pregunta:** ¿por qué en el servicio `web` el cambio **no** aparece hasta ejecutar `docker compose up -d --build`?

Para detener el modo desarrollo usa `Ctrl+C`.

## Paso 6 — Ejecutar las pruebas sin instalar Node.js

Las pruebas unitarias (parsers, Haversine, línea de tiempo) usan Node.js. Con Docker no necesitas instalarlo:

```bash
# macOS / Linux
docker run --rm -v "$PWD":/app -w /app node:22-alpine sh -c 'node --test tests/*.test.js'

# Windows PowerShell
docker run --rm -v "${PWD}:/app" -w /app node:22-alpine sh -c 'node --test tests/*.test.js'
```

✅ **Verificación:** la salida termina con `# pass 26` y `# fail 0`.

Las pruebas de GPX y KML corren en el navegador: con la app levantada, abre <http://localhost:8080/tests/browser.html>. Esa ruta solo funciona en modo `dev`, porque la imagen de producción no incluye `tests/`.

## Paso 7 — Generar datos con el simulador IoT

`scripts/simulate_gps.py` imita un rastreador GPS y produce un CSV. Ejecútalo con Python desde Docker:

```bash
# macOS / Linux
docker run --rm -v "$PWD":/app -w /app python:3.12-alpine python scripts/simulate_gps.py --vehicle EQUIPO-01 --points 40 --noise 6 -o equipo01.csv

# Windows PowerShell
docker run --rm -v "${PWD}:/app" -w /app python:3.12-alpine python scripts/simulate_gps.py --vehicle EQUIPO-01 --points 40 --noise 6 -o equipo01.csv
```

> Usa `-o archivo.csv` en lugar de `> archivo.csv`: en Windows PowerShell 5 la redirección `>` guarda el archivo en UTF-16.

Arrastra `equipo01.csv` a la aplicación.

## Paso 8 — Limpieza

```bash
docker compose down
docker image rm gps-route-viewer
docker system df            # espacio usado por Docker
```

## Entregables

1. Captura de `docker ps` con el contenedor en ejecución.
2. Captura del navegador en `http://localhost:8080` con tu CSV simulado cargado.
3. Captura del Paso 5 con el color modificado.
4. Respuestas a las preguntas de los Pasos 3 y 5.

## Solución de problemas

| Síntoma | Solución |
|---|---|
| `Cannot connect to the Docker daemon` | Abre Docker Desktop y espera a *Engine running* |
| `port is already allocated` | Usa otro puerto: `PORT=8081` (ver Paso 4) |
| Windows: `WSL 2 installation is incomplete` | En PowerShell como administrador ejecuta `wsl --install` y reinicia |
| El modo `dev` no muestra cambios | Recarga sin caché (`Ctrl+Shift+R`); revisa que ejecutaste `--profile dev up dev` |
| Al abrir `index.html` con doble clic no pasa nada | Los módulos JS requieren HTTP; usa Docker o `python3 -m http.server 8080` |
