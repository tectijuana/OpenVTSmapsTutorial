// NMEA 0183 → registros crudos. Usa $--RMC (posición, fecha, hora UTC, velocidad)
// y toma la altitud de $--GGA cuando coincide la hora.
import { GpsDataError } from '../utils/trackBuilder.js';

/** XOR de los caracteres entre '$' y '*'; true si no hay checksum o si coincide. */
export function nmeaChecksumOk(sentence) {
  const star = sentence.indexOf('*');
  if (star < 0) return true;
  const expected = parseInt(sentence.slice(star + 1, star + 3), 16);
  let sum = 0;
  for (let i = 1; i < star; i++) sum ^= sentence.charCodeAt(i);
  return sum === expected;
}

/** "3231.7274","N" → 32.528790 (formato ddmm.mmmm / dddmm.mmmm) */
export function nmeaCoordToDeg(value, hemisphere) {
  if (!value) return NaN;
  const dot = value.indexOf('.');
  const degLen = (dot < 0 ? value.length : dot) - 2;
  const deg = Number(value.slice(0, degLen));
  const min = Number(value.slice(degLen));
  if (!Number.isFinite(deg) || !Number.isFinite(min) || min >= 60) return NaN;
  const dec = deg + min / 60;
  return hemisphere === 'S' || hemisphere === 'W' ? -dec : dec;
}

/** hhmmss(.ss) + ddmmyy → ISO 8601 UTC */
function nmeaTimeToIso(hms, dmy) {
  if (!/^\d{6}(\.\d+)?$/.test(hms) || !/^\d{6}$/.test(dmy)) return undefined;
  const yy = Number(dmy.slice(4, 6));
  const year = yy < 80 ? 2000 + yy : 1900 + yy;
  return `${year}-${dmy.slice(2, 4)}-${dmy.slice(0, 2)}T${hms.slice(0, 2)}:${hms.slice(2, 4)}:${hms.slice(4)}Z`;
}

export function parseNmea(text) {
  const warnings = [];
  const records = [];
  const altitudeByTime = new Map();
  let badChecksum = 0;
  let voidFix = 0;

  const sentences = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('$'));
  if (!sentences.length) throw new GpsDataError('El archivo NMEA no contiene sentencias ($...).');

  for (const s of sentences) {
    if (!nmeaChecksumOk(s)) {
      badChecksum++;
      continue;
    }
    const f = s.split('*')[0].split(',');
    const type = f[0].slice(3); // $GPRMC, $GNRMC, $GLRMC... → RMC
    if (type === 'GGA') {
      const ele = Number(f[9]);
      if (f[1] && Number.isFinite(ele) && f[9] !== '') altitudeByTime.set(f[1], ele);
    } else if (type === 'RMC') {
      if (f[2] !== 'A') {
        voidFix++; // V = receptor sin posición válida
        continue;
      }
      const knots = Number(f[7]);
      records.push({
        lat: nmeaCoordToDeg(f[3], f[4]),
        lon: nmeaCoordToDeg(f[5], f[6]),
        time: nmeaTimeToIso(f[1], f[9]),
        speedKmh: f[7] !== '' && Number.isFinite(knots) ? knots * 1.852 : null,
        vehicleId: '',
        _hms: f[1],
      });
    }
  }

  for (const r of records) {
    r.ele = altitudeByTime.get(r._hms) ?? NaN;
    delete r._hms;
  }
  if (badChecksum) warnings.push(`${badChecksum} sentencia(s) NMEA con checksum incorrecto fueron descartadas.`);
  if (voidFix) warnings.push(`${voidFix} sentencia(s) RMC sin posición válida (estado V) fueron omitidas.`);
  if (!records.length) throw new GpsDataError('El archivo NMEA no contiene sentencias $--RMC con posición válida.');
  return { records, warnings };
}
