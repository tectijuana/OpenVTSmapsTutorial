// Único módulo que conoce Leaflet (global L, cargado desde src/assets/vendor/leaflet).
import { bearingDeg } from '../utils/haversine.js';
import { pointPopupHtml } from '../components/pointPopup.js';

const COLORS = { route: '#2563eb', point: '#1d4ed8', start: '#16a34a', end: '#dc2626', selected: '#f59e0b' };
const MAX_ARROWS = 60;
const MAX_LABELS = 300;

const CAR_SVG = `
<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
  <g transform="translate(20 20)">
    <rect x="-9" y="-16" width="18" height="32" rx="6" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
    <rect x="-7" y="-10" width="14" height="7" rx="2" fill="#1e293b"/>
    <rect x="-7" y="5" width="14" height="5" rx="2" fill="#1e293b"/>
    <circle cx="-5" cy="-15" r="1.6" fill="#fef9c3"/><circle cx="5" cy="-15" r="1.6" fill="#fef9c3"/>
  </g>
</svg>`;

function endpointIcon(kind) {
  const label = kind === 'start' ? 'A' : 'B';
  return L.divIcon({
    className: `endpoint-icon endpoint-${kind}`,
    html: `<span>${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export class MapController {
  constructor(container) {
    this.map = L.map(container, { zoomControl: false, preferCanvas: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    L.control.scale({ imperial: false }).addTo(this.map);
    this.map.setView([32.5308, -116.958], 13);

    this.layers = {
      route: L.layerGroup().addTo(this.map),
      arrows: L.layerGroup().addTo(this.map),
      points: L.layerGroup().addTo(this.map),
      labels: L.layerGroup(),
      endpoints: L.layerGroup().addTo(this.map),
      vehicle: L.layerGroup().addTo(this.map),
    };
    this.pointMarkers = [];
    this.vehicleMarker = null;
    this.bounds = null;
  }

  /** Dibuja la trayectoria completa. onPointClick recibe el GpsPoint. */
  showTrack(track, { onPointClick } = {}) {
    Object.values(this.layers).forEach((g) => g.clearLayers());
    this.pointMarkers = [];
    const pts = track.points;
    const latlngs = pts.map((p) => [p.lat, p.lon]);

    L.polyline(latlngs, { color: COLORS.route, weight: 5, opacity: 0.8, lineJoin: 'round' }).addTo(this.layers.route);

    pts.forEach((p) => {
      const m = L.circleMarker([p.lat, p.lon], {
        radius: 5,
        color: '#fff',
        weight: 1.5,
        fillColor: COLORS.point,
        fillOpacity: 1,
      })
        .bindPopup(() => pointPopupHtml(p, pts.length), { maxWidth: 260 })
        .on('click', () => onPointClick?.(p))
        .addTo(this.layers.points);
      this.pointMarkers.push(m);
    });

    // Etiquetas con el número de punto (se limitan para no saturar el mapa).
    const labelStep = Math.max(1, Math.ceil(pts.length / MAX_LABELS));
    pts.forEach((p, i) => {
      if (i % labelStep !== 0 && i !== pts.length - 1) return;
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: 'point-label', html: String(p.index), iconSize: null, iconAnchor: [-6, 18] }),
        interactive: false,
        keyboard: false,
      }).addTo(this.layers.labels);
    });

    // Flechas de dirección en el punto medio de los segmentos.
    const arrowStep = Math.max(1, Math.ceil((pts.length - 1) / MAX_ARROWS));
    for (let i = 0; i < pts.length - 1; i += arrowStep) {
      const a = pts[i];
      const b = pts[i + 1];
      if (a.lat === b.lat && a.lon === b.lon) continue;
      L.marker([(a.lat + b.lat) / 2, (a.lon + b.lon) / 2], {
        icon: L.divIcon({
          className: 'direction-arrow',
          html: `<span style="transform: rotate(${bearingDeg(a, b)}deg)">▲</span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        interactive: false,
        keyboard: false,
      }).addTo(this.layers.arrows);
    }

    const first = pts[0];
    const last = pts[pts.length - 1];
    L.marker([first.lat, first.lon], { icon: endpointIcon('start'), title: 'Inicio', zIndexOffset: 500 })
      .bindPopup(() => pointPopupHtml(first, pts.length, 'Inicio'))
      .on('click', () => onPointClick?.(first))
      .addTo(this.layers.endpoints);
    if (pts.length > 1) {
      L.marker([last.lat, last.lon], { icon: endpointIcon('end'), title: 'Destino', zIndexOffset: 500 })
        .bindPopup(() => pointPopupHtml(last, pts.length, 'Destino'))
        .on('click', () => onPointClick?.(last))
        .addTo(this.layers.endpoints);
    }

    this.vehicleMarker = L.marker([first.lat, first.lon], {
      icon: L.divIcon({ className: 'vehicle-icon', html: `<div class="vehicle-rot">${CAR_SVG}</div>`, iconSize: [40, 40], iconAnchor: [20, 20] }),
      zIndexOffset: 1000,
      keyboard: false,
      title: track.vehicleId,
    }).addTo(this.layers.vehicle);

    this.bounds = L.latLngBounds(latlngs);
    this.fitRoute(false);
  }

  fitRoute(animate = true) {
    if (!this.bounds) return;
    if (this.bounds.getNorthEast().equals(this.bounds.getSouthWest())) {
      this.map.setView(this.bounds.getCenter(), 17, { animate });
    } else {
      this.map.fitBounds(this.bounds, { padding: [40, 40], animate });
    }
  }

  zoomIn() {
    this.map.zoomIn();
  }

  zoomOut() {
    this.map.zoomOut();
  }

  /** layer: 'points' | 'route' | 'labels' (las flechas acompañan a la trayectoria). */
  setLayerVisible(layer, visible) {
    const groups = layer === 'route' ? [this.layers.route, this.layers.arrows] : [this.layers[layer]];
    for (const g of groups) {
      if (visible) g.addTo(this.map);
      else g.remove();
    }
  }

  updateVehicle(frame) {
    if (!this.vehicleMarker) return;
    this.vehicleMarker.setLatLng([frame.lat, frame.lon]);
    const el = this.vehicleMarker.getElement()?.querySelector('.vehicle-rot');
    if (el) el.style.transform = `rotate(${frame.bearing}deg)`;
  }

  /** Mantiene al vehículo visible durante la reproducción sin recentrar en cada cuadro. */
  keepInView(frame) {
    const ll = L.latLng(frame.lat, frame.lon);
    if (!this.map.getBounds().pad(-0.1).contains(ll)) this.map.panTo(ll, { animate: true });
  }

  highlightPoint(index) {
    this.pointMarkers.forEach((m, i) =>
      m.setStyle({ fillColor: i === index - 1 ? COLORS.selected : COLORS.point, radius: i === index - 1 ? 8 : 5 })
    );
  }

  invalidateSize() {
    this.map.invalidateSize();
  }
}
