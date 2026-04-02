import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Conversión entre letra IVS ('a'/'b'/'c') e índice (0/1/2) que usa el componente
const LETTER_TO_IDX = { a: 0, b: 1, c: 2 } as const
const IDX_TO_LETTER = ['a', 'b', 'c'] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: { semanaId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { semanaId } = params

    // FIX #2 quiz: usar opcion_a/b/c en lugar de opciones[]
    const { data: rawPreguntas } = await supabase
      .from('quiz_semana')
      .select('id, pregunta, opcion_a, opcion_b, opcion_c, respuesta_correcta, orden')
      .eq('semana_id', semanaId)
      .order('orden')

    type QuizRow = {
      id: string; pregunta: string
      opcion_a: string; opcion_b: string; opcion_c: string
      respuesta_correcta: string; orden: number | null
    }

    // Mapear al formato del componente (opciones[] + respuesta_correcta como índice)
    const preguntas = ((rawPreguntas ?? []) as unknown as QuizRow[]).map(p => ({
      id:                 p.id,
      pregunta:           p.pregunta,
      opciones:           [p.opcion_a, p.opcion_b, p.opcion_c],
      respuesta_correcta: LETTER_TO_IDX[p.respuesta_correcta as keyof typeof LETTER_TO_IDX] ?? 0,
      orden:              p.orden ?? 0,
    }))

    if (preguntas.length === 0) {
      return NextResponse.json({ preguntas: [], respuesta_previa: null })
    }

    const preguntaIds = preguntas.map(p => p.id)

    // FIX #2 quiz: verificar respuestas previas por quiz_id (no semana_id)
    const { data: respuestasExistentes } = await supabase
      .from('quiz_respuestas')
      .select('quiz_id, respuesta, correcta, fecha')
      .eq('alumno_id', user.id)
      .in('quiz_id', preguntaIds)

    let respuesta_previa = null
    if ((respuestasExistentes?.length ?? 0) >= preguntaIds.length) {
      // Ya completó el quiz — reconstruir mapa quiz_id → índice
      const respMap: Record<string, number> = {}
      let fechaMax = ''
      for (const r of (respuestasExistentes ?? [])) {
        const row = r as { quiz_id: string; respuesta: string; correcta: boolean; fecha: string }
        respMap[row.quiz_id] = LETTER_TO_IDX[row.respuesta as keyof typeof LETTER_TO_IDX] ?? -1
        if (row.fecha > fechaMax) fechaMax = row.fecha
      }
      respuesta_previa = { respuestas: respMap, completado_en: fechaMax }
    }

    return NextResponse.json({ preguntas, respuesta_previa })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params: _params }: { params: { semanaId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { respuestas } = body as { respuestas: Record<string, number> }

    if (!respuestas) return NextResponse.json({ error: 'respuestas requeridas' }, { status: 400 })

    const preguntaIds = Object.keys(respuestas)
    if (preguntaIds.length === 0) return NextResponse.json({ ok: true })

    // Obtener respuestas correctas para calificar (IVS: respuesta_correcta = 'a'/'b'/'c')
    const { data: preguntas } = await supabase
      .from('quiz_semana')
      .select('id, respuesta_correcta')
      .in('id', preguntaIds)

    type QuizCorrectRow = { id: string; respuesta_correcta: string }

    // Evitar duplicados: no volver a insertar si ya respondió
    const { data: existentes } = await supabase
      .from('quiz_respuestas')
      .select('quiz_id')
      .eq('alumno_id', user.id)
      .in('quiz_id', preguntaIds)

    const yaRespondidos = new Set(
      (existentes ?? []).map((r: { quiz_id: string }) => r.quiz_id)
    )

    // FIX #2 quiz: insertar una fila por pregunta con quiz_id, respuesta (letra), correcta
    const rows = ((preguntas ?? []) as unknown as QuizCorrectRow[])
      .filter(p => !yaRespondidos.has(p.id))
      .map(p => {
        const selectedIdx = respuestas[p.id] ?? -1
        const respLetra   = selectedIdx >= 0 ? (IDX_TO_LETTER[selectedIdx] ?? null) : null
        return {
          alumno_id: user.id,
          quiz_id:   p.id,
          respuesta: respLetra,
          correcta:  respLetra === p.respuesta_correcta,
        }
      })

    if (rows.length > 0) {
      await supabase.from('quiz_respuestas').insert(rows)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
