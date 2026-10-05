# GPS Route Viewer — Arquitectura

Herramienta web para importar trayectorias GPS (CSV, GPX, KML, GeoJSON, NMEA 0183), visualizarlas sobre OpenStreetMap y reproducir el recorrido de un vehículo de forma animada. Inspirada funcionalmente en *OpenVTS — Display Map Data Points* y *Dawarich — Route Video Maker*.

## 1. Arquitectura recomendada

**Sitio estático, sin backend y sin paso de compilación.** HTML5 + CSS3 + JavaScript con módulos ES nativos (`<script type="module">`) y Leaflet 1.9.4 incluido en el repositorio (`src/assets/vendor/leaflet`).

Por qué no React + Vite:

- La interfaz es un solo panel con estado sencillo (una ruta activa y un reproductor); un framework no aporta lo suficiente para justificar Node.js en la cadena de trabajo de los estudiantes.
- Sin build, lo que se edita es exactamente lo que se despliega: se copia la carpeta a `public_html/`, a un contenedor `nginx` o a `/var/www/html` en EC2.
- Los módulos de lógica (parsers, Haversine, línea de tiempo) son JavaScript puro y se prueban con `node --test` sin dependencias.

Capas:

```
┌──────────────────────────── index.html ────────────────────────────┐
│ main.js  (orquestador: estado de la app, eventos de la interfaz)   │
├───────────────┬──────────────────┬───────────────┬─────────────────┤
│ components/   │ map/             │ animation/    │ parsers/        │
│ DOM: zona de  │ mapController    │ timeline (puro)│ csv, gpx, kml, │
│ carga, paneles│ (único módulo    │ routeAnimator │ geojson → regis-│
│ popups, avisos│ que toca Leaflet)│ (rAF)         │ tros crudos     │
├───────────────┴──────────────────┴───────────────┴─────────────────┤
│ utils/: trackBuilder (validación + modelo), haversine, format,     │
│ fieldAliases, timestamps, escapeHtml                               │
└────────────────────────────────────────────────────────────────────┘
```

Regla de dependencias: `parsers/`, `utils/` y `animation/timeline.js` no tocan el DOM ni Leaflet. Por eso se pueden probar en Node.js y reutilizar en otro proyecto, por ejemplo un backend IoT.

## 2. Estructura de carpetas

```
index.html                 Página única
src/
  main.js                  Punto de entrada y orquestación
  components/              Piezas de interfaz (DOM puro)
  map/mapController.js     Capas Leaflet: ruta, puntos, flechas, etiquetas, vehículo
  animation/               timeline.js (cálculo puro) + routeAnimator.js (bucle rAF)
  parsers/                 Un parser por formato + index.js (detección de formato)
  utils/                   Haversine, validación/modelo, formatos, alias de columnas
  assets/                  styles.css, iconos, datos demo, vendor/leaflet
tests/                     Pruebas unitarias (node --test)
tutorial/                  Prácticas: AWS Academy (Linux) y Docker
scripts/package.sh         Genera dist/public_html(.zip) para hosting compartido
Dockerfile, compose.yaml   Servir el sitio con nginx
```

## 3. Dependencias

| Dependencia | Uso | Dónde |
|---|---|---|
| Leaflet 1.9.4 (BSD-2) | Mapa, polilínea, CircleMarker, Marker | `src/assets/vendor/leaflet` (copia local, sin CDN) |
| Teselas de OpenStreetMap | Mapa base | `tile.openstreetmap.org` (requiere atribución; uso moderado) |
| `DOMParser` del navegador | GPX y KML | Nativo |
| Node.js ≥ 18 | **Solo** para ejecutar las pruebas | Desarrollo |

No hay `npm install`, APIs comerciales, llaves de API ni tarjeta de crédito.

## 4. Flujo de importación

```
Archivo (arrastrar o seleccionar)
  → validación previa: tamaño ≤ 50 MB, no vacío
  → File.text()                                   (todo ocurre en el navegador)
  → detectFormat(): extensión; si es ambigua, se inspecciona el contenido
  → parser del formato → { records[], warnings[] } registros crudos
  → buildTracks(): coordenadas válidas y en rango, timestamps, velocidades,
                   agrupación por vehicle_id, orden cronológico, duplicados,
                   distancias Haversine y velocidad calculada
  → { tracks[], warnings[] }
  → si hay varios vehículos aparece un selector
  → mapController.showTrack() + statsPanel + routeAnimator
```

Cualquier excepción se captura en `main.js` y se muestra como un mensaje amigable; el estado anterior de la app no se pierde.

## 5. Modelo interno de datos

```js
// Track: una trayectoria de un vehículo
{
  vehicleId: "AUTO-DEMO-01",
  fileName: "tectijuana_demo.csv",
  format: "csv",                 // csv | gpx | kml | geojson
  hasTimestamps: true,           // todos los puntos tienen fecha/hora válida
  points: [GpsPoint],
  stats: { distanceKm, durationMs, maxSpeedKmh, avgSpeedKmh, pointCount }
}

// GpsPoint
{
  index: 1,                      // posición 1..N en la trayectoria
  lat: 32.52879, lon: -116.98819,
  time: Date | null,
  speedKmh: number | null,
  speedSource: "archivo" | "calculada" | null,
  ele: number | null,
  vehicleId: "AUTO-DEMO-01",
  cumDistKm: 0                   // distancia Haversine acumulada
}
```

Unidades: los datos se normalizan al leerlos. GPX reporta la velocidad en m/s, `speed_mph` está en mi/h y `speed_knots` en nudos; internamente todo se maneja en km/h y kilómetros.

## 6. Estrategia de animación

- `timeline.js` construye `offsets[i]`, los milisegundos desde el inicio de cada punto:
  - si **todos** los puntos tienen timestamp, se usa el tiempo real (`time[i] − time[0]`);
  - si no, se simulan intervalos uniformes de 10 s.
- `frameAt(t)` hace una búsqueda binaria del segmento `i` tal que `offsets[i] ≤ t ≤ offsets[i+1]` e interpola la posición, la velocidad y la hora, y calcula el rumbo del segmento. Es una función pura, por lo que se puede probar y adelantar o retroceder sin acumular errores.
- `routeAnimator.js` avanza un reloj virtual con `requestAnimationFrame`: `t += Δt_real × velocidad` (0.5x a 60x). Pausar detiene el bucle, reiniciar pone `t = 0` y la barra de tiempo llama a `seek(t)`.
- El vehículo es un `L.marker` con un `divIcon` SVG que se rota según el rumbo; en cada cuadro solo se llama a `setLatLng` y se cambia el estilo, sin recrear capas.

## 7. Despliegue

| Destino | Cómo |
|---|---|
| Hosting compartido (cPanel) | `scripts/package.sh` → subir el contenido de `dist/public_html/` (o descomprimir `dist/public_html.zip`) en `public_html/` |
| AWS Academy (EC2 Ubuntu) | nginx o Apache sirviendo la carpeta; ver `tutorial/01-aws-academy-linux.md` |
| PC/Mac con Docker | `docker compose up` → http://localhost:8080; ver `tutorial/02-docker-pc-mac.md` |
| Desarrollo local | `python3 -m http.server 8080` |

Los módulos ES **no funcionan con `file://`**: hay que servir el sitio por HTTP, aunque sea en local.
