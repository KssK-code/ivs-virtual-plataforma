import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEMO_MATERIA_ID = 'e3f004d8-4451-4a65-9c91-bac3f87d2378' // TUT101 — Tutoría de ingreso I

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
    let nivelAlumno        = 'preparatoria' as string

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
      if (row.nivel === 'secundaria' || row.nivel === 'preparatoria') nivelAlumno = row.nivel
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
        if (row.nivel === 'secundaria' || row.nivel === 'preparatoria') nivelAlumno = row.nivel
      }
    }

    if (!alumnoEncontrado) {
      return NextResponse.json({ demo: true, materia_demo_id: DEMO_MATERIA_ID })
    }

    if (!inscripcionPagada && mesesDesbloqueados === 0) {
      return NextResponse.json({ demo: true, materia_demo_id: DEMO_MATERIA_ID })
    }

    // Solo meses de materias del mismo nivel que el alumno (evita mezclar Prepa / Secundaria)
    const { data: mesesRaw, error: mesesError } = await supabase
      .from('meses_contenido')
      .select(`
        id,
        numero_mes,
        titulo,
        descripcion,
        materias!inner (
          id,
          nombre,
          color,
          descripcion,
          nivel,
          activa
        )
      `)
      .eq('materias.nivel', nivelAlumno)
      .eq('materias.activa', true)
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
