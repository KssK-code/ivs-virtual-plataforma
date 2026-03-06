import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const { data: meses, error } = await supabase
      .from('meses_contenido')
      .select('*, materias(id, codigo, nombre, color_hex, descripcion)')
      .order('numero')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type MateriaRow = { id: string; codigo: string; nombre: string; color_hex: string; descripcion: string }
    type MesRow = { id: string; numero: number; titulo: string; materias: MateriaRow[] }

    let totalMaterias = 0
    let totalSemanas = 0
    let totalEvaluaciones = 0

    const mesesConStats = await Promise.all(
      ((meses ?? []) as unknown as MesRow[]).map(async (mes) => {
        const materiasConStats = await Promise.all(
          (mes.materias ?? []).map(async (mat) => {
            const [{ count: semCount }, { count: evCount }] = await Promise.all([
              supabase.from('semanas').select('*', { count: 'exact', head: true }).eq('materia_id', mat.id),
              supabase.from('evaluaciones').select('*', { count: 'exact', head: true }).eq('materia_id', mat.id),
            ])
            totalMaterias++
            totalSemanas += semCount ?? 0
            totalEvaluaciones += evCount ?? 0
            return {
              ...mat,
              num_semanas: semCount ?? 0,
              num_evaluaciones: evCount ?? 0,
            }
          })
        )
        return { id: mes.id, numero: mes.numero, titulo: mes.titulo, materias: materiasConStats }
      })
    )

    return NextResponse.json({
      meses: mesesConStats,
      stats: { totalMaterias, totalSemanas, totalEvaluaciones },
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
