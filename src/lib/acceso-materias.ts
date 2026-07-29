/**
 * Fuente única de verdad del acceso del alumno a materias.
 *
 * Ventana modality-aware extraída de /api/alumno/materias (Bug A + gating
 * modality-aware):
 *   materiasPorMes = ceil(materias regulares / duración del plan)
 *   límite         = meses_desbloqueados × materiasPorMes
 *   La ventana se indexa por POSICIÓN ABSOLUTA entre las materias regulares:
 *   las acreditadas siguen accesibles pero SÍ consumen su lugar (Bug 61 — si
 *   no lo consumen, cada acreditación libera un lugar y revela la siguiente
 *   pendiente: con 1 mes pagado se acredita el programa completo). Solo los
 *   tutoriales no consumen lugar (tampoco cuentan para materiasPorMes).
 *   Orden canónico de la ventana: numero_mes, luego orden (en secundaria la
 *   columna `orden` agrupa por tipo de materia y NO sigue los meses).
 *
 * Criterio canon completo (Bugs 54/55): acreditada → siempre accesible;
 * demo → solo sin inscripción pagada; nunca materias de otro nivel;
 * pendientes → solo dentro de la ventana.
 */

export type AlumnoAcceso = {
  nivel: string | null
  modalidad?: string | null
  duracion_meses?: number | null
  meses_desbloqueados: number
  inscripcion_pagada?: boolean | null
}

export type MateriaVentana = {
  id: string
  nombre: string
  nivel: string | null
  orden: number | null
  /** MIN(meses_contenido.numero_mes) de la materia; null si no tiene meses */
  numero_mes: number | null
}

export type MotivoAcceso =
  | 'ok'
  | 'acreditada'
  | 'tutorial'
  | 'demo_pagada'
  | 'nivel_distinto'
  | 'fuera_de_ventana'

export type ResultadoAcceso = { acceso: boolean; motivo: MotivoAcceso }

export function duracionPlan(
  alumno: Pick<AlumnoAcceso, 'modalidad' | 'duracion_meses'>
): number {
  return alumno.duracion_meses ?? (alumno.modalidad === '3_meses' ? 3 : 6)
}

export function esTutorial(mat: Pick<MateriaVentana, 'nivel' | 'nombre'>): boolean {
  return mat.nivel === 'demo' || mat.nombre.toLowerCase().includes('tutor')
}

/**
 * Calcula `disponible` para cada materia del nivel del alumno.
 * El límite (meses_desbloqueados × materiasPorMes) es un techo REAL sobre la
 * posición absoluta de cada materia regular en el orden canónico:
 *   - acreditada → siempre disponible (canon Bug 54: legible, constancia,
 *     re-consulta), pero CONSUME su posición — acreditar no abre nada nuevo.
 *   - pendiente  → disponible solo si su posición cae bajo el límite.
 *   - tutorial   → siempre disponible y sin posición.
 * Pagar el siguiente mes sube el límite y abre las siguientes posiciones,
 * estén como estén (pendientes o ya acreditadas en la era del candado muerto).
 */
export function calcularDisponibilidad(
  alumno: AlumnoAcceso,
  materias: MateriaVentana[],
  acreditadas: Set<string>
): Map<string, boolean> {
  const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0
  const duracionMeses = duracionPlan(alumno)

  const totalRegulares = materias.filter(m => !esTutorial(m)).length
  const materiasPorMes = duracionMeses > 0
    ? Math.ceil(totalRegulares / duracionMeses)
    : 2
  const limiteMaterias = Math.max(0, mesesDesbloqueados * materiasPorMes)

  const sorted = [...materias].sort((a, b) =>
    ((a.numero_mes ?? Number.MAX_SAFE_INTEGER) - (b.numero_mes ?? Number.MAX_SAFE_INTEGER)) ||
    ((a.orden ?? 0) - (b.orden ?? 0))
  )

  const disponibilidad = new Map<string, boolean>()
  let idxRegular = 0
  for (const mat of sorted) {
    if (esTutorial(mat)) {
      disponibilidad.set(mat.id, true)
      continue
    }
    // Bug 61: la acreditada sigue accesible (bypass del canon Bug 54) pero SÍ
    // ocupa su posición en la ventana — antes hacía `continue` sin incrementar
    // el índice y cada acreditación "liberaba" un lugar (ratchet: con 1 mes
    // pagado se podía acreditar el programa completo).
    const dentroDelLimite = mesesDesbloqueados > 0 && idxRegular < limiteMaterias
    disponibilidad.set(mat.id, acreditadas.has(mat.id) || dentroDelLimite)
    idxRegular++
  }
  return disponibilidad
}

