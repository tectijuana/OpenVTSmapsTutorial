# Tutorial práctico — GPS Route Viewer

**TecNM · Instituto Tecnológico de Tijuana**

Prácticas para publicar y usar *GPS Route Viewer*, una aplicación web que muestra y reproduce trayectorias GPS de vehículos sobre OpenStreetMap.

| # | Práctica | Entorno | Tiempo |
|---|---|---|---|
| 1 | [Publicar en Linux con AWS Academy](01-aws-academy-linux.md) | EC2 Ubuntu 24.04 + nginx | 90 min |
| 2 | [Ejecutar con Docker en tu PC o Mac](02-docker-pc-mac.md) | Docker Desktop / Docker Engine | 60 min |
| 3 | [Ejercicios por materia](03-practicas-por-materia.md) | Cualquiera de las anteriores | variable |

Orden recomendado: la Práctica 2 en casa y la Práctica 1 en el laboratorio. La Práctica 3 se asigna según la materia: GPS, IoT, telemetría, programación, sistemas distribuidos o análisis de datos.

## Inicio rápido

```bash
# Con Docker
docker compose up -d --build          # → http://localhost:8080/?demo

# Sin Docker (Python 3 viene en macOS y Linux)
python3 -m http.server 8080           # → http://localhost:8080/?demo
```

La arquitectura de la aplicación está en [`docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md).
