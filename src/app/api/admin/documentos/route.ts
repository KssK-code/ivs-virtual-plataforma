import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

/**
 * GET /api/admin/documentos
 * Retorna todos los documentos de alumnos con información del alumno y URLs firmadas.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const admin = createAdminClient()

    // Obtener documentos (sin join a usuarios — schema nuevo comparte ID)
    const { data: documentos, error } = await admin
      .from('documentos_alumno')
      .select('id, alumno_id, tipo, nombre_archivo, estado, comentario_admin, subido_en')
      .order('subido_en', { ascending: false })

    if (error) {
      console.error('[GET /api/admin/documentos] Error fetching documentos_alumno:', error.message, error.code)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type DocRow = {
      id: string
      alumno_id: string
      tipo: string
      nombre_archivo: string
      estado: string
      comentario_admin: string | null
      subido_en: string
    }

    const docs = (documentos ?? []) as unknown as DocRow[]

    // Obtener nombres de usuarios en una sola query (alumnos.id = usuarios.id en schema nuevo)
    const alumnoIds = [...new Set(docs.map(d => d.alumno_id))]
    const { data: usuarios } = alumnoIds.length > 0
      ? await admin.from('usuarios').select('id, nombre, apellidos').in('id', alumnoIds)
      : { data: [] }

    const usuarioMap = new Map<string, string>(
      (usuarios ?? []).map((u: { id: string; nombre?: string; apellidos?: string }) => [
        u.id,
        [u.nombre, u.apellidos].filter(Boolean).join(' ') || '—',
      ])
    )

    // Generar URLs firmadas
    const result = await Promise.all(
      docs.map(async (doc) => {
        const ext = doc.nombre_archivo.split('.').pop()?.toLowerCase() ?? 'pdf'
        const storagePath = `${doc.alumno_id}/${doc.tipo}.${ext}`
        const { data: signed } = await admin.storage
          .from('documentos')
          .createSignedUrl(storagePath, 3600)

        return {
          id: doc.id,
          alumno_id: doc.alumno_id,
          tipo: doc.tipo,
          nombre_archivo: doc.nombre_archivo,
          estado: doc.estado,
          comentario_admin: doc.comentario_admin,
          subido_en: doc.subido_en,
          signed_url: signed?.signedUrl ?? null,
          alumno_nombre: usuarioMap.get(doc.alumno_id) ?? null,
        }
      })
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/admin/documentos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
