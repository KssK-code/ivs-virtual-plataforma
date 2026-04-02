import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()

    const { data: usuario, error: usuarioErr } = await admin
      .from('usuarios')
      .select('nombre, apellidos, email, foto_url')
      .eq('id', user.id)
      .maybeSingle()

    if (usuarioErr) {
      console.error('[api/alumno/constancia] usuario:', usuarioErr.message)
      return NextResponse.json({ error: usuarioErr.message }, { status: 500 })
    }

    const { data: alumno, error: alumnoErr } = await admin
      .from('alumnos')
      .select('matricula, nivel, modalidad, meses_desbloqueados, created_at')
      .eq('id', user.id)
      .maybeSingle()

    if (alumnoErr) {
      console.error('[api/alumno/constancia] alumno:', alumnoErr.message)
      return NextResponse.json({ error: alumnoErr.message }, { status: 500 })
    }

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    // Foto: Mis Documentos usa tipo_documento = 'foto_perfil_doc'; legado opcional 'foto_perfil'
    const { data: fotoDoc } = await admin
      .from('documentos_alumno')
      .select('url_archivo')
      .eq('alumno_id', user.id)
      .eq('tipo_documento', 'foto_perfil_doc')
      .order('fecha_subida', { ascending: false })
      .limit(1)
      .maybeSingle()

    let urlDesdeDoc = (fotoDoc as { url_archivo?: string } | null)?.url_archivo?.trim() || null
    if (!urlDesdeDoc) {
      const { data: fotoLegado } = await admin
        .from('documentos_alumno')
        .select('url_archivo')
        .eq('alumno_id', user.id)
        .eq('tipo_documento', 'foto_perfil')
        .order('fecha_subida', { ascending: false })
        .limit(1)
        .maybeSingle()
      urlDesdeDoc = (fotoLegado as { url_archivo?: string } | null)?.url_archivo?.trim() || null
    }

    const nombre_completo = [usuario?.nombre, usuario?.apellidos]
      .filter(Boolean)
      .join(' ') || 'Alumno'

    const duracionMeses = alumno.modalidad === '3_meses' ? 3 : 6

    const { data: califs } = await admin
      .from('calificaciones')
      .select('materia_id, acreditado')
      .eq('alumno_id', user.id)

    const califMap = new Map<string, boolean>()
    for (const c of (califs ?? [])) {
      const row = c as { materia_id: string; acreditado: boolean }
      califMap.set(row.materia_id, row.acreditado)
    }

    const { data: meses } = await admin
      .from('meses_contenido')
      .select('numero_mes, materias(id, nombre)')
      .order('numero_mes')
      .lte('numero_mes', alumno.meses_desbloqueados ?? 0)

    type MesRow = {
      numero_mes: number
      materias: { id: string; nombre: string } | null
    }

    const materias_cursadas: {
      materia_id: string
      codigo: string
      nombre_materia: string
      mes_numero: number
      estado: 'Acreditada' | 'No acreditada' | 'Pendiente'
    }[] = []

    for (const mes of ((meses ?? []) as unknown as MesRow[])) {
      const mat = mes.materias
      if (!mat) continue
      materias_cursadas.push({
        materia_id:     mat.id,
        codigo:         '',
        nombre_materia: mat.nombre,
        mes_numero:     mes.numero_mes,
        estado:         califMap.has(mat.id)
          ? (califMap.get(mat.id) ? 'Acreditada' : 'No acreditada')
          : 'Pendiente',
      })
    }

    const mesesDesbloqueados = alumno.meses_desbloqueados ?? 0
    const porcentaje_avance = duracionMeses > 0
      ? Math.round((mesesDesbloqueados / duracionMeses) * 100)
      : 0

    const fotoUrl =
      urlDesdeDoc || usuario?.foto_url?.trim() || null

    return NextResponse.json({
      nombre_completo,
      nombre:              usuario?.nombre   ?? '',
      apellidos:           usuario?.apellidos ?? '',
      foto_url:            fotoUrl,
      matricula:           alumno.matricula   ?? 'IVS-0000',
      nivel:               alumno.nivel       ?? null,
      modalidad:           alumno.modalidad   ?? '6_meses',
      meses_desbloqueados: mesesDesbloqueados,
      duracion_meses:      duracionMeses,
      plan_nombre:         duracionMeses === 3 ? '3 Meses' : '6 Meses',
      porcentaje_avance,
      fecha_inscripcion:   alumno.created_at,
      avatar_url:          fotoUrl,
      materias_cursadas,
    })
  } catch (err) {
    console.error('[api/alumno/constancia]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
