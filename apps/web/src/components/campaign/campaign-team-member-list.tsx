"use client";

import { useActionState } from "react";
import {
  CAMPAIGN_MEMBER_ROLE_LABELS,
  CAMPAIGN_MEMBER_ROLES,
  type CampaignMemberRole,
} from "@/lib/campaign/member-auth";
import type { CampaignMemberWithProfile } from "@/lib/campaign/team";
import { cn } from "@/lib/utils";

type MemberActionState = { error?: string; ok?: boolean } | undefined;

type MemberAction = (
  formData: FormData
) => Promise<MemberActionState>;

export function CampaignTeamMemberList({
  members,
  campaignId,
  onChangeRole,
  onRemoveMember,
}: {
  members: CampaignMemberWithProfile[];
  campaignId: string;
  onChangeRole?: MemberAction;
  onRemoveMember?: MemberAction;
}) {
  if (!members.length) {
    return (
      <li className="rounded-lg border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-500">
        Sin miembros asignados.
      </li>
    );
  }

  const canManage = Boolean(onChangeRole && onRemoveMember);

  return (
    <>
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          campaignId={campaignId}
          canManage={canManage}
          onChangeRole={onChangeRole}
          onRemoveMember={onRemoveMember}
        />
      ))}
    </>
  );
}

function MemberRow({
  member,
  campaignId,
  canManage,
  onChangeRole,
  onRemoveMember,
}: {
  member: CampaignMemberWithProfile;
  campaignId: string;
  canManage: boolean;
  onChangeRole?: MemberAction;
  onRemoveMember?: MemberAction;
}) {
  const [roleState, roleAction, rolePending] = useActionState<MemberActionState, FormData>(
    async (_prev, formData) => onChangeRole?.(formData),
    undefined
  );
  const [removeState, removeAction, removePending] =
    useActionState<MemberActionState, FormData>(
      async (_prev, formData) => onRemoveMember?.(formData),
      undefined
    );

  const currentRol = member.rol as CampaignMemberRole;

  return (
    <li className="rounded-lg border border-neutral-100 bg-neutral-50/50 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium text-neutral-900">
            {member.nombre ?? member.usuario ?? "Usuario sin nombre"}
          </p>
          {member.usuario && member.nombre ? (
            <p className="truncate text-xs text-neutral-500">{member.usuario}</p>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-2">
            <form action={roleAction} className="flex items-center gap-2">
              <input type="hidden" name="id_campana" value={campaignId} />
              <input type="hidden" name="id_miembro" value={member.id} />
              <select
                name="rol"
                defaultValue={currentRol}
                disabled={rolePending}
                className={cn(
                  "platform-input h-8 rounded-lg px-2 text-xs text-neutral-700",
                  rolePending && "opacity-60"
                )}
              >
                {CAMPAIGN_MEMBER_ROLES.map((rol) => (
                  <option key={rol} value={rol}>
                    {CAMPAIGN_MEMBER_ROLE_LABELS[rol]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={rolePending}
                className="h-8 shrink-0 rounded-lg border border-neutral-300 bg-white px-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
              >
                Guardar
              </button>
            </form>

            <form action={removeAction}>
              <input type="hidden" name="id_campana" value={campaignId} />
              <input type="hidden" name="id_miembro" value={member.id} />
              <button
                type="submit"
                disabled={removePending}
                className="h-8 shrink-0 rounded-lg border border-red-200 bg-red-50 px-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Quitar
              </button>
            </form>
          </div>
        ) : (
          <span className="shrink-0 rounded-lg bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
            {CAMPAIGN_MEMBER_ROLE_LABELS[currentRol] ?? currentRol}
          </span>
        )}
      </div>

      {(roleState?.error || removeState?.error) && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {roleState?.error ?? removeState?.error}
        </p>
      )}
      {removeState?.ok && (
        <p className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Miembro quitado del equipo.
        </p>
      )}
    </li>
  );
}