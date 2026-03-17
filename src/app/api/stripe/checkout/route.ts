/**
 * POST /api/stripe/checkout
 * Crea una sesión de Stripe Checkout para pagos EDVEX.
 * Body: { tipo, alumnoId, moduloNumero }
 * tipo: 'inscripcion' | 'modulo_estandar' | 'modulo_acelerado' | 'certificacion'
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

const PRICE_IDS: Record<string, string> = {
  inscripcion: process.env.STRIPE_PRICE_INSCRIPCION!,
  modulo_estandar: process.env.STRIPE_PRICE_MODULO_ESTANDAR!,
  modulo_acelerado: process.env.STRIPE_PRICE_MODULO_ACELERADO!,
  certificacion: process.env.STRIPE_PRICE_CERTIFICACION!,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tipo, alumnoId, moduloNumero } = body as { tipo?: string; alumnoId?: string; moduloNumero?: string }

    if (!tipo || !alumnoId || moduloNumero === undefined) {
      return NextResponse.json(
        { error: 'Faltan tipo, alumnoId o moduloNumero' },
        { status: 400 }
      )
    }

    const priceId = PRICE_IDS[tipo]
    if (!priceId) {
      return NextResponse.json({ error: 'Tipo de pago no válido' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/alumno?pago=exitoso`,
      cancel_url: `${baseUrl}/alumno?pago=cancelado`,
      metadata: {
        alumnoId,
        moduloNumero: String(moduloNumero),
        priceId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Stripe Checkout]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al crear sesión' },
      { status: 500 }
    )
  }
}
