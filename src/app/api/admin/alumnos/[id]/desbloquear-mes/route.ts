import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/supabase/verify-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const denied = await verifyAdmin(supabase, user.id)
    if (denied) return denied

    const body = await request.json()
    const { monto, metodo_pago, referencia } = body

    if (!monto || !metodo_pago) {
      return NextResponse.json({ error: 'Monto y método de pago son requeridos' }, { status: 400 })
    }

    // Obtener alumno con su plan
    const { data: alumno, error: fetchError } = await supabase
      .from('alumnos')
      .select('id, meses_desbloqueados, planes_estudio!inner ( duracion_meses )')
      .eq('id', params.id)
      .single()

    if (fetchError || !alumno) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    type AlumnoConPlan = { meses_desbloqueados: number; planes_estudio: { duracion_meses: number } }
    const alumnoData = alumno as unknown as AlumnoConPlan
    const duracionMeses = alumnoData.planes_estudio.duracion_meses
    const mesesActuales = alumnoData.meses_desbloqueados

    if (mesesActuales >= duracionMeses) {
      return NextResponse.json({ error: 'El alumno ya tiene todos los meses desbloqueados' }, { status: 400 })
    }

    const nuevoMes = mesesActuales + 1

    // Incrementar meses_desbloqueados
    const { error: updateError } = await supabase
      .from('alumnos')
      .update({ meses_desbloqueados: nuevoMes })
      .eq('id', params.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Registrar pago
    const { error: pagoError } = await supabase
      .from('pagos')
      .insert({
        alumno_id: params.id,
        monto: Number(monto),
        mes_desbloqueado: nuevoMes,
        metodo_pago,
        referencia: referencia || null,
        registrado_por: user.id,
      })

    if (pagoError) return NextResponse.json({ error: pagoError.message }, { status: 500 })

    return NextResponse.json({ success: true, meses_desbloqueados: nuevoMes })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
