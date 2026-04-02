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

    // Obtener documentos con datos de alumno
    const { data: documentos, error } = await admin
      .from('documentos_alumno')
      .select(
        `
        id,
        alumno_id,
        tipo,
        nombre_archivo,
        estado,
        comentario_admin,
        subido_en,
        alumnos (
          usuarios ( nombre_completo )
        )
      `
      )
      .order('subido_en', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type DocRow = {
      id: string
      alumno_id: string
      tipo: string
      nombre_archivo: string
      estado: string
      comentario_admin: string | null
      subido_en: string
      alumnos:
        | { usuarios: { nombre_completo: string } | { nombre_completo: string }[] | null }
        | null
    }

    // Generar URLs firmadas
    const result = await Promise.all(
      ((documentos ?? []) as unknown as DocRow[]).map(async (doc) => {
        const ext = doc.nombre_archivo.split('.').pop()?.toLowerCase() ?? 'pdf'
        const storagePath = `${doc.alumno_id}/${doc.tipo}.${ext}`
        const { data: signed } = await admin.storage
          .from('documentos')
          .createSignedUrl(storagePath, 3600)

        const alumnosData = doc.alumnos
        const usuariosData = alumnosData
          ? Array.isArray((alumnosData as { usuarios: unknown }).usuarios)
            ? ((alumnosData as { usuarios: { nombre_completo: string }[] }).usuarios)[0]
            : (alumnosData as { usuarios: { nombre_completo: string } | null }).usuarios
          : null

        return {
          id: doc.id,
          alumno_id: doc.alumno_id,
          tipo: doc.tipo,
          nombre_archivo: doc.nombre_archivo,
          estado: doc.estado,
          comentario_admin: doc.comentario_admin,
          subido_en: doc.subido_en,
          signed_url: signed?.signedUrl ?? null,
          alumno_nombre: usuariosData?.nombre_completo ?? null,
        }
      })
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/admin/documentos]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
