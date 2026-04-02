import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Datos del alumno (schema nuevo: alumnos.id = user.id) ─────────────────
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id, matricula, meses_desbloqueados, created_at, modalidad')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as {
      id: string; matricula?: string; meses_desbloqueados: number
      created_at: string; modalidad?: string
    }

    const duracionMeses = alumno.modalidad === '3_meses' ? 3 : 6

    // ── Nombre del usuario (nombre + apellidos, no nombre_completo) ───────────
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('nombre, apellidos, foto_url, avatar_url')
      .eq('id', user.id)
      .single()

    const u = usuarioData as {
      nombre?: string; apellidos?: string
      foto_url?: string | null; avatar_url?: string | null
    } | null

    const nombreCompleto = [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || 'Alumno'
    const avatarUrl = u?.foto_url ?? u?.avatar_url ?? null

    // ── Calificaciones ────────────────────────────────────────────────────────
    const { data: califs } = await supabase
      .from('calificaciones')
      .select('materia_id, aprobada')
      .eq('alumno_id', alumno.id)

    const califMap = new Map<string, boolean>()
    for (const c of (califs ?? [])) {
      const row = c as { materia_id: string; aprobada: boolean }
      califMap.set(row.materia_id, row.aprobada)
    }

    // ── Materias de meses desbloqueados ───────────────────────────────────────
    const { data: meses } = await supabase
      .from('meses_contenido')
      .select('numero, materias(id, codigo, nombre)')
      .order('numero')
      .lte('numero', alumno.meses_desbloqueados)

    type MesRow = { numero: number; materias: { id: string; codigo: string; nombre: string }[] }

    const materiasCursadas: {
      codigo: string; nombre: string; mes_numero: number
      estado: 'Acreditada' | 'No acreditada' | 'Pendiente'
    }[] = []

    for (const mes of ((meses ?? []) as unknown as MesRow[])) {
      for (const mat of (mes.materias ?? [])) {
        materiasCursadas.push({
          codigo:     mat.codigo,
          nombre:     mat.nombre,
          mes_numero: mes.numero,
          estado:     califMap.has(mat.id)
            ? (califMap.get(mat.id) ? 'Acreditada' : 'No acreditada')
            : 'Pendiente',
        })
      }
    }

    const porcentaje = duracionMeses > 0
      ? Math.round((alumno.meses_desbloqueados / duracionMeses) * 100)
      : 0

    return NextResponse.json({
      nombre_completo:     nombreCompleto,
      nombre:              u?.nombre ?? '',
      apellidos:           u?.apellidos ?? '',
      matricula:           alumno.matricula ?? 'IVS-0000',
      plan_nombre:         duracionMeses === 3 ? '3 Meses' : '6 Meses',
      meses_desbloqueados: alumno.meses_desbloqueados,
      duracion_meses:      duracionMeses,
      porcentaje_avance:   porcentaje,
      fecha_inscripcion:   alumno.created_at,
      avatar_url:          avatarUrl,
      materias_cursadas:   materiasCursadas,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
