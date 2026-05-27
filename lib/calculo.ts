import { VectorArquetipos, COLORES_ARQUETIPOS } from "./supabase";

export type Arquetipo = keyof VectorArquetipos;

// === Arquetipo final desde el vector ===
export function calcularArquetipoFinal(vector: VectorArquetipos): Arquetipo {
  const orden: Arquetipo[] = ["Amante", "Rebelde", "Bufon", "Explorador", "Mago", "Creador"];
  let max = -Infinity;
  let ganador: Arquetipo = "Amante";
  for (const arq of orden) {
    if (vector[arq] > max) {
      max = vector[arq];
      ganador = arq;
    }
  }
  return ganador;
}

// === Conversiones de color ===
function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function rgbToHSL(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16).padStart(2, "0");
    return hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Mezcla circular de hues + promedio de saturación y luminosidad
export function mezclarColoresHSL(hexColors: string[]): string {
  if (hexColors.length === 0) return "#FFFFFF";
  if (hexColors.length === 1) return hexColors[0];

  let sumCos = 0;
  let sumSin = 0;
  let sumS = 0;
  let sumL = 0;
  for (const hex of hexColors) {
    const { r, g, b } = hexToRGB(hex);
    const { h, s, l } = rgbToHSL(r, g, b);
    const rad = (h * Math.PI) / 180;
    sumCos += Math.cos(rad);
    sumSin += Math.sin(rad);
    sumS += s;
    sumL += l;
  }
  const n = hexColors.length;
  let avgH = (Math.atan2(sumSin / n, sumCos / n) * 180) / Math.PI;
  if (avgH < 0) avgH += 360;
  const avgS = Math.min(1, (sumS / n) * 1.05); // boost ligero para que no se opaque
  const avgL = Math.max(0.4, Math.min(0.6, sumL / n)); // mantener visible
  return hslToHex(avgH, avgS, avgL);
}

// === Arquetipo dominante del grupo ===
export function arquetipoDominanteGrupo(
  vectores: VectorArquetipos[]
): { dominante: Arquetipo; suma: VectorArquetipos } {
  const suma: VectorArquetipos = {
    Amante: 0, Rebelde: 0, Bufon: 0, Explorador: 0, Mago: 0, Creador: 0,
  };
  for (const v of vectores) {
    for (const k of Object.keys(suma) as Arquetipo[]) {
      suma[k] += v[k] || 0;
    }
  }
  return { dominante: calcularArquetipoFinal(suma), suma };
}

// === Frase grupal según varianza de arquetipos en el grupo ===
// Alta varianza = se complementan. Baja varianza = resuenan igual.
export function fraseGrupo(arquetiposIndividuales: Arquetipo[]): string {
  const unicos = new Set(arquetiposIndividuales).size;
  const total = arquetiposIndividuales.length;
  const ratio = unicos / total;

  if (ratio >= 0.75) {
    return "Cada unx es una frecuencia distinta. Juntxs hacen una sinfonía.";
  } else if (ratio >= 0.5) {
    return "Hay tensión y diálogo entre ustedes. Eso es lo que los une.";
  } else if (ratio > 0.25) {
    return "Comparten un eje, pero cada unx lo habita distinto.";
  } else {
    return "Vibran en la misma frecuencia. Esto es manada pura.";
  }
}

// === Nombre procedural seedado por sala.id (determinístico) ===
const NOMBRES_POR_ARQUETIPO: Record<Arquetipo, string[]> = {
  Amante: [
    "Cofradía del Latido", "Los Devotxs", "Hermandad Magenta",
    "Marea Profunda", "Los Vastxs", "Culto al Eco",
  ],
  Rebelde: [
    "Cofradía del Caos", "Los Indomables", "Resonancia Carmín",
    "Manada Salvaje", "Los Ingobernables", "Tumulto Sagrado",
  ],
  Bufon: [
    "Carnaval Amarillo", "Los Fervorosxs", "Hermandad de la Fiesta",
    "Los Sin Reloj", "Sindicato del Júbilo", "Manada Solar",
  ],
  Explorador: [
    "Los Errantes", "Cofradía del Mapa Abierto", "Los Sin Tarima Fija",
    "Tribu Verde", "Los Cartógrafxs", "Manada del Asombro",
  ],
  Mago: [
    "Los Iniciadxs", "Cofradía Violeta", "Hermandad del Trance",
    "Los Que Saben", "Orden del Eco Profundo", "Culto a la Onda",
  ],
  Creador: [
    "Los Originales", "Hermandad Cian", "Los Que Inventan",
    "Tribu de Autorxs", "Manada del Lenguaje", "Cofradía del Pulso Propio",
  ],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function nombreDelGrupo(salaId: string, arquetipoDominante: Arquetipo): string {
  const opciones = NOMBRES_POR_ARQUETIPO[arquetipoDominante];
  const idx = hashString(salaId) % opciones.length;
  return opciones[idx];
}

// === Helper: color del arquetipo ===
export function colorDeArquetipo(arq: Arquetipo): string {
  return COLORES_ARQUETIPOS[arq] || "#FFFFFF";
}
