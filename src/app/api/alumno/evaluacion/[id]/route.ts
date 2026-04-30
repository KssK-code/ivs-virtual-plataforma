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
      .select('id, meses_desbloqueados')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as { id: string; meses_desbloqueados: number }

    // FIX #4: usar nombres reales del schema IVS (no titulo_en/tipo/intentos_max)
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

    // Verificar que la materia pertenece a un mes desbloqueado
    const { data: mesData } = await supabase
      .from('materias')
      .select('meses_contenido(numero)')
      .eq('id', ev.materia_id)
      .single()

    const numeroMes = (mesData as unknown as { meses_contenido: { numero: number } | null })?.meses_contenido?.numero ?? 0
    if (numeroMes > alumno.meses_desbloqueados) {
      return NextResponse.json({ error: 'No tienes acceso a esta evaluación' }, { status: 403 })
    }

    // Contar intentos
    const { count: intentosUsados } = await supabase
      .from('intentos_evaluacion')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', alumno.id)
      .eq('evaluacion_id', params.id)

    // FIX #4: preguntas con schema IVS — opcion_a/b/c/d + orden + pregunta
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

    const pregs = (rawPreguntas ?? []) as unknown as PregRow[]

    // Mapeo a formato legacy esperado por el frontend (sin exponer respuesta_correcta)
    const preguntasLegacy = pregs.map(p => {
      const opciones = [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d].filter(Boolean) as string[]
      return {
        id:          p.id,
        numero:      p.orden ?? 0,
        texto:       p.pregunta,
        texto_en:    p.pregunta,
        tipo:        'opcion_multiple',
        opciones,
        opciones_en: opciones,
        puntos:      1,
      }
    })

    return NextResponse.json({
      evaluacion: {
        id:           ev.id,
        titulo:       ev.titulo,
        titulo_en:    ev.titulo,
        tipo:         'opcion_multiple',
        intentos_max: ev.intentos_permitidos,
      },
      intentos_usados: intentosUsados ?? 0,
      preguntas: preguntasLegacy,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
