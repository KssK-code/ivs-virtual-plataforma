import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/** Insert idempotente: ignora violación UNIQUE (23505) */
async function otorgarLogro(
  db: SupabaseClient,
  alumnoId: string,
  tipoLogro: string
): Promise<void> {
  console.log('Intentando otorgar logro:', tipoLogro, alumnoId)
  const { data, error } = await db
    .from('logros_alumno')
    .insert({ alumno_id: alumnoId, tipo_logro: tipoLogro })
    .select('id, tipo_logro, fecha_obtenido')
    .maybeSingle()

  if (error) {
    const code = (error as { code?: string }).code
    const msg = String((error as { message?: string }).message ?? '')
    const dup = code === '23505' || /duplicate key|unique constraint/i.test(msg)
    if (dup) {
      console.log('Resultado logro:', null, error)
      return
    }
    console.log('Resultado logro:', null, error)
    console.error('[progreso/semana] Error logro', tipoLogro, error)
    return
  }
  console.log('Resultado logro:', data, null)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { semana_id } = body as { semana_id: string }
    if (!semana_id) return NextResponse.json({ error: 'semana_id requerido' }, { status: 400 })

    console.log('=== PROGRESO SEMANA ===', { semanaId: semana_id, userId: user.id })

    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as { id: string }

    let adminDb: SupabaseClient | null = null
    try {
      adminDb = createAdminClient()
    } catch (e) {
      console.warn(
        '[progreso/semana] createAdminClient falló — progreso/logros/racha usan cliente de sesión (puede fallar por RLS).',
        e
      )
    }
    const dbProg = adminDb ?? supabase
    const dbPriv = dbProg

    const { data: existente } = await dbProg
      .from('progreso_semanas')
      .select('id, completada')
      .eq('alumno_id', alumno.id)
      .eq('semana_id', semana_id)
      .maybeSingle()

    const yaCompletadaAntes = existente?.completada === true

    const fechaCompletada = new Date().toISOString()
    console.log('[progreso/semana] upsert progreso_semanas', {
      alumno_id: alumno.id,
      semana_id,
      completada: true,
      usa_service_role: !!adminDb,
    })

    const { data: progresoGuardado, error: upsertError } = await dbProg
      .from('progreso_semanas')
      .upsert(
        {
          alumno_id: alumno.id,
          semana_id,
          completada: true,
          fecha_completada: fechaCompletada,
        },
        { onConflict: 'alumno_id,semana_id' }
      )
      .select('id, completada, fecha_completada')
      .maybeSingle()

    if (upsertError) {
      console.error('[progreso/semana] upsert progreso_semanas:', upsertError)
      return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 })
    }
    console.log('[progreso/semana] fila guardada:', progresoGuardado)

    // Contar semanas marcadas como completadas (misma fuente que la UI)
    const { count: totalCompletadas, error: countErr } = await dbPriv
      .from('progreso_semanas')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', alumno.id)
      .eq('completada', true)

    if (countErr) console.error('[progreso/semana] count progreso_semanas:', countErr)

    const semanasCompletadas = totalCompletadas ?? 0

    console.log(
      '[progreso/semana] semana_id:',
      semana_id,
      'alumno:',
      alumno.id,
      'ya_completada_antes:',
      yaCompletadaAntes,
      'total_completadas:',
      semanasCompletadas,
      'usa_service_role:',
      !!adminDb
    )

    // Primera semana completada en la plataforma (idempotente si ya hay fila)
    console.log('Evaluando logro primera_semana, semanas completadas:', semanasCompletadas)
    if (semanasCompletadas >= 1) {
      await otorgarLogro(dbPriv, alumno.id, 'primera_semana')
    }

    const { data: semanaData } = await supabase
      .from('semanas')
      .select('mes_id, meses_contenido!inner(materia_id)')
      .eq('id', semana_id)
      .maybeSingle()

    if (semanaData) {
      const raw = semanaData as unknown as {
        mes_id: string
        meses_contenido: { materia_id: string } | { materia_id: string }[]
      }
      const mc = Array.isArray(raw.meses_contenido)
        ? raw.meses_contenido[0]
        : raw.meses_contenido
      const materia_id = mc?.materia_id

      if (materia_id) {
        const { data: mesesIds } = await supabase
          .from('meses_contenido')
          .select('id')
          .eq('materia_id', materia_id)

        const mesIds = (mesesIds ?? []).map((m: { id: string }) => m.id)

        const { count: totalSemanas } = await dbPriv
          .from('semanas')
          .select('id', { count: 'exact', head: true })
          .in('mes_id', mesIds)

        const { data: semanasIds } = await supabase
          .from('semanas')
          .select('id')
          .in('mes_id', mesIds)

        const semIds = (semanasIds ?? []).map((s: { id: string }) => s.id)

        const { count: completadasEnMateria } = await dbPriv
          .from('progreso_semanas')
          .select('id', { count: 'exact', head: true })
          .eq('alumno_id', alumno.id)
          .eq('completada', true)
          .in('semana_id', semIds)

        if ((totalSemanas ?? 0) > 0 && completadasEnMateria === totalSemanas) {
          await otorgarLogro(dbPriv, alumno.id, 'materia_completada')
        }
      }
    }

    const hoyStr = new Date().toISOString().slice(0, 10)

    const { data: rachaData } = await dbPriv
      .from('racha_actividad')
      .select('racha_actual, racha_maxima, ultima_actividad')
      .eq('alumno_id', alumno.id)
      .maybeSingle()

    const prev = rachaData as {
      racha_actual: number; racha_maxima: number; ultima_actividad: string | null
    } | null

    let diasRacha = 1
    if (prev) {
      const ultima = prev.ultima_actividad
      if (ultima === hoyStr) {
        diasRacha = prev.racha_actual
      } else if (ultima) {
        const diffMs = new Date(hoyStr).getTime() - new Date(ultima).getTime()
        const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))
        if (diffDias === 1) diasRacha = (prev.racha_actual ?? 1) + 1
        else                diasRacha = 1
      }
    }

    const nuevaMax = Math.max(diasRacha, prev?.racha_maxima ?? 0)

    console.log('[progreso/semana] racha upsert', { alumno: alumno.id, diasRacha, nuevaMax, hoyStr })

    const { data: rachaOut, error: erRacha } = await dbPriv
      .from('racha_actividad')
      .upsert(
        {
          alumno_id:        alumno.id,
          racha_actual:     diasRacha,
          racha_maxima:     nuevaMax,
          ultima_actividad: hoyStr,
        },
        { onConflict: 'alumno_id', ignoreDuplicates: false }
      )
      .select('alumno_id, racha_actual')
      .maybeSingle()

    if (erRacha) console.error('[progreso/semana] racha_actividad:', erRacha)
    else console.log('[progreso/semana] Resultado racha:', rachaOut, erRacha)

    if (diasRacha >= 3) await otorgarLogro(dbPriv, alumno.id, 'racha_3_dias')
    if (diasRacha >= 7) await otorgarLogro(dbPriv, alumno.id, 'racha_7_dias')

    return NextResponse.json({
      ok: true,
      ya_completada_antes: yaCompletadaAntes,
      diasRacha,
    })
  } catch (e) {
    console.error('[progreso/semana] excepción:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
