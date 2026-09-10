"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/use-is-client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/platform/platform-ui";
import {
  ETIQUETAS_ESTADO,
  type VotanteListRow,
} from "@/components/campaign/votantes-table";

type TipoNovedad = { id: number; novedad: string };
type Rol = { id: number; nombre: string; nivel_jerarquia: number };
type Departamento = { id: string; nombre: string };
type Municipio = { id: string; nombre: string; id_departamento: string };
type BarrioConComuna = {
  id: number;
  nombre: string;
  id_comuna: number;
  id_municipio: string;
};
type LugarTrabajo = { id: number; nombre: string };
type Lider = {
  id: number;
  nombres: string;
  apellidos: string;
  documento: string;
  nivel_jerarquia: number | null;
};
type Puesto = {
  id: number;
  nombre: string;
  municipio: string | null;
  comunas: { nombre: string } | { nombre: string }[] | null;
};

type Props = {
  votante: VotanteListRow;
  tiposNovedad: TipoNovedad[];
  roles: Rol[];
  puestos: Puesto[];
  lugaresTrabajo: LugarTrabajo[];
  lideres: Lider[];
  departamentos: Departamento[];
  municipios: Municipio[];
  barrios: BarrioConComuna[];
  open: boolean;
  onClose: () => void;
};

function nombreNovedad(id: number | null, tipos: TipoNovedad[]): string {
  if (id == null) return "—";
  return tipos.find((t) => t.id === id)?.novedad ?? String(id);
}

function Campo({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-neutral-400 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-neutral-800">{value ?? "—"}</p>
    </div>
  );
}

export function VotanteViewModal({
  votante,
  tiposNovedad,
  roles,
  puestos,
  lugaresTrabajo,
  lideres,
  departamentos,
  municipios,
  barrios,
  open,
  onClose,
}: Props) {
  const mounted = useIsClient();

  useEffect(() => {
    if (!open || !mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, mounted, onClose]);

  if (!open || !mounted) return null;

  const rol = roles.find((r) => r.id === votante.id_rol);
  const puesto = puestos.find((p) => p.id === votante.id_puesto_votacion);
  const lider = lideres.find((l) => l.id === votante.id_lider_directo);
  const trabajo = lugaresTrabajo.find(
    (l) => l.id === votante.id_lugar_trabajo
  );
  const depto = departamentos.find((d) => d.id === votante.id_departamento);
  const muni = municipios.find((m) => m.id === votante.id_municipio);
  const barrio = barrios.find((b) => b.id === votante.id_barrio_votante);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-[1px]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Ver votante
            </h3>
            <p className="mt-0.5 text-sm text-neutral-500">
              {votante.nombres} {votante.apellidos} —{" "}
              <span className="text-neutral-700">
                {votante.tipo_documento} {votante.documento}
              </span>
            </p>
          </div>
          <StatusBadge>
            {ETIQUETAS_ESTADO[votante.estado] ?? votante.estado}
          </StatusBadge>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Nombres" value={votante.nombres} />
            <Campo label="Apellidos" value={votante.apellidos} />
            <Campo
              label="Documento"
              value={`${votante.tipo_documento} ${votante.documento}`}
            />
            <Campo label="Sexo" value={votante.sexo} />
            <Campo label="Teléfono" value={votante.telefono} />
            <Campo
              label="Nacimiento"
              value={
                votante.fecha_nacimiento
                  ? new Date(
                      votante.fecha_nacimiento
                    ).toLocaleDateString("es-CO")
                  : "—"
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Dirección" value={votante.direccion} />
            <Campo
              label="Residencia"
              value={[depto?.nombre, muni?.nombre, barrio?.nombre]
                .filter(Boolean)
                .join(" · ")}
            />
            <Campo label="Rol organizacional" value={rol?.nombre} />
            <Campo label="Líder directo" value={lider ? `${lider.apellidos} ${lider.nombres}` : "—"} />
            <Campo label="Lugar de trabajo" value={trabajo?.nombre} />
            <Campo label="Mesa" value={votante.mesa} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label="Puesto de votación"
              value={
                puesto
                  ? `${puesto.nombre}${puesto.municipio ? ` — ${puesto.municipio}` : ""}`
                  : "—"
              }
            />
            <Campo
              label="Novedad"
              value={`${nombreNovedad(votante.id_tipo_novedad, tiposNovedad)}${
                votante.detalle_novedad
                  ? ` · ${votante.detalle_novedad}`
                  : ""
              }`}
            />
            <Campo
              label="Fecha registro"
              value={new Date(votante.creado_en).toLocaleDateString("es-CO")}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-neutral-100 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 px-6"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}