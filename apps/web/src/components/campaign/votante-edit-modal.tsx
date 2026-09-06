"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useIsClient } from "@/hooks/use-is-client";
import { updateVotanteAction } from "@/app/(campaign)/campaign/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  FormField,
  platformInputClass,
  platformSelectClass,
} from "@/components/platform/platform-ui";

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

export type VotanteRow = {
  id: number;
  nombres: string;
  apellidos: string;
  documento: string;
  tipo_documento: string;
  sexo: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  mesa: string | null;
  id_rol: number | null;
  id_lugar_trabajo: number | null;
  id_departamento: string | null;
  id_municipio: string | null;
  id_barrio_votante: number | null;
  id_lider_directo: number | null;
  id_puesto_votacion: number | null;
};

type Props = {
  campaignId: number;
  votante: VotanteRow;
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

function useEditModal() {
  const [editing, setEditing] = useState(false);
  const mounted = useIsClient();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!editing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [editing]);

  return { editing, setEditing, mounted, pending, startTransition, router };
}

export function VotanteEditModal({
  campaignId,
  votante,
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
  const { editing, setEditing, mounted, pending, router } =
    useEditModal();

  const [rolId, setRolId] = useState(String(votante.id_rol ?? ""));
  const [liderId, setLiderId] = useState(String(votante.id_lider_directo ?? ""));
  const [residenciaDeptoId, setResidenciaDeptoId] = useState(
    votante.id_departamento ?? ""
  );
  const [residenciaMuniId, setResidenciaMuniId] = useState(
    votante.id_municipio ?? ""
  );
  const [residenciaBarrioId, setResidenciaBarrioId] = useState(
    String(votante.id_barrio_votante ?? "")
  );
  const [municipio, setMunicipio] = useState("");
  const [puestoId, setPuestoId] = useState(
    String(votante.id_puesto_votacion ?? "")
  );

  useEffect(() => {
    if (open) setEditing(true);
  }, [open, setEditing]);

  const municipiosResidencia = useMemo(
    () =>
      residenciaDeptoId
        ? municipios.filter((m) => m.id_departamento === residenciaDeptoId)
        : [],
    [municipios, residenciaDeptoId]
  );

  const barriosResidencia = useMemo(
    () =>
      residenciaMuniId
        ? barrios.filter((b) => b.id_municipio === residenciaMuniId)
        : [],
    [barrios, residenciaMuniId]
  );

  const rolSeleccionado = useMemo(
    () => roles.find((r) => r.id === Number(rolId)),
    [rolId, roles]
  );
  const nivelRol = rolSeleccionado?.nivel_jerarquia ?? null;
  const esJerarquiaMaximaRol = nivelRol === 1;

  const lideresDisponibles = useMemo(() => {
    if (nivelRol == null) return [];
    return lideres.filter(
      (l) => l.nivel_jerarquia != null && l.nivel_jerarquia < nivelRol
    );
  }, [lideres, nivelRol]);

  const municipiosPuesto = useMemo(() => {
    const vistos = new Set<string>();
    const lista: string[] = [];
    for (const puesto of puestos) {
      const nombre = puesto.municipio?.trim();
      if (!nombre) continue;
      const clave = nombre.toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      lista.push(nombre);
    }
    return lista.sort((a, b) => a.localeCompare(b, "es"));
  }, [puestos]);

  const puestosFiltrados = useMemo(
    () => (municipio ? puestos.filter((p) => p.municipio === municipio) : []),
    [municipio, puestos]
  );

  const comunaPuesto = useMemo(() => {
    const puesto = puestos.find((p) => p.id === Number(puestoId));
    if (!puesto?.comunas) return null;
    const rel = puesto.comunas;
    if (Array.isArray(rel)) return rel[0]?.nombre ?? null;
    return rel.nombre;
  }, [puestoId, puestos]);

  if (!editing || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-[1px]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setEditing(false);
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
        <form
          action={async (formData) => {
            const result = await updateVotanteAction(campaignId, formData);
            if (result?.error) {
              window.alert(result.error);
              return;
            }
            setEditing(false);
            onClose();
            router.refresh();
          }}
          className="max-h-[85vh] overflow-y-auto p-6"
        >
          <input type="hidden" name="id" value={votante.id} />
          <input type="hidden" name="tipo_documento" value={votante.tipo_documento} />
          <h3 className="text-base font-semibold text-neutral-900">
            Editar votante
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            {votante.nombres} {votante.apellidos} — {votante.tipo_documento}{" "}
            {votante.documento}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FormField label="Nombres">
              <input
                name="nombres"
                defaultValue={votante.nombres}
                required
                className={platformInputClass}
              />
            </FormField>
            <FormField label="Apellidos">
              <input
                name="apellidos"
                defaultValue={votante.apellidos}
                required
                className={platformInputClass}
              />
            </FormField>
            <FormField label="Documento">
              <input
                name="documento"
                defaultValue={votante.documento}
                required
                className={platformInputClass}
              />
            </FormField>
            <FormField label="Fecha de nacimiento">
              <input
                name="fecha_nacimiento"
                type="date"
                defaultValue={votante.fecha_nacimiento ?? ""}
                className={platformInputClass}
              />
            </FormField>
            <FormField label="Sexo">
              <select
                name="sexo"
                defaultValue={votante.sexo ?? ""}
                className={platformSelectClass}
              >
                <option value="">—</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </FormField>
            <FormField label="Teléfono">
              <input
                name="telefono"
                type="tel"
                inputMode="numeric"
                defaultValue={votante.telefono ?? ""}
                className={platformInputClass}
                placeholder="3001234567"
                pattern="3[0-9]{9}"
                title="Celular colombiano de 10 dígitos que empiece por 3"
              />
            </FormField>
            <FormField label="Dirección" className="sm:col-span-2">
              <input
                name="direccion"
                defaultValue={votante.direccion ?? ""}
                className={platformInputClass}
              />
            </FormField>
          </div>

          {/* UBICACIÓN DE RESIDENCIA */}
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500">
              UBICACIÓN DE RESIDENCIA
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Departamento">
                <select
                  name="id_departamento"
                  value={residenciaDeptoId}
                  onChange={(e) => {
                    setResidenciaDeptoId(e.target.value);
                    setResidenciaMuniId("");
                    setResidenciaBarrioId("");
                  }}
                  className={platformSelectClass}
                >
                  <option value="">—</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Municipio">
                <select
                  name="id_municipio"
                  value={residenciaMuniId}
                  disabled={!residenciaDeptoId}
                  onChange={(e) => {
                    setResidenciaMuniId(e.target.value);
                    setResidenciaBarrioId("");
                  }}
                  className={platformSelectClass}
                >
                  <option value="">
                    {!residenciaDeptoId ? "Selecciona depto." : "—"}
                  </option>
                  {municipiosResidencia.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Barrio / Vereda">
                <select
                  name="id_barrio_votante"
                  value={residenciaBarrioId}
                  disabled={!residenciaMuniId}
                  onChange={(e) => setResidenciaBarrioId(e.target.value)}
                  className={platformSelectClass}
                >
                  <option value="">
                    {!residenciaMuniId ? "Selecciona municipio" : "— Ninguno —"}
                  </option>
                  {barriosResidencia.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* ORGANIZACIÓN */}
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500">
              ORGANIZACIÓN
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Lugar de trabajo">
                <select
                  name="id_lugar_trabajo"
                  defaultValue={votante.id_lugar_trabajo ?? ""}
                  className={platformSelectClass}
                >
                  <option value="">—</option>
                  {lugaresTrabajo.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Rol organizacional">
                <select
                  name="id_rol"
                  value={rolId}
                  onChange={(e) => {
                    setRolId(e.target.value);
                    setLiderId("");
                  }}
                  className={platformSelectClass}
                >
                  <option value="">—</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} (J{r.nivel_jerarquia})
                    </option>
                  ))}
                </select>
              </FormField>
              {!esJerarquiaMaximaRol ? (
                <FormField label="Líder directo">
                  <select
                    name="id_lider_directo"
                    value={liderId}
                    disabled={nivelRol == null}
                    onChange={(e) => setLiderId(e.target.value)}
                    className={platformSelectClass}
                  >
                    <option value="">
                      {nivelRol == null
                        ? "Selecciona un rol"
                        : "Sin líder"}
                    </option>
                    {lideresDisponibles.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.apellidos} {l.nombres}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : (
                <input type="hidden" name="id_lider_directo" value="" />
              )}
            </div>
          </div>

          {/* PUESTO DE VOTACIÓN */}
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500">
              PUESTO DE VOTACIÓN
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Municipio de votación">
                <select
                  value={municipio}
                  onChange={(e) => {
                    setMunicipio(e.target.value);
                    setPuestoId("");
                  }}
                  className={platformSelectClass}
                >
                  <option value="">
                    {municipiosPuesto.length === 0
                      ? "Sin municipios"
                      : "—"}
                  </option>
                  {municipiosPuesto.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Puesto de votación">
                <select
                  name="id_puesto_votacion"
                  value={puestoId}
                  disabled={!municipio}
                  onChange={(e) => setPuestoId(e.target.value)}
                  className={platformSelectClass}
                >
                  <option value="">
                    {!municipio
                      ? "—"
                      : puestosFiltrados.length === 0
                        ? "Sin puestos"
                        : "—"}
                  </option>
                  {puestosFiltrados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                {comunaPuesto ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Comuna: {comunaPuesto}
                  </p>
                ) : null}
              </FormField>
              <FormField label="Mesa">
                <input
                  name="mesa"
                  defaultValue={votante.mesa ?? ""}
                  className={platformInputClass}
                />
              </FormField>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 px-6"
              onClick={() => {
                setEditing(false);
                onClose();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-10 shrink-0 px-6" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
