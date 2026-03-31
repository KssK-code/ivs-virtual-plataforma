'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

interface ReadingProgressProps {
  semanaId: string
  alumnoId: string
  lang: string
  onCompletada?: () => void
  yaCompletada?: boolean
}

export default function ReadingProgress({
  semanaId,
  lang,
  onCompletada,
  yaCompletada = false,
}: ReadingProgressProps) {
  const [scrollPct, setScrollPct] = useState(0)
  const [completada, setCompletada] = useState(yaCompletada)
  const [cargando, setCargando] = useState(false)

  const calcularScroll = useCallback(() => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0
    setScrollPct(Math.round(pct))
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', calcularScroll, { passive: true })
    calcularScroll()
    return () => window.removeEventListener('scroll', calcularScroll)
  }, [calcularScroll])

  // Sincronizar prop externa
  useEffect(() => {
    if (yaCompletada) setCompletada(true)
  }, [yaCompletada])

  const marcarLeido = async () => {
    if (cargando || completada) return
    setCargando(true)
    try {
      await fetch('/api/alumno/progreso/semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semana_id: semanaId }),
      })
      setCompletada(true)
      onCompletada?.()
    } catch {
      // silencioso — no bloquear al alumno
    } finally {
      setCargando(false)
    }
  }

  const mostrarUI = scrollPct > 20

  return (
    <>
      {/* Barra de progreso fija en la parte superior */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          zIndex: 9999,
          background: '#1E2330',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${scrollPct}%`,
            background: '#6366F1',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Botón / badge sticky al fondo */}
      {mostrarUI && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9998,
          }}
        >
          {completada ? (
            <div
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg"
              style={{ background: '#166534', color: '#86EFAC', border: '1px solid #15803D' }}
            >
              <CheckCircle className="w-4 h-4" />
              {lang === 'en' ? 'Week completed' : 'Semana completada'}
            </div>
          ) : scrollPct >= 85 ? (
            <button
              onClick={marcarLeido}
              disabled={cargando}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-opacity disabled:opacity-70"
              style={{ background: '#6366F1', color: '#fff', border: 'none', cursor: cargando ? 'not-allowed' : 'pointer' }}
            >
              {cargando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>✓</span>
              )}
              {lang === 'en' ? 'Mark as read — watch videos' : 'Marcar como leído — ver videos'}
            </button>
          ) : null}
        </div>
      )}
    </>
  )
}
