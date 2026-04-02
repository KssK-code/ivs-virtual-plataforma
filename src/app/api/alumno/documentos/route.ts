import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Fila canónica para el frontend (migration-documentos.sql) */
type DocFront = {
  id: string
  alumno_id: string
  tipo: string
  nombre_archivo: string
  url: string
  estado: string
  comentario_admin: string | null
  subido_en: string
  revisado_en?: string | null
}

function mapDocumentoRow(row: Record<string, unknown>): DocFront | null {
  if (row?.id == null || row?.alumno_id == null) return null
  if (row.tipo != null && typeof row.tipo === 'string' && row.tipo.length > 0) {
    return {
      id:               String(row.id),
      alumno_id:        String(row.alumno_id),
      tipo:             row.tipo,
      nombre_archivo:   String(row.nombre_archivo ?? ''),
      url:              String(row.url ?? ''),
      estado:           String(row.estado ?? 'pendiente'),
      comentario_admin: (row.comentario_admin as string | null) ?? null,
      subido_en:        String(row.subido_en ?? new Date().toISOString()),
      revisado_en:      (row.revisado_en as string | null) ?? null,
    }
  }

  const verificado = row.verificado === true
  const estado = verificado ? 'aprobado' : 'pendiente'

  return {
    id:               String(row.id),
    alumno_id:        String(row.alumno_id),
    tipo:             String(row.tipo_documento ?? 'curp'),
    nombre_archivo:   String(row.nombre_archivo ?? ''),
    url:              String(row.url_archivo ?? ''),
    estado,
    comentario_admin: (row.notas as string | null) ?? null,
    subido_en:        row.fecha_subida != null ? String(row.fecha_subida) : new Date().toISOString(),
    revisado_en:      row.fecha_verificacion != null ? String(row.fecha_verificacion) : null,
  }
}

export async function GET() {
  try {
    let admin: ReturnType<typeof createAdminClient>
    try {
      admin = createAdminClient()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Admin client error'
      console.error('[api/alumno/documentos GET]', msg)
      return NextResponse.json({ error: msg }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: alumno, error: alumnoErr } = await admin
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (alumnoErr) {
      console.error('[api/alumno/documentos GET] alumno:', alumnoErr.message, alumnoErr.code)
      return NextResponse.json({ error: alumnoErr.message }, { status: 500 })
    }

    if (!alumno) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const a = alumno as { id: string }
    let nivel: string | null = null
    const { data: rowNivel, error: nivelErr } = await admin
      .from('alumnos')
      .select('nivel')
      .eq('id', user.id)
      .maybeSingle()
    if (!nivelErr && rowNivel && typeof (rowNivel as { nivel?: string }).nivel !== 'undefined') {
      nivel = (rowNivel as { nivel: string | null }).nivel ?? null
    }

    const { data: rawDocs, error: docErr } = await admin
      .from('documentos_alumno')
      .select('*')
      .eq('alumno_id', a.id)

    if (docErr) {
      console.error('[api/alumno/documentos GET] documentos_alumno:', docErr.message, docErr.code)
      return NextResponse.json({ error: docErr.message }, { status: 500 })
    }

    const documentos = (rawDocs ?? [])
      .map(r => mapDocumentoRow(r as Record<string, unknown>))
      .filter((d): d is DocFront => d != null)

    const planNombre =
      nivel === 'preparatoria' ? 'Preparatoria'
      : nivel === 'secundaria' ? 'Secundaria'
      : ''

    return NextResponse.json({
      documentos,
      plan_nombre: planNombre,
      nivel,
    })
  } catch (e) {
    console.error('[api/alumno/documentos GET] excepción:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    let admin: ReturnType<typeof createAdminClient>
    try {
      admin = createAdminClient()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Admin client error'
      return NextResponse.json({ error: msg }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await req.formData()
    const archivo = formData.get('archivo') as File | null
    const tipo = formData.get('tipo') as string | null

    if (!archivo) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    if (!tipo) return NextResponse.json({ error: 'Falta el tipo de documento' }, { status: 400 })

    const tiposValidos = [
      'acta_nacimiento', 'curp', 'certificado_primaria',
      'certificado_secundaria', 'identificacion_oficial', 'foto_perfil_doc',
    ]
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 })
    }

    const { data: alumnoPost, error: alumnoPErr } = await admin
      .from('alumnos')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (alumnoPErr || !alumnoPost) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const alumno = alumnoPost as { id: string }

    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const storagePath = `${alumno.id}/${tipo}.${ext}`
    const arrayBuffer = await archivo.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await admin.storage
      .from('documentos')
      .upload(storagePath, buffer, { contentType: archivo.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from('documentos').getPublicUrl(storagePath)

    const payloadNuevo = {
      alumno_id:        alumno.id,
      tipo,
      nombre_archivo:   archivo.name,
      url:              publicUrl,
      estado:           'pendiente',
      comentario_admin: null as string | null,
      subido_en:        new Date().toISOString(),
      revisado_en:      null as string | null,
    }

    let upsertError = (await admin
      .from('documentos_alumno')
      .upsert(payloadNuevo, { onConflict: 'alumno_id,tipo' })).error

    if (upsertError) {
      const payloadLegacy = {
        alumno_id:       alumno.id,
        tipo_documento:  tipo,
        nombre_archivo:  archivo.name,
        url_archivo:     publicUrl,
        verificado:      false,
        fecha_subida:    new Date().toISOString(),
        notas:           null as string | null,
        verificado_por:  null as string | null,
        fecha_verificacion: null as string | null,
      }

      const ins = await admin.from('documentos_alumno').insert(payloadLegacy)
      if (ins.error) {
        const upd = await admin
          .from('documentos_alumno')
          .update({
            nombre_archivo: archivo.name,
            url_archivo:    publicUrl,
            verificado:     false,
            fecha_subida:   new Date().toISOString(),
            notas:          null,
          })
          .eq('alumno_id', alumno.id)
          .eq('tipo_documento', tipo)

        if (upd.error) {
          console.error('[api/alumno/documentos POST]', upsertError.message, ins.error.message, upd.error.message)
          return NextResponse.json({ error: upsertError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ ok: true, path: storagePath })
  } catch (e) {
    console.error('[api/alumno/documentos POST] excepción:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
