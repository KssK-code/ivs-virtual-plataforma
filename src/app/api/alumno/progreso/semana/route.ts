import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { semana_id } = body as { semana_id: string }
    if (!semana_id) return NextResponse.json({ error: 'semana_id requerido' }, { status: 400 })

    // Obtener alumno (schema nuevo: alumnos.id = user.id)
    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!alumnoData) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const alumno = alumnoData as { id: string }

    // Verificar si ya existía el progreso
    const { data: existente } = await supabase
      .from('progreso_semanas')
      .select('id')
      .eq('alumno_id', alumno.id)
      .eq('semana_id', semana_id)
      .single()

    const ya_existia = !!existente

    // Upsert progreso (ignora si ya existe)
    const { error: upsertError } = await supabase
      .from('progreso_semanas')
      .upsert(
        { alumno_id: alumno.id, semana_id },
        { onConflict: 'alumno_id,semana_id', ignoreDuplicates: true }
      )

    if (upsertError) return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 })

    // Si ya existía, no re-evaluar logros
    if (ya_existia) return NextResponse.json({ ok: true, ya_existia: true })

    // Logros y racha: RLS en producción suele no permitir INSERT al alumno → usar service role
    let adminDb: ReturnType<typeof createAdminClient> | null = null
    try {
      adminDb = createAdminClient()
    } catch {
      adminDb = null
    }
    const dbPriv = adminDb ?? supabase

    // ── Verificar logros ──────────────────────────────────────────────────────

    // Contar total de semanas completadas por el alumno
    const { count: totalCompletadas } = await supabase
      .from('progreso_semanas')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', alumno.id)

    // tipo_logro + onConflict (columna real en IVS; no usar "tipo")
    if ((totalCompletadas ?? 0) === 1) {
      const { error: e1 } = await dbPriv
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo_logro: 'primera_semana' },
          { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
        )
      if (e1) console.error('[progreso/semana] logro primera_semana:', e1)
    }

    // FIX #2 logros: semanas.mes_id → meses_contenido.materia_id (no semanas.materia_id)
    const { data: semanaData } = await supabase
      .from('semanas')
      .select('mes_id, meses_contenido!inner(materia_id)')
      .eq('id', semana_id)
      .single()

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
        // Obtener todos los mes_ids de la materia para contar semanas
        const { data: mesesIds } = await supabase
          .from('meses_contenido')
          .select('id')
          .eq('materia_id', materia_id)

        const mesIds = (mesesIds ?? []).map((m: { id: string }) => m.id)

        const { count: totalSemanas } = await supabase
          .from('semanas')
          .select('id', { count: 'exact', head: true })
          .in('mes_id', mesIds)

        // Semanas de la materia ya completadas por el alumno
        const { data: semanasIds } = await supabase
          .from('semanas')
          .select('id')
          .in('mes_id', mesIds)

        const semIds = (semanasIds ?? []).map((s: { id: string }) => s.id)

        const { count: completadasEnMateria } = await supabase
          .from('progreso_semanas')
          .select('id', { count: 'exact', head: true })
          .eq('alumno_id', alumno.id)
          .in('semana_id', semIds)

        if ((totalSemanas ?? 0) > 0 && completadasEnMateria === totalSemanas) {
          const { error: e2 } = await dbPriv
            .from('logros_alumno')
            .upsert(
              { alumno_id: alumno.id, tipo_logro: 'materia_completada' },
              { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
            )
          if (e2) console.error('[progreso/semana] logro materia_completada:', e2)
        }
      }
    }

    // FIX #3 racha: usar tabla racha_actividad (no logros_alumno.metadata)
    const hoyStr = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

    const { data: rachaData } = await supabase
      .from('racha_actividad')
      .select('racha_actual, racha_maxima, ultima_actividad')
      .eq('alumno_id', alumno.id)
      .single()

    const prev = rachaData as {
      racha_actual: number; racha_maxima: number; ultima_actividad: string | null
    } | null

    let diasRacha = 1
    if (prev) {
      const ultima = prev.ultima_actividad
      if (ultima === hoyStr) {
        diasRacha = prev.racha_actual // mismo día, sin cambio
      } else if (ultima) {
        const diffMs = new Date(hoyStr).getTime() - new Date(ultima).getTime()
        const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))
        if (diffDias === 1) diasRacha = (prev.racha_actual ?? 1) + 1
        else                diasRacha = 1
      }
    }

    const nuevaMax = Math.max(diasRacha, prev?.racha_maxima ?? 0)

    const { error: erRacha } = await dbPriv
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
    if (erRacha) console.error('[progreso/semana] racha_actividad:', erRacha)

    // Logros de racha (usan tipo_logro)
    if (diasRacha >= 3) {
      const { error: e3 } = await dbPriv
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo_logro: 'racha_3_dias' },
          { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
        )
      if (e3) console.error('[progreso/semana] logro racha_3:', e3)
    }
    if (diasRacha >= 7) {
      const { error: e4 } = await dbPriv
        .from('logros_alumno')
        .upsert(
          { alumno_id: alumno.id, tipo_logro: 'racha_7_dias' },
          { onConflict: 'alumno_id,tipo_logro', ignoreDuplicates: true }
        )
      if (e4) console.error('[progreso/semana] logro racha_7:', e4)
    }

    return NextResponse.json({ ok: true, ya_existia: false, diasRacha })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
