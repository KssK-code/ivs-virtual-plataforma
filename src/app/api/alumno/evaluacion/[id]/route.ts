import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id, nivel, meses_desbloqueados')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as { id: string; nivel: string; meses_desbloqueados: number }

    // FIX #4 examen: usar intentos_permitidos (no intentos_max), sin titulo_en ni tipo
    const { data: evaluacion, error: evalError } = await supabase
      .from('evaluaciones')
      .select('id, titulo, intentos_permitidos, activa, materia_id')
      .eq('id', params.id)
      .single()

    if (evalError || !evaluacion) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
    }

    const ev = evaluacion as {
      id: string; titulo: string; intentos_permitidos: number; activa: boolean; materia_id: string
    }

    if (!ev.activa) {
      return NextResponse.json({ error: 'Esta evaluación no está disponible' }, { status: 403 })
    }

    // FIX #4: acceso por nivel completo (meses_desbloqueados > 0), sin chequeo por numero_mes
    if (alumno.meses_desbloqueados <= 0) {
      return NextResponse.json({ error: 'No tienes meses desbloqueados' }, { status: 403 })
    }

    // Contar intentos
    const { count: intentosUsados } = await supabase
      .from('intentos_evaluacion')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', alumno.id)
      .eq('evaluacion_id', params.id)

    // FIX #4: preguntas con schema IVS (opcion_a/b/c/d, orden) — sin respuesta_correcta al cliente
    const { data: rawPreguntas, error: pregError } = await supabase
      .from('preguntas')
      .select('id, orden, pregunta, opcion_a, opcion_b, opcion_c, opcion_d')
      .eq('evaluacion_id', params.id)
      .order('orden')

    if (pregError) return NextResponse.json({ error: pregError.message }, { status: 500 })

    type PregRow = {
      id: string; orden: number | null; pregunta: string
      opcion_a: string; opcion_b: string; opcion_c: string; opcion_d: string | null
    }

    // Mapear al formato EDVEX-compatible (texto + opciones[] + numero)
    const preguntas = ((rawPreguntas ?? []) as unknown as PregRow[]).map(p => ({
      id:      p.id,
      numero:  p.orden ?? 0,
      texto:   p.pregunta,
      texto_en: p.pregunta,
      tipo:    'opcion_multiple',
      opciones: [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d].filter(Boolean) as string[],
      opciones_en: [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d].filter(Boolean) as string[],
      puntos:  1,
    }))

    return NextResponse.json({
      evaluacion: {
        id:           ev.id,
        titulo:       ev.titulo,
        titulo_en:    ev.titulo,
        tipo:         'final',
        intentos_max: ev.intentos_permitidos,
      },
      intentos_usados: intentosUsados ?? 0,
      preguntas,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
