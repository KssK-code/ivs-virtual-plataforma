import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'
import { documentoStoragePath, mapDocumentoAlumnoRow } from '@/lib/admin/documentos-admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    const { data: raw, error } = await admin.from('documentos_alumno').select('*')

    if (error) {
      console.error('[GET /api/admin/documentos]', error.message, error.code)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const mapped = (raw ?? []).map(r => mapDocumentoAlumnoRow(r as Record<string, unknown>))
    mapped.sort(
      (a, b) => new Date(b.subido_en).getTime() - new Date(a.subido_en).getTime()
    )

    const alumnoIds = [...new Set(mapped.map(d => d.alumno_id))]

    const { data: usuarios } = alumnoIds.length > 0
      ? await admin.from('usuarios').select('id, nombre, apellidos').in('id', alumnoIds)
      : { data: [] as { id: string; nombre?: string; apellidos?: string }[] }

    const usuarioMap = new Map<string, string>(
      (usuarios ?? []).map(u => [
        u.id,
        [u.nombre, u.apellidos].filter(Boolean).join(' ') || '—',
      ])
    )

    async function signedFor(doc: (typeof mapped)[0]) {
      const path = documentoStoragePath(doc.alumno_id, doc.tipo, doc.nombre_archivo)
      const tryPath = async (p: string) => {
        const { data: signed } = await admin.storage.from('documentos').createSignedUrl(p, 3600)
        return signed?.signedUrl ?? null
      }
      let u = await tryPath(path)
      if (u) return u
      for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'pdf']) {
        u = await tryPath(`${doc.alumno_id}/${doc.tipo}.${ext}`)
        if (u) return u
      }
      return doc.url
    }

    const docs = await Promise.all(
      mapped.map(async doc => ({
        id:               doc.id,
        alumno_id:        doc.alumno_id,
        tipo:             doc.tipo,
        nombre_archivo:   doc.nombre_archivo,
        estado:           doc.estado,
        comentario_admin: doc.comentario_admin,
        subido_en:        doc.subido_en,
        alumno_nombre:    usuarioMap.get(doc.alumno_id) ?? '—',
        signed_url:       await signedFor(doc),
      }))
    )

    return NextResponse.json(docs)
  } catch (err) {
    console.error('[GET /api/admin/documentos] excepción:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
