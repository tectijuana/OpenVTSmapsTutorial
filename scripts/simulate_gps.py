#!/usr/bin/env python3
"""Simulador de un rastreador GPS (dispositivo IoT) que genera CSV para GPS Route Viewer.

Solo usa la biblioteca estándar de Python 3.8+.

Ejemplos:
  python3 scripts/simulate_gps.py -o mi_ruta.csv
  python3 scripts/simulate_gps.py --vehicle CAMION-07 --points 60 --interval 5 --noise 8 -o camion.csv
  python3 scripts/simulate_gps.py --errors 5 -o con_errores.csv      # práctica de validación

Sin -o el CSV se imprime en pantalla (stdout).
"""
import argparse
import csv
import math
import random
import sys
from datetime import datetime, timedelta, timezone

# TecNM / IT Tijuana: Unidad Tomás Aquino → Unidad Otay (coordenadas de la ruta demo)
TOMAS_AQUINO = (32.528790, -116.988190)
OTAY = (32.535290, -116.927680)
EARTH_RADIUS_M = 6371008.8


def haversine_m(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def jitter(lat, lon, meters):
    """Ruido gaussiano en metros, como el error típico de un receptor GPS."""
    dlat = random.gauss(0, meters) / 111_320
    dlon = random.gauss(0, meters) / (111_320 * math.cos(math.radians(lat)))
    return lat + dlat, lon + dlon


def parse_point(text):
    lat, lon = (float(v) for v in text.split(","))
    return lat, lon


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--vehicle", default="AUTO-SIM-01", help="vehicle_id (default: %(default)s)")
    p.add_argument("--start", type=parse_point, default=TOMAS_AQUINO, help="lat,lon de inicio")
    p.add_argument("--end", type=parse_point, default=OTAY, help="lat,lon de destino")
    p.add_argument("--points", type=int, default=30, help="número de lecturas (default: %(default)s)")
    p.add_argument("--interval", type=float, default=20, help="segundos entre lecturas (default: %(default)s)")
    p.add_argument("--noise", type=float, default=4, help="error GPS en metros, desviación estándar (default: %(default)s)")
    p.add_argument("--errors", type=int, default=0, help="filas con errores intencionales para practicar validación")
    p.add_argument("--time", default=None, help="hora de inicio ISO, ej. 2026-10-04T18:00:00 (default: ahora, en UTC con zona)")
    p.add_argument("-o", "--output", default=None, help="archivo CSV de salida en UTF-8 (default: pantalla)")
    p.add_argument("--seed", type=int, default=None, help="semilla aleatoria para resultados reproducibles")
    args = p.parse_args()

    if args.points < 2:
        p.error("--points debe ser al menos 2")
    random.seed(args.seed)
    # Con zona horaria explícita el navegador convierte a hora local aunque el script corra en un contenedor UTC.
    start_time = datetime.fromisoformat(args.time) if args.time else datetime.now(timezone.utc).replace(microsecond=0)

    rows = []
    prev = None
    for i in range(args.points):
        f = i / (args.points - 1)
        # Perfil de velocidad: arranca, crucero y frena (curva seno).
        progress = (1 - math.cos(math.pi * f)) / 2
        lat = args.start[0] + (args.end[0] - args.start[0]) * progress
        lon = args.start[1] + (args.end[1] - args.start[1]) * progress
        if 0 < i < args.points - 1:
            lat, lon = jitter(lat, lon, args.noise)
        speed = 0.0 if prev is None else haversine_m(prev, (lat, lon)) / args.interval * 3.6
        prev = (lat, lon)
        t = start_time + timedelta(seconds=i * args.interval)
        rows.append([t.isoformat(), f"{lat:.6f}", f"{lon:.6f}", f"{speed:.1f}", args.vehicle])

    # Errores típicos de datos reales para la práctica de validación.
    broken = [
        lambda r: [r[0], "", r[2], r[3], r[4]],  # latitud vacía
        lambda r: [r[0], "95.000000", r[2], r[3], r[4]],  # latitud fuera de rango
        lambda r: [r[0], "0", "0", r[3], r[4]],  # GPS sin señal
        lambda r: ["sin-fecha", r[1], r[2], r[3], r[4]],  # timestamp inválido
        lambda r: list(r),  # duplicado
        lambda r: [r[0], r[1], r[2], "-10", r[4]],  # velocidad negativa
    ]
    for k in range(args.errors):
        i = random.randrange(1, len(rows) - 1)
        rows.insert(i + 1, broken[k % len(broken)](rows[i]))

    out = open(args.output, "w", encoding="utf-8", newline="") if args.output else sys.stdout
    try:
        w = csv.writer(out, lineterminator="\n")
        w.writerow(["timestamp", "latitude", "longitude", "speed_kmh", "vehicle_id"])
        w.writerows(rows)
    finally:
        if args.output:
            out.close()
            print(f"{len(rows)} lecturas escritas en {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
