"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  updateVotanteEstadoAction,
  updateVotanteNovedadAction,
} from "@/app/(campaign)/campaign/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  platformInputClass,
  platformSelectClass,
  StatusBadge,
} from "@/components/platform/platform-ui";
import { VotanteEditModal, type VotanteRow } from "./votante-edit-modal";
import { cn } from "@/lib/utils";

type TipoNovedad = { id: number; novedad: string };
type Rol = { id: number; nombre: string; nivel_jerarquia: number };
type Puesto = {
  id: number;
  nombre: string;
  municipio: string | null;
  comunas: { nombre: string } | { nombre: string }[] | null;
};
type LugarTrabajo = { id: number; nombre: string };
type Lider = {
  id: number;
  nombres: string;
  apellidos: string;
  documento: string;
  nivel_jerarquia: number | null;
};
type Departamento = { id: string; nombre: string };
type Municipio = { id: string; nombre: string; id_departamento: string };
type BarrioConComuna = {
  id: number;
  nombre: string;
  id_comuna: number;
  id_municipio: string;
};

const ESTADOS_EDITABLES: { value: string; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "pendiente_verificacion", label: "Pendiente verificación" },
  { value: "en_cuarentena", label: "Cuarentena" },
];

export type VotanteListRow = {
  id: number;
  nombres: string;
  apellidos: string;
  documento: string;
  tipo_documento: string;
  sexo?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  direccion: string | null;
  estado: string;
  creado_en: string;
  id_tipo_novedad: number | null;
  detalle_novedad: string | null;
  mesa?: string | null;
  id_rol?: number | null;
  id_lugar_trabajo?: number | null;
  id_departamento?: string | null;
  id_municipio?: string | null;
  id_barrio_votante?: number | null;
  id_lider_directo?: number | null;
  id_puesto_votacion?: number | null;
  roles: { nombre: string } | { nombre: string }[] | null;
  lugares_trabajo: { nombre: string } | { nombre: string }[] | null;
  puestos_votacion?:
    | { nombre: string; municipio?: string | null }
    | { nombre: string; municipio?: string | null }[]
    | null;
  lider_directo?:
    | { nombres: string; apellidos: string }
    | { nombres: string; apellidos: string }[]
    | null;
};

export const ETIQUETAS_ESTADO: Record<string, string> = {
  activo: "Activo",
  registrado: "Registrado",
  pendiente_verificacion: "Pendiente verificación",
  en_cuarentena: "Cuarentena",
  rechazado: "Rechazado",
};

function nombreRelacion(
  rel: { nombre: string } | { nombre: string }[] | null | undefined
) {
  if (!rel) return "—";
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "—";
  return rel.nombre;
}

function nombreNovedad(
  id: number | null,
  tipos: TipoNovedad[]
): string {
  if (id == null) return "—";
  return tipos.find((t) => t.id === id)?.novedad ?? String(id);
}

function nombreLider(
  rel:
    | { nombres: string; apellidos: string }
    | { nombres: string; apellidos: string }[]
    | null
    | undefined
) {
  if (!rel) return "—";
  const first = Array.isArray(rel) ? rel[0] : rel;
  if (!first) return "—";
  return `${first.nombres} ${first.apellidos}`.trim() || "—";
}

function municipioPuesto(
  rel:
    | { nombre: string; municipio?: string | null }
    | { nombre: string; municipio?: string | null }[]
    | null
    | undefined
) {
  if (!rel) return "—";
  const first = Array.isArray(rel) ? rel[0] : rel;
  return first?.municipio?.trim() || "—";
}

