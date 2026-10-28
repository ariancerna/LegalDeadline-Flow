// El backend calcula plazos con la fecha civil de America/Lima (RNF14).
// Estas utilidades usan la misma zona para que el cliente sea coherente.
const ZONA = 'America/Lima';

/** Fecha actual en Lima con formato YYYY-MM-DD. */
export function hoyLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/** Suma días a una fecha YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const resultado = new Date(Date.UTC(a, m - 1, d + dias));
  return resultado.toISOString().slice(0, 10);
}

/** Días entre hoy (Lima) y la fecha indicada; negativo si ya pasó. */
export function diasHasta(fecha: string, hoy: string = hoyLima()): number {
  const [a1, m1, d1] = hoy.split('-').map(Number);
  const [a2, m2, d2] = fecha.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** Convierte el valor de un <input type="datetime-local"> (hora de Lima) en un instante ISO. */
export function localLimaAIso(valor: string): string {
  if (!valor) return '';
  // Lima no usa horario de verano: UTC-5 todo el año.
  return new Date(`${valor}:00-05:00`).toISOString();
}

/** Muestra una fecha YYYY-MM-DD como DD/MM/YYYY. */
export function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const [a, m, d] = fecha.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** Muestra un instante ISO en hora de Lima. */
export function formatoInstante(instante: string | null | undefined): string {
  if (!instante) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: ZONA,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(instante));
}

/** Texto relativo de un plazo según sus días restantes: "vence hoy", "falta 1 día", "venció hace 3 días". */
export function textoDias(dias: number): string {
  if (dias === 0) return 'vence hoy';
  const n = Math.abs(dias);
  const unidad = n === 1 ? 'día' : 'días';
  if (dias < 0) return `venció hace ${n} ${unidad}`;
  return n === 1 ? `falta 1 ${unidad}` : `faltan ${n} ${unidad}`;
}
