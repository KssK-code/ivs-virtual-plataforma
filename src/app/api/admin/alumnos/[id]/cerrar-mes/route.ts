import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── Verificar sesión ──────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Verificar rol ADMIN (case-insensitive, mismo patrón que desbloquear-mes) ─
    const { data: usuarioAdmin } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    const esAdmin = (usuarioAdmin?.rol as string | undefined)?.toLowerCase() === 'admin'
    if (!esAdmin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    // ── Usar service role para saltarse RLS ───────────────────────────────────
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const alumnoId = params.id

    // ── Obtener alumno ────────────────────────────────────────────────────────
    const { data: alumno, error: alumnoErr } = await admin
      .from('alumnos')
      .select('id, meses_desbloqueados, nivel')
      .eq('id', alumnoId)
      .single()

    if (alumnoErr || !alumno) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const { meses_desbloqueados, nivel } = alumno as {
      meses_desbloqueados: number
      nivel: string
    }

    if (meses_desbloqueados <= 0) {
      return NextResponse.json(
        { error: 'El alumno no tiene meses desbloqueados que cerrar' },
        { status: 400 }
      )
    }

    // ── Identificar materia del mes a cerrar ──────────────────────────────────
    // Mes N del alumno = materia en posición N (1-indexed) ordenada por orden,nombre
    // OFFSET = meses_desbloqueados - 1 (0-indexed)
    const offset = meses_desbloqueados - 1
    const { data: materias, error: matErr } = await admin
      .from('materias')
      .select('id, nombre')
      .eq('nivel', nivel)
      .eq('activa', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
      .range(offset, offset)

    if (matErr || !materias || materias.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró la materia correspondiente al mes a cerrar' },
        { status: 400 }
      )
    }

    const materia = materias[0] as { id: string; nombre: string }
    const materiaId = materia.id

    // ── Obtener IDs intermedios para los DELETEs ──────────────────────────────

    // meses_contenido → semanas
    const { data: mesesContenido } = await admin
      .from('meses_contenido')
      .select('id')
      .eq('materia_id', materiaId)

    const mesIds = (mesesContenido ?? []).map((m: { id: string }) => m.id)

    const semanaIds: string[] = []
    if (mesIds.length > 0) {
      const { data: semanas } = await admin
        .from('semanas')
        .select('id')
        .in('mes_id', mesIds)
      for (const s of semanas ?? []) semanaIds.push((s as { id: string }).id)
    }

    // evaluaciones de esta materia
    const { data: evaluaciones } = await admin
      .from('evaluaciones')
      .select('id')
      .eq('materia_id', materiaId)

    const evaluacionIds = (evaluaciones ?? []).map((e: { id: string }) => e.id)

    // quizzes de estas semanas
    const quizIds: string[] = []
    if (semanaIds.length > 0) {
      const { data: quizzes } = await admin
        .from('quiz_semana')
        .select('id')
        .in('semana_id', semanaIds)
      for (const q of quizzes ?? []) quizIds.push((q as { id: string }).id)
    }

    // ── Borrar datos del alumno en orden ──────────────────────────────────────
    let countQuiz = 0
    let countProgreso = 0
    let countIntentos = 0
    let countCal = 0

    // 1. quiz_respuestas
    if (quizIds.length > 0) {
      const { count } = await admin
        .from('quiz_respuestas')
        .delete({ count: 'exact' })
        .eq('alumno_id', alumnoId)
        .in('quiz_id', quizIds)
      countQuiz = count ?? 0
    }

    // 2. progreso_semanas
    if (semanaIds.length > 0) {
      const { count } = await admin
        .from('progreso_semanas')
        .delete({ count: 'exact' })
        .eq('alumno_id', alumnoId)
        .in('semana_id', semanaIds)
      countProgreso = count ?? 0
    }

    // 3. intentos_evaluacion
    if (evaluacionIds.length > 0) {
      const { count } = await admin
        .from('intentos_evaluacion')
        .delete({ count: 'exact' })
        .eq('alumno_id', alumnoId)
        .in('evaluacion_id', evaluacionIds)
      countIntentos = count ?? 0
    }

    // 4. calificaciones
    const { count: calCount } = await admin
      .from('calificaciones')
      .delete({ count: 'exact' })
      .eq('alumno_id', alumnoId)
      .eq('materia_id', materiaId)
    countCal = calCount ?? 0

    // 5. Decrementar meses_desbloqueados
    const { error: updateErr } = await admin
      .from('alumnos')
      .update({ meses_desbloqueados: meses_desbloqueados - 1 })
      .eq('id', alumnoId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      mes_cerrado: meses_desbloqueados,
      materia_id: materiaId,
      materia_nombre: materia.nombre,
      datos_borrados: {
        calificaciones: countCal,
        intentos:       countIntentos,
        progreso:       countProgreso,
        quizzes:        countQuiz,
      },
    })
  } catch (err) {
    console.error('[POST /api/admin/alumnos/[id]/cerrar-mes]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
