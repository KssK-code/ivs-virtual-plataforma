'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface Perfil {
  id: string
  inscripcion_pagada: boolean
  modulos_desbloqueados: number[]
}

type TipoPago = 'inscripcion' | 'modulo_estandar' | 'modulo_acelerado' | 'certificacion'

const OPCIONES: {
  id: string
  tipo: TipoPago
  amount: number
  currency: string
  titleKey: 'payment.inscription' | 'payment.moduloEstandar' | 'payment.moduloAcelerado' | 'payment.certificacion'
  descKey: 'payment.inscriptionDesc' | 'payment.moduloEstandarDesc' | 'payment.moduloAceleradoDesc' | 'payment.certificacionDesc'
  moduloNumero: number | 'inscripcion' | 'certificacion'
  visible: (p: Perfil) => boolean
}[] = [
  {
    id: 'inscripcion',
    tipo: 'inscripcion',
    amount: 50,
    currency: 'USD',
    titleKey: 'payment.inscription',
    descKey: 'payment.inscriptionDesc',
    moduloNumero: 'inscripcion',
    visible: (p) => !p.inscripcion_pagada,
  },
  {
    id: 'modulo-estandar',
    tipo: 'modulo_estandar',
    amount: 150,
    currency: 'USD',
    titleKey: 'payment.moduloEstandar',
    descKey: 'payment.moduloEstandarDesc',
    moduloNumero: 1,
    visible: () => true,
  },
  {
    id: 'modulo-acelerado',
    tipo: 'modulo_acelerado',
    amount: 300,
    currency: 'USD',
    titleKey: 'payment.moduloAcelerado',
    descKey: 'payment.moduloAceleradoDesc',
    moduloNumero: 2,
    visible: () => true,
  },
  {
    id: 'certificacion',
    tipo: 'certificacion',
    amount: 450,
    currency: 'USD',
    titleKey: 'payment.certificacion',
    descKey: 'payment.certificacionDesc',
    moduloNumero: 'certificacion',
    visible: (p) => (p.modulos_desbloqueados?.length ?? 0) >= 6,
  },
]

export default function PagarPage() {
  const { t } = useLanguage()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/alumno/perfil')
      .then(r => r.json())
      .then(p => setPerfil(p))
      .finally(() => setLoading(false))
  }, [])

  async function handlePay(opcion: (typeof OPCIONES)[number]) {
    if (!perfil) return
    if (opcion.id === 'inscripcion' && perfil.inscripcion_pagada) {
      return
    }
    if (opcion.id === 'certificacion' && (perfil.modulos_desbloqueados?.length ?? 0) < 6) {
      return
    }
    setPayingId(opcion.id)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: opcion.tipo,
          alumnoId: perfil.id,
          moduloNumero: opcion.moduloNumero,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear pago')
      if (data.url) window.location.href = data.url
      else throw new Error(t('payment.errorCheckout'))
    } catch (e) {
      console.error(e)
      alert(t('payment.errorCheckout'))
    } finally {
      setPayingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#5B6CFF' }} />
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="text-sm" style={{ color: '#EF4444' }}>
        {t('profile.noProfile')}
      </div>
    )
  }

  const visibles = OPCIONES.filter(o => o.visible(perfil))

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#F1F5F9' }}>
          {t('payment.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
          {t('payment.subtitle')}
        </p>
      </div>

      <div className="grid gap-4">
        {visibles.map((opcion) => {
          const disabled =
            (opcion.id === 'certificacion' && (perfil.modulos_desbloqueados?.length ?? 0) < 6) ||
            (opcion.id === 'inscripcion' && perfil.inscripcion_pagada)
          const isPaying = payingId === opcion.id

          return (
            <div
              key={opcion.id}
              className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{
                background: '#181C26',
                border: '1px solid #2A2F3E',
              }}
            >
              <div className="min-w-0">
                <p className="font-medium" style={{ color: '#F1F5F9' }}>
                  {t(opcion.titleKey)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                  {t(opcion.descKey)}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-lg font-semibold" style={{ color: '#7B8AFF' }}>
                  ${opcion.amount} {opcion.currency}
                </span>
                <button
                  onClick={() => handlePay(opcion)}
                  disabled={disabled || isPaying}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{
                    background: '#5B6CFF',
                    color: '#fff',
                  }}
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('payment.redirecting')}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      {t('payment.pay')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {OPCIONES.some(o => o.id === 'inscripcion' && !o.visible(perfil)) && (
        <p className="text-xs" style={{ color: '#64748B' }}>
          {t('payment.alreadyPaid')}
        </p>
      )}
      {OPCIONES.some(o => o.id === 'certificacion' && !o.visible(perfil)) && (
        <p className="text-xs" style={{ color: '#64748B' }}>
          {t('payment.needSixModules')}
        </p>
      )}
    </div>
  )
}
