/**
 * El asunto de un expediente puede seguir la convención "Materia · Partes · Órgano jurisdiccional"
 * (así lo carga la demostración). Si no la sigue, todo el texto se muestra como título.
 */
export interface Asunto {
  titulo: string;
  materia: string | null;
  organo: string | null;
}

export function descomponerAsunto(asunto: string | null | undefined): Asunto {
  const texto = (asunto ?? '').trim();
  const partes = texto.split(/\s+·\s+/).filter(Boolean);
  if (partes.length === 3) return { materia: partes[0], titulo: partes[1], organo: partes[2] };
  if (partes.length === 2) return { materia: partes[0], titulo: partes[1], organo: null };
  return { titulo: texto, materia: null, organo: null };
}
