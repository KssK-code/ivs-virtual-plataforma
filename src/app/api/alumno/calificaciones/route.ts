import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener alumno con plan
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id, meses_desbloqueados, planes_estudio(duracion_meses)')
      .eq('usuario_id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as unknown as {
      id: string
      meses_desbloqueados: number
      planes_estudio: { duracion_meses: number } | null
    }

    const duracionMeses = alumno.planes_estudio?.duracion_meses ?? 0

    // Obtener calificaciones registradas
    const { data: califs } = await supabase
      .from('calificaciones')
      .select('materia_id, aprobada')
      .eq('alumno_id', alumno.id)

    const califMap = new Map<string, boolean>()
    for (const c of (califs ?? [])) {
      const row = c as { materia_id: string; aprobada: boolean }
      califMap.set(row.materia_id, row.aprobada)
    }

    // Obtener todas las materias de los meses del plan
    const { data: meses } = await supabase
      .from('meses_contenido')
      .select('numero, materias(id, codigo, nombre)')
      .order('numero')
      .lte('numero', duracionMeses)

    type MesRow = {
      numero: number
      materias: { id: string; codigo: string; nombre: string }[]
    }

    const resultado: {
      materia_id: string
      codigo: string
      nombre_materia: string
      mes_numero: number
      estado: 'Acreditada' | 'No acreditada' | 'Pendiente'
    }[] = []

    for (const mes of ((meses ?? []) as unknown as MesRow[])) {
      for (const mat of (mes.materias ?? [])) {
        if (califMap.has(mat.id)) {
          resultado.push({
            materia_id: mat.id,
            codigo: mat.codigo,
            nombre_materia: mat.nombre,
            mes_numero: mes.numero,
            estado: califMap.get(mat.id) ? 'Acreditada' : 'No acreditada',
          })
        } else if (mes.numero <= alumno.meses_desbloqueados) {
          resultado.push({
            materia_id: mat.id,
            codigo: mat.codigo,
            nombre_materia: mat.nombre,
            mes_numero: mes.numero,
            estado: 'Pendiente',
          })
        }
      }
    }

    const acreditadas = resultado.filter(r => r.estado === 'Acreditada').length
    const noAcreditadas = resultado.filter(r => r.estado === 'No acreditada').length
    const pendientes = resultado.filter(r => r.estado === 'Pendiente').length

    return NextResponse.json({
      materias: resultado,
      resumen: {
        total_materias_plan: resultado.length,
        materias_acreditadas: acreditadas,
        materias_no_acreditadas: noAcreditadas,
        materias_pendientes: pendientes,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
