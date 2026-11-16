import type { SupabaseClient } from "@supabase/supabase-js";
import { isNumericSearchTerm } from "@/lib/campaign/catalog-codigo";
import { fetchComunasPorAlcance } from "@/lib/campaign/comunas";

export type PuestoListRow = {
  id: number;
  nombre: string;
  municipio: string | null;
  direccion: string | null;
  id_comuna: number | null;
  id_barrio: number | null;
  votantes_hombres_admite: number;
  votantes_mujeres_admite: number;
  cantidad_mesas: number;
  creado_en: string;
  comunas: { nombre: string } | { nombre: string }[] | null;
  barrios: { nombre: string } | { nombre: string }[] | null;
};

const PUESTO_SELECT =
  "id, nombre, municipio, direccion, id_comuna, id_barrio, votantes_hombres_admite, votantes_mujeres_admite, cantidad_mesas, creado_en, comunas(nombre), barrios(nombre)";

export async function fetchPuestosList(
  supabase: SupabaseClient,
  campaignId: number,
  options: { q: string; from: number; to: number }
) {
  const term = options.q.trim();
  const comunas = await fetchComunasPorAlcance(supabase, campaignId);
  const comunaIds = comunas.map((c) => c.id);

  let query = supabase
    .from("puestos_votacion")
    .select(PUESTO_SELECT, { count: "exact" })
    .order("id");

  if (comunaIds.length > 0) {
    query = query.in("id_comuna", comunaIds);
  } else {
    query = query.limit(0);
  }

  if (term) {
    if (isNumericSearchTerm(term)) {
      query = query.eq("id", Number(term));
    } else {
      query = query.or(
        `nombre.ilike.%${term}%,municipio.ilike.%${term}%,direccion.ilike.%${term}%`
      );
    }
  }

  const { data, count, error } = await query.range(options.from, options.to);

  return {
    rows: (data ?? []) as PuestoListRow[],
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

export async function insertPuestoRow(
  supabase: SupabaseClient,
  row: Record<string, unknown>
) {
  const { error } = await supabase.from("puestos_votacion").insert(row);
  return error;
}

export async function updatePuestoRow(
  supabase: SupabaseClient,
  campaignId: number,
  id: number,
  row: Record<string, unknown>
) {
  const { error } = await supabase
    .from("puestos_votacion")
    .update(row)
    .eq("id", id);
  return error;
}
