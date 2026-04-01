import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener alumno completo
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id, matricula, meses_desbloqueados, created_at, planes_estudio(nombre, duracion_meses), usuarios(nombre_completo, email, avatar_url)')
      .eq('usuario_id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as unknown as {
      id: string
      matricula: string
      meses_desbloqueados: number
      created_at: string
      planes_estudio: { nombre: string; duracion_meses: number } | null
      usuarios: { nombre_completo: string; email: string; avatar_url?: string | null } | null
    }

    const duracionMeses = alumno.planes_estudio?.duracion_meses ?? 0

    // Obtener calificaciones
    const { data: califs } = await supabase
      .from('calificaciones')
      .select('materia_id, aprobada')
      .eq('alumno_id', alumno.id)

    const califMap = new Map<string, boolean>()
    for (const c of (califs ?? [])) {
      const row = c as { materia_id: string; aprobada: boolean }
      califMap.set(row.materia_id, row.aprobada)
    }

    // Obtener materias de meses desbloqueados
    const { data: meses } = await supabase
      .from('meses_contenido')
      .select('numero, materias(id, codigo, nombre)')
      .order('numero')
      .lte('numero', alumno.meses_desbloqueados)

    type MesRow = {
      numero: number
      materias: { id: string; codigo: string; nombre: string }[]
    }

    const materiasCursadas: {
      codigo: string
      nombre: string
      mes_numero: number
      estado: 'Acreditada' | 'No acreditada' | 'Pendiente'
    }[] = []

    for (const mes of ((meses ?? []) as unknown as MesRow[])) {
      for (const mat of (mes.materias ?? [])) {
        if (califMap.has(mat.id)) {
          materiasCursadas.push({
            codigo: mat.codigo,
            nombre: mat.nombre,
            mes_numero: mes.numero,
            estado: califMap.get(mat.id) ? 'Acreditada' : 'No acreditada',
          })
        } else {
          materiasCursadas.push({
            codigo: mat.codigo,
            nombre: mat.nombre,
            mes_numero: mes.numero,
            estado: 'Pendiente',
          })
        }
      }
    }

    const porcentaje = duracionMeses > 0
      ? Math.round((alumno.meses_desbloqueados / duracionMeses) * 100)
      : 0

    return NextResponse.json({
      nombre_completo: alumno.usuarios?.nombre_completo ?? '',
      matricula: alumno.matricula,
      plan_nombre: alumno.planes_estudio?.nombre ?? '',
      meses_desbloqueados: alumno.meses_desbloqueados,
      duracion_meses: duracionMeses,
      porcentaje_avance: porcentaje,
      fecha_inscripcion: alumno.created_at,
      avatar_url: alumno.usuarios?.avatar_url ?? null,
      materias_cursadas: materiasCursadas,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
