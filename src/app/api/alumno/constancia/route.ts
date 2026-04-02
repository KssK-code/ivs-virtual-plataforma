import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Usuario ───────────────────────────────────────────────────────────────
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre, apellidos, email, foto_url')
      .eq('id', user.id)
      .single()

    // ── Alumno ────────────────────────────────────────────────────────────────
    const { data: alumno } = await supabase
      .from('alumnos')
      .select('matricula, nivel, modalidad, meses_desbloqueados, created_at')
      .eq('id', user.id)
      .single()

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const nombre_completo = [usuario?.nombre, usuario?.apellidos]
      .filter(Boolean)
      .join(' ') || 'Alumno'

    const duracionMeses = alumno.modalidad === '3_meses' ? 3 : 6

    // ── Calificaciones ────────────────────────────────────────────────────────
    const { data: califs } = await supabase
      .from('calificaciones')
      .select('materia_id, aprobada')
      .eq('alumno_id', user.id)

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
      .lte('numero', alumno.meses_desbloqueados ?? 0)

    type MesRow = { numero: number; materias: { id: string; codigo: string; nombre: string }[] }

    const materias_cursadas: {
      codigo: string; nombre: string; mes_numero: number
      estado: 'Acreditada' | 'No acreditada' | 'Pendiente'
    }[] = []

    for (const mes of ((meses ?? []) as unknown as MesRow[])) {
      for (const mat of (mes.materias ?? [])) {
        materias_cursadas.push({
          codigo:     mat.codigo,
          nombre:     mat.nombre,
          mes_numero: mes.numero,
          estado:     califMap.has(mat.id)
            ? (califMap.get(mat.id) ? 'Acreditada' : 'No acreditada')
            : 'Pendiente',
        })
      }
    }

    const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0
    const porcentaje_avance = duracionMeses > 0
      ? Math.round((mesesDesbloqueados / duracionMeses) * 100)
      : 0

    return NextResponse.json({
      nombre_completo,
      nombre:              usuario?.nombre   ?? '',
      apellidos:           usuario?.apellidos ?? '',
      foto_url:            usuario?.foto_url  ?? null,
      matricula:           alumno.matricula   ?? 'IVS-0000',
      nivel:               alumno.nivel       ?? null,
      modalidad:           alumno.modalidad   ?? '6_meses',
      meses_desbloqueados: mesesDesbloqueados,
      duracion_meses:      duracionMeses,
      plan_nombre:         duracionMeses === 3 ? '3 Meses' : '6 Meses',
      porcentaje_avance,
      fecha_inscripcion:   alumno.created_at,
      avatar_url:          usuario?.foto_url ?? null,
      materias_cursadas,
    })
  } catch (err) {
    console.error('[api/alumno/constancia]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
