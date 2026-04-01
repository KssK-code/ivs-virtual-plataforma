import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEMO_MATERIA_ID = 'e3f004d8-4451-4a65-9c91-bac3f87d2378' // TUT101 — Tutoría de ingreso I

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Resolver datos del alumno (schema antiguo o nuevo) ────────────────────
    let mesesDesbloqueados = 0
    let inscripcionPagada  = false
    let duracionMeses      = 0
    let alumnoEncontrado   = false

    // Intento 1: schema antiguo (alumnos.usuario_id)
    const { data: a1 } = await supabase
      .from('alumnos')
      .select('meses_desbloqueados, inscripcion_pagada, planes_estudio(duracion_meses)')
      .eq('usuario_id', user.id)
      .single()

    if (a1) {
      alumnoEncontrado  = true
      const row = a1 as unknown as {
        meses_desbloqueados: number
        inscripcion_pagada: boolean
        planes_estudio: { duracion_meses: number } | null
      }
      mesesDesbloqueados = row.meses_desbloqueados ?? 0
      inscripcionPagada  = row.inscripcion_pagada  ?? false
      duracionMeses      = row.planes_estudio?.duracion_meses ?? 6
    }

    // Intento 2: schema nuevo (alumnos.id = user.id)
    if (!alumnoEncontrado) {
      const { data: a2 } = await supabase
        .from('alumnos')
        .select('meses_desbloqueados, inscripcion_pagada, modalidad')
        .eq('id', user.id)
        .single()

      if (a2) {
        alumnoEncontrado = true
        const row = a2 as unknown as {
          meses_desbloqueados: number
          inscripcion_pagada: boolean
          modalidad?: string
        }
        mesesDesbloqueados = row.meses_desbloqueados ?? 0
        inscripcionPagada  = row.inscripcion_pagada  ?? false
        duracionMeses      = row.modalidad === '3_meses' ? 3 : 6
      }
    }

    // Sin perfil → modo demo
    if (!alumnoEncontrado) {
      return NextResponse.json({ demo: true, materia_demo_id: DEMO_MATERIA_ID })
    }

    // Sin pago y sin meses → modo demo
    if (!inscripcionPagada && mesesDesbloqueados === 0) {
      return NextResponse.json({ demo: true, materia_demo_id: DEMO_MATERIA_ID })
    }

    // ── Obtener meses del contenido ───────────────────────────────────────────
    const { data: meses, error: mesesError } = await supabase
      .from('meses_contenido')
      .select('*, materias(id, codigo, nombre, nombre_en, color_hex)')
      .order('numero')
      .lte('numero', duracionMeses)

    // Si la tabla no existe o no tiene datos → generar meses ficticios
    if (mesesError || !meses || meses.length === 0) {
      const mesesFicticios = Array.from({ length: duracionMeses || 6 }, (_, i) => ({
        id:          `mes-ficticio-${i + 1}`,
        numero:      i + 1,
        titulo:      `Mes ${i + 1}`,
        materias:    [],
        desbloqueado: (i + 1) <= mesesDesbloqueados,
      }))
      return NextResponse.json(mesesFicticios)
    }

    const result = meses.map((mes: unknown) => {
      const m = mes as {
        id: string
        numero: number
        titulo: string
        materias: { id: string; codigo: string; nombre: string; color_hex: string }[]
      }
      return {
        ...m,
        desbloqueado: m.numero <= mesesDesbloqueados,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/alumno/meses] error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