/** true si la materia cae dentro de la ventana del alumno (o es tutorial/acreditada). */
export function dentroDeVentana(
  alumno: AlumnoAcceso,
  materias: MateriaVentana[],
  acreditadas: Set<string>,
  materiaId: string
): boolean {
  // Materia fuera de la lista (inactiva / de otro nivel) → fail-closed.
  return calcularDisponibilidad(alumno, materias, acreditadas).get(materiaId) === true
}

/** Criterio canon completo para gates por-materia (contenido, quiz, glosario, progreso). */
export function tieneAccesoMateria(
  alumno: AlumnoAcceso,
  materia: { id: string; nivel: string | null; nombre: string },
  materiasNivel: MateriaVentana[],
  acreditadas: Set<string>
): ResultadoAcceso {
  if (acreditadas.has(materia.id)) return { acceso: true, motivo: 'acreditada' }

  if (materia.nivel === 'demo') {
    return alumno.inscripcion_pagada
      ? { acceso: false, motivo: 'demo_pagada' }
      : { acceso: true, motivo: 'tutorial' }
  }

  if (alumno.nivel && materia.nivel && materia.nivel !== alumno.nivel) {
    return { acceso: false, motivo: 'nivel_distinto' }
  }

  return dentroDeVentana(alumno, materiasNivel, acreditadas, materia.id)
    ? { acceso: true, motivo: 'ok' }
    : { acceso: false, motivo: 'fuera_de_ventana' }
}

// ── Carga de contexto (IO) ────────────────────────────────────────────────────

type FilaMateriaDb = {
  id: string
  nombre: string
  nivel: string | null
  orden: number | null
  meses_contenido: { numero_mes: number }[] | { numero_mes: number } | null
}

/** Normaliza una fila de materias con embed meses_contenido(numero_mes) → MateriaVentana. */
export function toMateriaVentana(row: FilaMateriaDb): MateriaVentana {
  const rel = row.meses_contenido
  const numeros = Array.isArray(rel)
    ? rel.map(r => r.numero_mes)
    : rel
      ? [rel.numero_mes]
      : []
  return {
    id: row.id,
    nombre: row.nombre,
    nivel: row.nivel,
    orden: row.orden,
    numero_mes: numeros.length > 0 ? Math.min(...numeros) : null,
  }
}

// Tipo estructural mínimo para no acoplar el helper a @supabase/supabase-js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClienteDb = { from(table: string): any }

/**
 * Trae las materias activas del nivel + el set de acreditadas del alumno.
 * Funciona igual con el cliente de sesión (RLS: materias/meses_contenido son
 * lectura-autenticados y calificaciones filtra a las propias) o con admin.
 */
export async function cargarContextoAcceso(
  db: ClienteDb,
  alumnoId: string,
  nivel: string | null
): Promise<{ materias: MateriaVentana[]; acreditadas: Set<string> }> {
  const [matsRes, califsRes] = await Promise.all([
    nivel
      ? db
          .from('materias')
          .select('id, nombre, nivel, orden, meses_contenido(numero_mes)')
          .eq('nivel', nivel)
          .eq('activa', true)
      : Promise.resolve({ data: [] }),
    db
      .from('calificaciones')
      .select('materia_id')
      .eq('alumno_id', alumnoId)
      .eq('acreditado', true),
  ])

  const materias = (((matsRes as { data: unknown }).data ?? []) as FilaMateriaDb[])
    .map(toMateriaVentana)
  const acreditadas = new Set<string>(
    (((califsRes as { data: unknown }).data ?? []) as { materia_id: string }[])
      .map(c => c.materia_id)
  )
  return { materias, acreditadas }
}
