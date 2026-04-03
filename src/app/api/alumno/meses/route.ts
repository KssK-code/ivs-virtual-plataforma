import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEMO_MATERIA_ID = 'e3f004d8-4451-4a65-9c91-bac3f87d2378' // TUT101 — Tutoría de ingreso I

/** Normaliza texto de BD (mayúsculas, typos) al CHECK de materias.nivel */
function nivelCanon(raw: string | null | undefined): 'secundaria' | 'preparatoria' {
  const s = (raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (s === 'secundaria' || s.includes('secund')) return 'secundaria'
  if (s === 'preparatoria' || s.includes('prepa')) return 'preparatoria'
  return 'preparatoria'
}

type MesMateriaRow = {
  id: string
  numero_mes: number
  titulo: string
  descripcion: string | null
  materias: {
    id: string
    nombre: string
    color: string | null
    descripcion: string | null
    nivel: string
    activa: boolean
  } | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let mesesDesbloqueados = 0
    let inscripcionPagada  = false
    let duracionMeses      = 0
    let alumnoEncontrado   = false
    let nivelAlumno: 'secundaria' | 'preparatoria' = 'preparatoria'

    const { data: a2 } = await supabase
      .from('alumnos')
      .select('meses_desbloqueados, inscripcion_pagada, modalidad, nivel')
      .eq('id', user.id)
      .maybeSingle()

    if (a2) {
      alumnoEncontrado = true
      const row = a2 as unknown as {
        meses_desbloqueados: number
        inscripcion_pagada: boolean
        modalidad?: string
        nivel?: string | null
      }
      mesesDesbloqueados = row.meses_desbloqueados ?? 0
      inscripcionPagada  = row.inscripcion_pagada  ?? false
      duracionMeses      = row.modalidad === '3_meses' ? 3 : 6
      nivelAlumno        = nivelCanon(row.nivel)
    }

    if (!alumnoEncontrado) {
      const { data: a1 } = await supabase
        .from('alumnos')
        .select('meses_desbloqueados, inscripcion_pagada, planes_estudio(duracion_meses), nivel')
        .eq('usuario_id', user.id)
        .maybeSingle()

      if (a1) {
        alumnoEncontrado  = true
        const row = a1 as unknown as {
          meses_desbloqueados: number
          inscripcion_pagada: boolean
          nivel?: string | null
          planes_estudio: { duracion_meses: number } | null
        }
        mesesDesbloqueados = row.meses_desbloqueados ?? 0
        inscripcionPagada  = row.inscripcion_pagada  ?? false
        duracionMeses      = row.planes_estudio?.duracion_meses ?? 6
        nivelAlumno        = nivelCanon(row.nivel)
      }
    }

    if (!alumnoEncontrado) {
      return NextResponse.json({ demo: true, materia_demo_id: DEMO_MATERIA_ID })
    }

    if (!inscripcionPagada && mesesDesbloqueados === 0) {
      return NextResponse.json({ demo: true, materia_demo_id: DEMO_MATERIA_ID })
    }

    // IDs de materias del nivel del alumno (filtro por columna; el filtro embebido .eq('materias.nivel') a veces no aplica bien en PostgREST)
    const { data: matsNivel, error: matsErr } = await supabase
      .from('materias')
      .select('id')
      .eq('nivel', nivelAlumno)
      .eq('activa', true)

    const materiaIds = [...new Set((matsNivel ?? []).map((r: { id: string }) => r.id))]

    if (matsErr || materiaIds.length === 0) {
      const mesesFicticios = Array.from({ length: duracionMeses || 6 }, (_, i) => ({
        id:           `mes-ficticio-${i + 1}`,
        numero:       i + 1,
        numero_mes:   i + 1,
        titulo:       `Mes ${i + 1}`,
        materias:     [] as Array<{
          id: string
          codigo: string
          nombre: string
          nombre_en: string
          color_hex: string
          descripcion: string
          descripcion_en: string
        }>,
        desbloqueado: (i + 1) <= mesesDesbloqueados,
      }))
      return NextResponse.json(mesesFicticios)
    }

    const { data: mesesRaw, error: mesesError } = await supabase
      .from('meses_contenido')
      .select(`
        id,
        numero_mes,
        titulo,
        descripcion,
        materia_id,
        materias (
          id,
          nombre,
          color,
          descripcion,
          nivel,
          activa
        )
      `)
      .in('materia_id', materiaIds)
      .lte('numero_mes', duracionMeses)
      .order('numero_mes')

    if (mesesError || !mesesRaw || mesesRaw.length === 0) {
      const mesesFicticios = Array.from({ length: duracionMeses || 6 }, (_, i) => ({
        id:           `mes-ficticio-${i + 1}`,
        numero:       i + 1,
        numero_mes:   i + 1,
        titulo:       `Mes ${i + 1}`,
        materias:     [] as Array<{
          id: string
          codigo: string
          nombre: string
          nombre_en: string
          color_hex: string
          descripcion: string
          descripcion_en: string
        }>,
        desbloqueado: (i + 1) <= mesesDesbloqueados,
      }))
      return NextResponse.json(mesesFicticios)
    }

    type MatOut = {
      id: string
      codigo: string
      nombre: string
      nombre_en: string
      color_hex: string
      descripcion: string
      descripcion_en: string
    }

    const byMonth = new Map<number, { titulos: string[]; materias: MatOut[] }>()

    for (const row of mesesRaw as unknown as MesMateriaRow[]) {
      const m = row.materias
      if (!m) continue
      // Doble chequeo: no mezclar niveles aunque materia_id estuviera mal enlazado
      if (nivelCanon(m.nivel) !== nivelAlumno) continue
      if (m.activa === false) continue
      const n = row.numero_mes
      if (!byMonth.has(n)) byMonth.set(n, { titulos: [], materias: [] })
      const g = byMonth.get(n)!
      g.titulos.push(row.titulo)
      if (g.materias.some(x => x.id === m.id)) continue
      g.materias.push({
        id: m.id,
        codigo: '',
        nombre: m.nombre,
        nombre_en: m.nombre,
        color_hex: m.color ?? '#5B6CFF',
        descripcion: m.descripcion ?? row.descripcion ?? '',
        descripcion_en: m.descripcion ?? '',
      })
    }

    const sortedMonths = [...byMonth.keys()].sort((a, b) => a - b)

    if (sortedMonths.length === 0) {
      const mesesFicticios = Array.from({ length: duracionMeses || 6 }, (_, i) => ({
        id:           `mes-ficticio-${i + 1}`,
        numero:       i + 1,
        numero_mes:   i + 1,
        titulo:       `Mes ${i + 1}`,
        materias:     [] as MatOut[],
        desbloqueado: (i + 1) <= mesesDesbloqueados,
      }))
      return NextResponse.json(mesesFicticios)
    }

    const result = sortedMonths.map(numero_mes => {
      const g = byMonth.get(numero_mes)!
      g.materias.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

      const titulo =
        g.materias.length === 1 && g.titulos[0]
          ? g.titulos[0]
          : g.materias.map(x => x.nombre).join(' · ')

      const materiasOut = g.materias

      return {
        id:           `mes-${nivelAlumno}-${numero_mes}`,
        numero:       numero_mes,
        numero_mes:   numero_mes,
        titulo,
        materias:     materiasOut,
        desbloqueado: numero_mes <= mesesDesbloqueados,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/alumno/meses] error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
