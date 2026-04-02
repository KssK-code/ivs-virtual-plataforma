import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ── Intentar con schema antiguo: alumnos.usuario_id ──────────────────────
    const { data, error } = await supabase
      .from('alumnos')
      .select('*, planes_estudio(nombre, duracion_meses), usuarios(nombre, apellidos, nombre_completo, email, avatar_url)')
      .eq('usuario_id', user.id)
      .single()

    if (!error && data) {
      const a = data as unknown as {
        id: string
        matricula: string
        meses_desbloqueados: number
        inscripcion_pagada?: boolean
        nivel?: string
        planes_estudio: { nombre: string; duracion_meses: number } | null
        usuarios: { nombre?: string; apellidos?: string; nombre_completo?: string; email: string; avatar_url?: string | null } | null
      }
      // Combinar nombre + apellidos si nombre_completo no existe
      const nombreCompleto = a.usuarios?.nombre_completo
        ?? (a.usuarios?.nombre ? `${a.usuarios.nombre} ${a.usuarios.apellidos ?? ''}`.trim() : null)
        ?? user.email
        ?? 'Alumno'

      return NextResponse.json({
        id:                  a.id,
        matricula:           a.matricula ?? 'IVS-0000',
        meses_desbloqueados: a.meses_desbloqueados ?? 0,
        inscripcion_pagada:  a.inscripcion_pagada ?? false,
        nivel:               a.nivel ?? null,
        plan_nombre:         a.planes_estudio?.nombre ?? '',
        duracion_meses:      a.planes_estudio?.duracion_meses ?? 0,
        nombre_completo:     nombreCompleto,
        email:               a.usuarios?.email ?? user.email ?? '',
        avatar_url:          a.usuarios?.avatar_url ?? null,
      })
    }

    // ── Intentar con schema nuevo: alumnos.id = auth.users.id ────────────────
    const { data: data2, error: error2 } = await supabase
      .from('alumnos')
      .select('*')
      .eq('id', user.id)
      .single()

    // ── Obtener datos del usuario (nuevo schema: nombre + apellidos) ──────────
    const { data: usuarioNuevo } = await supabase
      .from('usuarios')
      .select('nombre, apellidos, nombre_completo, email, foto_url, rol')
      .eq('id', user.id)
      .single()

    if (!error2 && data2) {
      const a = data2 as unknown as {
        id: string
        matricula?: string
        meses_desbloqueados?: number
        inscripcion_pagada?: boolean
        nivel?: string
        modalidad?: string
      }
      const u = usuarioNuevo as unknown as {
        nombre?: string
        apellidos?: string
        nombre_completo?: string
        email?: string
        foto_url?: string | null
      } | null

      const nombreCompleto = u?.nombre_completo
        ?? (u?.nombre && u?.apellidos ? `${u.nombre} ${u.apellidos}`.trim() : null)
        ?? user.email
        ?? 'Alumno'

      return NextResponse.json({
        id:                  a.id,
        matricula:           a.matricula ?? 'IVS-0000',
        meses_desbloqueados: a.meses_desbloqueados ?? 0,
        inscripcion_pagada:  a.inscripcion_pagada ?? false,
        nivel:               a.nivel ?? null,
        plan_nombre:         a.nivel === 'preparatoria' ? 'Preparatoria' : 'Secundaria',
        duracion_meses:      6,
        nombre_completo:     nombreCompleto,
        email:               u?.email ?? user.email ?? '',
        avatar_url:          u?.foto_url ?? null,
      })
    }

    // ── Fallback: usuario autenticado pero sin perfil completo ────────────────
    // En lugar de 404, devolver datos mínimos para que el dashboard renderice
    const { data: uFallback } = await supabase
      .from('usuarios')
      .select('nombre, apellidos, nombre_completo, email, rol')
      .eq('id', user.id)
      .single()

    const uf = uFallback as unknown as {
      nombre?: string; apellidos?: string; nombre_completo?: string; email?: string
    } | null

    const nombreFallback = uf?.nombre_completo
      ?? (uf?.nombre ? `${uf.nombre} ${uf?.apellidos ?? ''}`.trim() : null)
      ?? user.email
      ?? 'Alumno'

    return NextResponse.json({
      id:                  user.id,
      matricula:           'IVS-0000',
      meses_desbloqueados: 0,
      inscripcion_pagada:  false,
      nivel:               null,
      plan_nombre:         '',
      duracion_meses:      0,
      nombre_completo:     nombreFallback,
      email:               user.email ?? '',
      avatar_url:          null,
    })
  } catch (err) {
    console.error('[api/alumno/perfil] error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