function NovedadGestionCells({
  campaignId,
  votanteId,
  tipos,
  initialTipoId,
  initialDetalle,
}: {
  campaignId: number;
  votanteId: number;
  tipos: TipoNovedad[];
  initialTipoId: number | null;
  initialDetalle: string | null;
}) {
  const [tipoId, setTipoId] = useState(initialTipoId != null ? String(initialTipoId) : "");
  const [detalle, setDetalle] = useState(initialDetalle ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateVotanteNovedadAction(campaignId, votanteId, {
        id_tipo_novedad: tipoId ? Number(tipoId) : null,
        detalle_novedad: detalle.trim() || null,
      });
      if (result.error) {
        setFeedback(result.error);
        return;
      }
      setFeedback("Guardado");
    });
  }

  return (
    <>
      <td className="min-w-[10rem] px-3 py-2 align-top text-xs text-neutral-700">
        <select
          className={cn(platformSelectClass, "w-full min-w-0 text-xs")}
          value={tipoId}
          disabled={pending}
          onChange={(e) => setTipoId(e.target.value)}
          aria-label="Tipo de novedad"
        >
          <option value="">—</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.novedad}
            </option>
          ))}
        </select>
      </td>
      <td className="min-w-[12rem] px-3 py-2 align-top text-xs text-neutral-700">
        <div className="flex flex-col gap-1.5">
          <textarea
            className={cn(
              platformInputClass,
              "min-h-[3.5rem] resize-y text-xs leading-relaxed"
            )}
            value={detalle}
            disabled={pending}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Detalle…"
            aria-label="Detalle de novedad"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-[11px]"
              disabled={pending}
              onClick={guardar}
            >
              {pending ? "Guardando…" : "Guardar"}
            </Button>
            {feedback ? (
              <span
                className={cn(
                  "text-[11px]",
                  feedback === "Guardado"
                    ? "text-emerald-700"
                    : "text-red-700"
                )}
              >
                {feedback}
              </span>
            ) : null}
          </div>
        </div>
      </td>
    </>
  );
}

type Props = {
  campaignId: number;
  rows: VotanteListRow[];
  tiposNovedad: TipoNovedad[];
  emptyMessage: string;
  showCobertura?: boolean;
  showEstadoEditor?: boolean;
  hideNovedades?: boolean;
  selectedIds?: Set<number>;
  onToggleRow?: (id: number) => void;
  onToggleAllPage?: () => void;
  allPageSelected?: boolean;
  roles?: Rol[];
  puestos?: Puesto[];
  lugaresTrabajo?: LugarTrabajo[];
  lideres?: Lider[];
  departamentos?: Departamento[];
  municipios?: Municipio[];
  barrios?: BarrioConComuna[];
};

