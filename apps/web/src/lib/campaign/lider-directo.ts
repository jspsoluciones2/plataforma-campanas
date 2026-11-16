import type { SupabaseClient } from "@supabase/supabase-js";

export type LiderDirectoBasico = {
  nombres: string;
  apellidos: string;
};

type FilaConLider = {
  id_lider_directo?: number | null;
};

const TAMANO_LOTE = 500;

/**
 * Resuelve el líder directo de cada votante a partir de id_lider_directo.
 *
 * El embed `lider_directo:votantes(...)` de PostgREST resuelve la relación
 * inversa (votantes que tienen a este votante como líder), no el líder del
 * votante. Por eso se consulta aparte y se asigna el nombre correcto.
 */
export async function asignarLideresDirectos<T extends FilaConLider>(
  supabase: SupabaseClient,
  filas: T[]
): Promise<(T & { lider_directo: LiderDirectoBasico | null })[]> {
  const ids = Array.from(
    new Set(
      filas
        .map((fila) => fila.id_lider_directo)
        .filter((id): id is number => typeof id === "number")
    )
  );

  if (ids.length === 0) {
    return filas.map((fila) => ({ ...fila, lider_directo: null }));
  }

  const lideres = new Map<number, LiderDirectoBasico>();

  for (let i = 0; i < ids.length; i += TAMANO_LOTE) {
    const lote = ids.slice(i, i + TAMANO_LOTE);
    const { data } = await supabase
      .from("votantes")
      .select("id, nombres, apellidos")
      .in("id", lote);

    for (const lider of (data ?? []) as {
      id: number;
      nombres: string;
      apellidos: string;
    }[]) {
      lideres.set(lider.id, {
        nombres: lider.nombres,
        apellidos: lider.apellidos,
      });
    }
  }

  return filas.map((fila) => ({
    ...fila,
    lider_directo:
      fila.id_lider_directo != null
        ? lideres.get(fila.id_lider_directo) ?? null
        : null,
  }));
}
