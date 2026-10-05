# GPS Route Viewer

[![Licencia: MIT](https://img.shields.io/github/license/IoTeacher/OpenVTSmaps?label=licencia)](LICENSE)
[![Último commit](https://img.shields.io/github/last-commit/IoTeacher/OpenVTSmaps?label=%C3%BAltimo%20commit)](https://github.com/IoTeacher/OpenVTSmaps/commits/main)
[![JavaScript ES Modules](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)](src/main.js)
[![Leaflet 1.9.4](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![OpenStreetMap](https://img.shields.io/badge/mapa-OpenStreetMap-7EBC6F?logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/copyright)
[![Docker](https://img.shields.io/badge/Docker-nginx%3Astable--alpine-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![Sin backend](https://img.shields.io/badge/datos%20GPS-procesados%20localmente-success)](docs/ARQUITECTURA.md)

[![WGS 84](https://img.shields.io/badge/WGS%2084-EPSG%3A4326-informational)](https://epsg.io/4326)
[![GPX 1.1](https://img.shields.io/badge/GPX-1.1-informational)](https://www.topografix.com/GPX/1/1/)
[![KML 2.2](https://img.shields.io/badge/OGC%20KML-2.2-informational)](https://www.ogc.org/standard/kml/)
[![GeoJSON RFC 7946](https://img.shields.io/badge/GeoJSON-RFC%207946-informational)](https://datatracker.ietf.org/doc/html/rfc7946)
[![CSV RFC 4180](https://img.shields.io/badge/CSV-RFC%204180-informational)](https://datatracker.ietf.org/doc/html/rfc4180)
[![ISO 8601](https://img.shields.io/badge/fechas-ISO%208601-informational)](https://www.iso.org/iso-8601-date-and-time-format.html)
[![TecNM Tijuana](https://img.shields.io/badge/TecNM-Instituto%20Tecnol%C3%B3gico%20de%20Tijuana-1B396A)](https://www.tijuana.tecnm.mx)

Visualización y reproducción de trayectorias GPS en el navegador. Es un proyecto didáctico del TecNM · Instituto Tecnológico de Tijuana para prácticas de GPS, IoT, telemetría, programación, sistemas distribuidos y análisis de datos de vehículos.

- Importa **CSV, GPX, KML y GeoJSON** (arrastrar y soltar o selector de archivos).
- Ruta (polilínea), puntos, flechas de dirección, inicio y destino, y popup por punto.
- Reproducción animada con velocidad de 0.5x a 60x, barra de tiempo y panel de telemetría.
- Distancia por **Haversine**, duración, velocidad máxima y promedio, y selector para archivos con varios vehículos.
- Validación con mensajes amigables: archivos vacíos, coordenadas inválidas o fuera de rango, timestamps, duplicados y desorden.
- **Los datos GPS se procesan localmente en el navegador**, sin backend.

## Estándares internacionales

| Estándar | Organismo | Uso en el proyecto |
|---|---|---|
| **WGS 84** (EPSG:4326) | NGA / IOGP | Sistema de referencia de todas las coordenadas: latitud de −90 a 90 y longitud de −180 a 180 |
| **GPX 1.1** (y 1.0) | TopoGrafix | `src/parsers/gpxParser.js`: `trkpt`, `rtept` y `wpt`; `<speed>` en m/s |
| **KML 2.2** (OGC 07-147r2) | OGC | `src/parsers/kmlParser.js`: `Point`, `LineString`, `ExtendedData` y la extensión `gx:Track` de Google |
| **GeoJSON** (RFC 7946) | IETF | `src/parsers/geojsonParser.js`: orden `[longitud, latitud, altitud]` |
| **CSV** (RFC 4180) | IETF | `src/parsers/csvParser.js`: comillas dobles y campos con delimitador |
| **ISO 8601** | ISO | `src/utils/timestamps.js`: fecha y hora con o sin zona horaria |
| **Web Mercator** (EPSG:3857) | IOGP | Proyección de las teselas del mapa base (Leaflet + OpenStreetMap) |
| **ODbL 1.0** | Open Data Commons | Licencia de los datos de OpenStreetMap; requiere atribución |

La distancia se calcula con la fórmula de **Haversine** sobre una esfera con el radio medio terrestre de la IUGG (6371.0088 km).

## Ejecutar

```bash
python3 -m http.server 8080        # http://localhost:8080/?demo
# o
docker compose up -d --build       # http://localhost:8080/?demo
```

Hay que servir el sitio por HTTP: abrir `index.html` con doble clic no funciona porque los módulos ES lo impiden.

## Publicar en hosting compartido

```bash
sh scripts/package.sh              # → dist/public_html/ y dist/public_html.zip
```

Sube el contenido de `dist/public_html/` a `public_html/`. No requiere Node.js, PHP ni base de datos.

## Pruebas

```bash
npm test                           # Node ≥ 18, sin dependencias
```

Las pruebas de los parsers GPX y KML se ejecutan en el navegador en `http://localhost:8080/tests/browser.html`.

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md)
- [Tutorial para estudiantes: AWS Academy, Docker y ejercicios](tutorial/README.md)

Mapa © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright) · [Leaflet](https://leafletjs.com) (BSD-2). La ruta demo usa coordenadas sintéticas.

## Licencia

[MIT](LICENSE) © 2026 René Solis R. · Leaflet se distribuye con su propia licencia BSD-2 (`src/assets/vendor/leaflet/LICENSE`).
