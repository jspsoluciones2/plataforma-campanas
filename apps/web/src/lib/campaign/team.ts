import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { textoTituloOpcional } from "@/lib/normalize-text";
import {
  validateAuthIdentifier,
} from "@/lib/auth/identity";
import {
  fetchMemberAuthProfiles,
  isCampaignMemberRole,
  provisionCampaignMemberAuthUser,
  type CampaignMemberRole,
  type MemberAuthProfile,
} from "@/lib/campaign/member-auth";
import { userCanManageCampaignTeam } from "@/lib/campaign/access";

export type CampaignMemberRow = {
  id: number;
  id_usuario: string;
  rol: CampaignMemberRole;
  creado_en: string;
};

export type CampaignMemberWithProfile = CampaignMemberRow & MemberAuthProfile;

export async function listCampaignMembersWithProfiles(
  supabase: SupabaseClient,
  campaignId: number
): Promise<CampaignMemberWithProfile[]> {
  const { data: miembros } = await supabase
    .from("miembros_campana")
    .select("id, id_usuario, rol, creado_en")
    .eq("id_campana", campaignId)
    .order("creado_en");

  const rows = (miembros ?? []) as CampaignMemberRow[];
  const profiles = await fetchMemberAuthProfiles(
    rows.map((row) => row.id_usuario)
  );

  return rows.map((row) => {
    const profile = profiles.get(row.id_usuario);
    return {
      ...row,
      usuario: profile?.usuario ?? null,
      nombre: profile?.nombre ?? null,
    };
  });
}

type AssignMemberInput = {
  campaignId: number;
  actorUserId: string;
  usuario: string;
  contrasena: string;
  nombre?: string | null;
  rol: string;
};

type AssignMemberResult =
  | {
      ok: true;
      usuario: string;
      nombre: string;
      tempPassword: string;
    }
  | { error: string };

export async function assignCampaignMemberWithCredentials(
  input: AssignMemberInput
): Promise<AssignMemberResult> {
  const campaignId = input.campaignId;
  const usuario = input.usuario.trim();
  const contrasena = input.contrasena.trim();
  const nombre = textoTituloOpcional(input.nombre ?? "");
  const rol = input.rol.trim();

  if (!campaignId) return { error: "Campaña no indicada." };
  const identifierError = validateAuthIdentifier(usuario);
  if (identifierError) return { error: identifierError };
  if (!contrasena) return { error: "La contraseña inicial es obligatoria." };
  if (!isCampaignMemberRole(rol)) return { error: "Rol no válido." };

  const canManage = await userCanManageCampaignTeam(
    input.actorUserId,
    campaignId
  );
  if (!canManage) {
    return { error: "No tienes permiso para asignar miembros a esta campaña." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Falta SUPABASE_SERVICE_ROLE_KEY en apps/web/.env.local para crear usuarios del equipo.",
    };
  }

  // Leer la campaña con el mismo mecanismo que el resto de la app
  // (sesión + RLS), para no depender de la service role key.
  const supabase = await createServerClient();
  const { data: campana } = await supabase
    .from("campanas")
    .select("id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campana) return { error: "Campaña no encontrada." };

  const provisioned = await provisionCampaignMemberAuthUser(
    usuario,
    contrasena,
    campaignId,
    nombre
  );
  if ("error" in provisioned) return { error: provisioned.error };

  // Insertar la membresía con la sesión del usuario (RLS), igual que el
  // resto del CRUD de la app: el dueño de plataforma pasa la política
  // miembros_campana_write.
  const { error } = await supabase.from("miembros_campana").insert({
    id_campana: campaignId,
    id_usuario: provisioned.userId,
    rol,
  });

  if (error) {
    await admin.auth.admin.deleteUser(provisioned.userId);
    return { error: error.message };
  }

  const displayUsuario = usuario.trim().toLowerCase();

  return {
    ok: true,
    usuario: displayUsuario,
    nombre: nombre ?? displayUsuario,
    tempPassword: contrasena,
  };
}

type ManageMemberInput = {
  campaignId: number;
  actorUserId: string;
  memberId?: number;
  memberUserId?: string;
  rol?: string;
};

type ManageMemberResult = { ok: true } | { error: string };

/**
 * Cambia el rol de un miembro en la campaña usando la sesión del usuario
 * (RLS) siempre que sea posible, igual que el resto del CRUD de la app.
 * Solo quien gestiona el equipo de la campaña puede hacerlo.
 */
export async function updateCampaignMemberRole(
  input: ManageMemberInput
): Promise<ManageMemberResult> {
  if (!input.campaignId || !input.memberId) {
    return { error: "Miembro no indicado." };
  }
  if (!isCampaignMemberRole(input.rol ?? "")) {
    return { error: "Rol no válido." };
  }

  const canManage = await userCanManageCampaignTeam(
    input.actorUserId,
    input.campaignId
  );
  if (!canManage) {
    return { error: "No tienes permiso para gestionar el equipo de esta campaña." };
  }

  const supabase = await createServerClient();

  const { data: miembro } = await supabase
    .from("miembros_campana")
    .select("id, id_usuario")
    .eq("id", input.memberId)
    .eq("id_campana", input.campaignId)
    .maybeSingle();

  if (!miembro) return { error: "Miembro no encontrado en esta campaña." };
  if (miembro.id_usuario === input.actorUserId) {
    return {
      error: "No puedes cambiar tu propio rol. Hazlo con una cuenta con permisos de plataforma.",
    };
  }

  const { error } = await supabase
    .from("miembros_campana")
    .update({ rol: input.rol })
    .eq("id", input.memberId)
    .eq("id_campana", input.campaignId);

  if (error) {
    // RLS solo permite al dueño de plataforma: para un administrador de
    // campaña, el update exige la service role key.
    if (error.code === "42501") {
      return {
        error:
          "Este rol solo puede cambiarlo la cuenta de plataforma (el RLS de la base no autoriza al administrador de campaña).",
      };
    }
    return { error: error.message };
  }

  return { ok: true };
}

/**
 * Quita a un miembro del equipo de la campaña usando la sesión (RLS).
 * No borra el usuario del sistema de logins (auth), solo su acceso a la campaña.
 */
export async function removeCampaignMember(
  input: ManageMemberInput
): Promise<ManageMemberResult> {
  if (!input.campaignId || !input.memberId) {
    return { error: "Miembro no indicado." };
  }

  const canManage = await userCanManageCampaignTeam(
    input.actorUserId,
    input.campaignId
  );
  if (!canManage) {
    return { error: "No tienes permiso para gestionar el equipo de esta campaña." };
  }

  const supabase = await createServerClient();

  const { data: miembro } = await supabase
    .from("miembros_campana")
    .select("id, id_usuario")
    .eq("id", input.memberId)
    .eq("id_campana", input.campaignId)
    .maybeSingle();

  if (!miembro) return { error: "Miembro no encontrado en esta campaña." };
  if (miembro.id_usuario === input.actorUserId) {
    return { error: "No puedes quitarte a ti mismo del equipo." };
  }

  const { error } = await supabase
    .from("miembros_campana")
    .delete()
    .eq("id", input.memberId)
    .eq("id_campana", input.campaignId);

  if (error) {
    if (error.code === "42501") {
      return {
        error:
          "Solo la cuenta de plataforma puede quitar miembros (el RLS de la base no autoriza al administrador de campaña).",
      };
    }
    return { error: error.message };
  }

  return { ok: true };
}
