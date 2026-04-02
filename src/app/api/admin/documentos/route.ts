import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

type DocRow = {
  id: string
  alumno_id: string
  tipo: string
  nombre_archivo: string
  estado: string
  comentario_admin: string | null
  subido_en: string
  url?: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('documentos_alumno')
      .select(`
        id,
        alumno_id,
        tipo,
        nombre_archivo,
        url,
        estado,
        comentario_admin,
        subido_en
      `)
      .order('subido_en', { ascending: false })

    if (error) {
      console.error('[GET /api/admin/documentos] Error:', error.message, '| code:', error.code)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const alumnoIds = [...new Set((data ?? []).map((d: DocRow) => d.alumno_id))]

    const { data: usuarios } = alumnoIds.length > 0
      ? await admin.from('usuarios').select('id, nombre, apellidos').in('id', alumnoIds)
      : { data: [] as { id: string; nombre?: string; apellidos?: string }[] }

    const usuarioMap = new Map<string, string>(
      (usuarios ?? []).map(u => [
        u.id,
        [u.nombre, u.apellidos].filter(Boolean).join(' ') || '—',
      ])
    )

    const docs = await Promise.all(
      ((data ?? []) as DocRow[]).map(async doc => {
        const ext = doc.nombre_archivo.split('.').pop()?.toLowerCase() ?? 'pdf'
        const storagePath = `${doc.alumno_id}/${doc.tipo}.${ext}`
        const { data: signed } = await admin.storage
          .from('documentos')
          .createSignedUrl(storagePath, 3600)
        return {
          ...doc,
          alumno_nombre: usuarioMap.get(doc.alumno_id) ?? '—',
          signed_url:    signed?.signedUrl ?? doc.url ?? null,
        }
      })
    )

    return NextResponse.json(docs)
  } catch (err) {
    console.error('[GET /api/admin/documentos] excepción:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
