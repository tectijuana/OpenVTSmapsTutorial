# Práctica 3 — Ejercicios con GPS Route Viewer por materia

**TecNM · Instituto Tecnológico de Tijuana**

Requisito: tener la app funcionando con la [Práctica 1 (AWS Academy)](01-aws-academy-linux.md) o la [Práctica 2 (Docker)](02-docker-pc-mac.md).

Datos disponibles en `src/assets/demo/`:

| Archivo | Contenido |
|---|---|
| `tectijuana_demo.csv` / `.gpx` / `.kml` / `.geojson` | Misma ruta sintética (Tomás Aquino → Otay) en los 4 formatos |
| `flotilla_demo.csv` | Dos vehículos en el mismo archivo (`AUTO-DEMO-01`, `CAMION-07`) |
| `practica_errores.csv` | Archivo con errores intencionales (separador `;` y coma decimal) |

Para generar más datos: `python3 scripts/simulate_gps.py --help`. En Windows escribe `python` (o `py`) en lugar de `python3`, o usa el comando con Docker de la Práctica 2.

---

## A. GPS y geodesia — Haversine contra distancia euclidiana

1. Carga `tectijuana_demo.csv` y anota la **distancia** que muestra el panel (5.72 km).
2. Calcula a mano, o en una hoja de cálculo, la distancia entre el punto 1 y el 16 con la fórmula de Haversine:
   `d = 2R · asin(√(sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)))`, con R = 6371 km.
3. Calcula la distancia "euclidiana ingenua" `√(Δlat² + Δlon²)` en grados y conviértela a km multiplicando por 111.32.
4. Compara ambas. ¿Por qué la diferencia crece con la latitud? *(Pista: cos 32.5° ≈ 0.84.)*
5. Revisa `src/utils/haversine.js` y relaciona cada línea con la fórmula.

**Entregable:** tabla con las tres distancias y una explicación de la diferencia.

## B. IoT — Simular un rastreador y cargar sus datos

1. Genera tres recorridos con distinto error GPS:
   ```bash
   python3 scripts/simulate_gps.py --vehicle IOT-01 --noise 2  --seed 1 -o iot_ruido2.csv
   python3 scripts/simulate_gps.py --vehicle IOT-01 --noise 15 --seed 1 -o iot_ruido15.csv
   python3 scripts/simulate_gps.py --vehicle IOT-01 --noise 40 --seed 1 -o iot_ruido40.csv
   ```
2. Carga cada uno y compara la **distancia** y la **velocidad máxima**.
3. Explica por qué la distancia aumenta con el ruido aunque el recorrido real sea el mismo.
4. **Extra con dispositivo real:** graba un recorrido con un celular (por ejemplo la app *GPSLogger* para Android, que exporta GPX/CSV) y cárgalo.

**Entregable:** tabla de ruido vs. distancia vs. velocidad máxima y su explicación.

## C. Telemetría — Validación y calidad de datos

1. Carga `practica_errores.csv` y lee los **avisos de validación**.
2. Abre el archivo en un editor y señala, fila por fila, qué error tiene cada una: coordenada vacía, latitud > 90, longitud < −180, 0,0, timestamp inválido, velocidad negativa, duplicado o desorden.
3. ¿Por qué la app usa **intervalos uniformes** en lugar del tiempo real? Corrige el CSV para que use tiempo real y vuelve a cargarlo.
4. Genera más errores con `simulate_gps.py --errors 6 -o errores.csv` y verifica que todos se reporten.

**Entregable:** el CSV corregido y la lista de errores encontrados.

## D. Programación — Extender la aplicación

Elige una opción:

1. **Nuevo formato:** agrega soporte para el formato NMEA (`$GPRMC`). Crea `src/parsers/nmeaParser.js`, regístralo en `src/parsers/index.js` y agrega pruebas en `tests/`.
2. **Colorear por velocidad:** en `src/map/mapController.js`, dibuja cada segmento de un color según la velocidad: verde < 30, amarillo < 60 y rojo ≥ 60 km/h.
3. **Exportar:** agrega un botón que descargue la trayectoria limpia (ya validada) como GeoJSON.

Ejecuta `npm test` (o el comando Docker de la Práctica 2) antes de entregar.

**Entregable:** el código y la captura de las pruebas pasando.

## E. Sistemas distribuidos — Cliente, servidor y privacidad

1. Con la app publicada en EC2 (Práctica 1), abre las **herramientas de desarrollo** del navegador (F12 → *Network*).
2. Recarga la página y anota qué archivos se descargan y de qué servidores. Hay dos orígenes: tu EC2 y `tile.openstreetmap.org`.
3. Carga un CSV propio. ¿Aparece alguna petición que envíe tus datos GPS? Confírmalo en `/var/log/nginx/access.log`.
4. Dibuja un diagrama con navegador, servidor EC2 (nginx) y servidor de teselas OSM, indicando qué viaja por cada conexión.
5. Discute qué cambiaría si los vehículos enviaran su posición en tiempo real. Considera WebSockets, MQTT, una base de datos y dónde se calcularía Haversine.

**Entregable:** el diagrama y un texto de una página.

## F. Análisis de datos — Flotilla

1. Carga `flotilla_demo.csv` y cambia de vehículo con el selector **Vehículo**.
2. Para cada vehículo registra la distancia, la duración, la velocidad máxima y la velocidad promedio.
3. Observa la nota bajo *Velocidad promedio*. ¿Por qué el promedio de las lecturas del sensor (≈ 30 km/h) es distinto de distancia ÷ tiempo (≈ 69 km/h)? ¿Qué indica eso sobre estos datos sintéticos?
4. Con Python o una hoja de cálculo, grafica la velocidad contra el tiempo de cada vehículo.

**Entregable:** tabla comparativa, gráfica y conclusión.

---

### Rúbrica sugerida (por práctica)

| Criterio | Peso |
|---|---|
| Procedimiento completo con evidencias (capturas, comandos) | 40 % |
| Respuestas y análisis correctos | 40 % |
| Presentación y claridad | 20 % |
