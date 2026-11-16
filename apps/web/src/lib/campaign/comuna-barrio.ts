import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchComunasPorAlcance } from "@/lib/campaign/comunas";

export type ComunaBarrioIds = {
  idComuna: number;
  idBarrio: number;
};

export async function validarComunaBarrioPuesto(
  supabase: SupabaseClient,
  campaignId: number,
  idComuna: number,
  idBarrio: number
): Promise<ComunaBarrioIds | { error: string }> {
  if (!idComuna) {
    return { error: "La comuna es obligatoria para el puesto de votación." };
  }
  if (!idBarrio) {
    return { error: "El barrio es obligatorio para el puesto de votación." };
  }

  const comunas = await fetchComunasPorAlcance(supabase, campaignId);
  const comunaIds = new Set(comunas.map((c) => c.id));

  if (!comunaIds.has(Number(idComuna))) {
    return { error: "La comuna seleccionada no pertenece a esta campaña." };
  }

  const { data: barrio } = await supabase
    .from("barrios")
    .select("id, id_comuna")
    .eq("id", idBarrio)
    .maybeSingle();

  if (!barrio || !comunaIds.has(barrio.id_comuna)) {
    return { error: "El barrio seleccionado no pertenece a esta campaña." };
  }

  if (barrio.id_comuna !== Number(idComuna)) {
    return {
      error: "El barrio no corresponde a la comuna seleccionada.",
    };
  }

  return { idComuna, idBarrio };
}