function EstadoEditorCell({
  campaignId,
  votanteId,
  estado,
}: {
  campaignId: number;
  votanteId: number;
  estado: string;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  function cambiar(nuevoEstado: string) {
    if (nuevoEstado === estado) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await updateVotanteEstadoAction(
        campaignId,
        votanteId,
        nuevoEstado
      );
      if (result?.error) {
        setFeedback(result.error);
        return;
      }
      setFeedback("Guardado");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <select
        className={cn(platformSelectClass, "w-full min-w-0 text-xs")}
        value={estado}
        disabled={pending}
        onChange={(e) => cambiar(e.target.value)}
        aria-label="Cambiar estado"
      >
        {!ESTADOS_EDITABLES.some((s) => s.value === estado) ? (
          <option value={estado} disabled>
            {ETIQUETAS_ESTADO[estado] ?? estado}
          </option>
        ) : null}
        {ESTADOS_EDITABLES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {feedback ? (
        <span
          className={cn(
            "text-[11px]",
            feedback === "Guardado" ? "text-emerald-700" : "text-red-700"
          )}
        >
          {feedback}
        </span>
      ) : null}
    </div>
  );
}

export function VotantesTable({
  campaignId,
  rows,
  tiposNovedad,
  emptyMessage,
  showCobertura = false,
  showEstadoEditor = false,
  hideNovedades = false,
  selectedIds,
  onToggleRow,
  onToggleAllPage,
  allPageSelected = false,
  roles = [],
  puestos = [],
  lugaresTrabajo = [],
  lideres = [],
  departamentos = [],
  municipios = [],
  barrios = [],
}: Props) {
  const selectable = Boolean(onToggleRow && onToggleAllPage);
  const mostrarNovedades = !hideNovedades;
  const [editingVotante, setEditingVotante] = useState<VotanteRow | null>(null);

  function rowToVotanteRow(v: VotanteListRow): VotanteRow {
    return {
      id: v.id,
      nombres: v.nombres,
      apellidos: v.apellidos,
      documento: v.documento,
      tipo_documento: v.tipo_documento,
      sexo: v.sexo ?? null,
      telefono: v.telefono ?? null,
      fecha_nacimiento: v.fecha_nacimiento ?? null,
      direccion: v.direccion ?? null,
      mesa: v.mesa ?? null,
      id_rol: v.id_rol ?? null,
      id_lugar_trabajo: v.id_lugar_trabajo ?? null,
      id_departamento: v.id_departamento ?? null,
      id_municipio: v.id_municipio ?? null,
      id_barrio_votante: v.id_barrio_votante ?? null,
      id_lider_directo: v.id_lider_directo ?? null,
      id_puesto_votacion: v.id_puesto_votacion ?? null,
    };
  }

  const colCount =
    (showCobertura ? 13 : 9) +
    (selectable ? 1 : 0) -
    (mostrarNovedades ? 0 : 2) +
    1;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-neutral-100">
        <table className="w-full min-w-[60rem] text-xs">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/80 text-left">
              {selectable ? (
                <th className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los de la página"
                    checked={allPageSelected && rows.length > 0}
                    onChange={onToggleAllPage}
                    className="size-3.5 accent-blue-600"
                  />
                </th>
              ) : null}
              <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                Nombre
              </th>
              <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                Documento
              </th>
              {showCobertura && (
                <>
                  <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                    Zona
                  </th>
                  <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                    Puesto
                  </th>
                  <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                    Mesa
                  </th>
                  <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                    Líder
                  </th>
                </>
              )}
              <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                Trabajo
              </th>
              <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                Dirección
              </th>
              <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                Rol
              </th>
              {mostrarNovedades ? (
                <>
                  <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                    Novedad
                  </th>
                  <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                    Detalle
                  </th>
                </>
              ) : null}
              <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                Estado
              </th>
              <th className="px-3 py-2 font-semibold tracking-wide text-neutral-600">
                Registro
              </th>
              <th className="px-3 py-2 text-center font-semibold tracking-wide text-neutral-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length ? (
              rows.map((v) => (
                <tr
                  key={v.id}
                  className={`bg-white transition-colors ${
                    selectedIds?.has(v.id)
                      ? "bg-blue-50/60"
                      : "hover:bg-neutral-50/50"
                  }`}
                >
                  {selectable ? (
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar a ${v.nombres} ${v.apellidos}`}
                        checked={selectedIds?.has(v.id) ?? false}
                        onChange={() => onToggleRow?.(v.id)}
                        className="size-3.5 accent-blue-600"
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-2 font-medium text-neutral-900">
                    {v.nombres} {v.apellidos}
                  </td>
                  <td className="px-3 py-2 text-neutral-700">
                    {v.tipo_documento} {v.documento}
                  </td>
                  {showCobertura && (
                    <>
                      <td className="px-3 py-2 text-neutral-700">
                        {municipioPuesto(v.puestos_votacion)}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {nombreRelacion(v.puestos_votacion)}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {v.mesa?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {nombreLider(v.lider_directo)}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 text-neutral-700">
                    {nombreRelacion(v.lugares_trabajo)}
                  </td>
                  <td className="px-3 py-2 text-neutral-700">
                    {v.direccion ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-700">
                    {nombreRelacion(v.roles)}
                  </td>
                  {mostrarNovedades ? (
                    v.estado === "en_cuarentena" && showEstadoEditor ? (
                      <NovedadGestionCells
                        campaignId={campaignId}
                        votanteId={v.id}
                        tipos={tiposNovedad}
                        initialTipoId={v.id_tipo_novedad}
                        initialDetalle={v.detalle_novedad}
                      />
                    ) : (
                      <>
                        <td className="px-3 py-2 text-neutral-600">
                          {nombreNovedad(v.id_tipo_novedad, tiposNovedad)}
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          {v.detalle_novedad ?? "—"}
                        </td>
                      </>
                    )
                  ) : null}
                  <td className="px-3 py-2">
                    {showEstadoEditor ? (
                      <EstadoEditorCell
                        campaignId={campaignId}
                        votanteId={v.id}
                        estado={v.estado}
                      />
                    ) : (
                      <StatusBadge variant="default">
                        {ETIQUETAS_ESTADO[v.estado] ?? v.estado}
                      </StatusBadge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">
                    {new Date(v.creado_en).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setEditingVotante(rowToVotanteRow(v))}
                      title="Editar votante"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-10 text-center text-neutral-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingVotante && (
        <VotanteEditModal
          key={editingVotante.id}
          campaignId={campaignId}
          votante={editingVotante}
          roles={roles}
          puestos={puestos}
          lugaresTrabajo={lugaresTrabajo}
          lideres={lideres}
          departamentos={departamentos}
          municipios={municipios}
          barrios={barrios}
          open={!!editingVotante}
          onClose={() => setEditingVotante(null)}
        />
      )}
    </>
  );
}
