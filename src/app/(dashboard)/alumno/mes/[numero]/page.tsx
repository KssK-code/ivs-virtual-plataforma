'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, BookOpen, ChevronRight, LayoutGrid } from 'lucide-react'

interface MateriaResumen {
  id: string
  codigo: string
  nombre: string
  nombre_en: string
  color_hex: string
  descripcion: string
  descripcion_en: string
}

interface Mes {
  id: string
  numero: number
  titulo: string
  desbloqueado: boolean
  materias: MateriaResumen[]
}

/** Card alineada al estilo de /alumno/materias (IVS: barra color, blanco, Estudiar) */
function MesMateriaCard({
  mat,
  onEstudiar,
}: {
  mat: MateriaResumen
  onEstudiar: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const accent = mat.color_hex || '#3AAFA9'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: '#fff',
        border:     `1px solid ${hovered ? accent : '#E2E8F0'}`,
        boxShadow:  hovered
          ? `0 8px 24px ${accent}25`
          : '0 1px 4px rgba(0,0,0,0.06)',
        transform:  hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ height: 5, background: accent }} />

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex items-start justify-between">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl text-2xl select-none"
            style={{ background: `${accent}18` }}
          >
            📚
          </div>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Disponible
          </span>
        </div>

        <div className="flex-1 min-h-0">
          <h3 className="font-bold text-sm leading-snug" style={{ color: '#1B3A57' }}>
            {mat.nombre}
          </h3>
          {mat.descripcion ? (
            <p className="text-xs mt-1 line-clamp-3 leading-relaxed" style={{ color: '#64748B' }}>
              {mat.descripcion}
            </p>
          ) : (
            <p className="text-xs mt-1 italic" style={{ color: '#CBD5E1' }}>
              Sin descripción
            </p>
          )}
        </div>

        <div className="pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onEstudiar()
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: accent, color: '#fff' }}
            onMouseEnter={e => {
              e.currentTarget.style.filter = 'brightness(1.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter = 'none'
            }}
          >
            <BookOpen className="w-4 h-4" />
            Estudiar
            <ChevronRight className="w-4 h-4 opacity-90" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MesPage() {
  const router = useRouter()
  const params = useParams()
  const numero = Number(params.numero)

  const [mes, setMes] = useState<Mes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/alumno/meses')
      .then(r => r.json())
      .then((data: Mes[]) => {
        if (!Array.isArray(data)) { setError('Error al cargar meses'); return }
        const found = data.find(m => m.numero === numero)
        if (!found) { setError('Mes no encontrado'); return }
        if (!found.desbloqueado) { router.replace('/alumno'); return }
        setMes(found)
      })
      .catch(() => setError('Error al cargar el mes'))
      .finally(() => setLoading(false))
  }, [numero, router])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#3AAFA9' }} />
    </div>
  )

  if (error || !mes) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <p className="text-sm" style={{ color: '#EF4444' }}>{error ?? 'Mes no encontrado'}</p>
      <button
        type="button"
        onClick={() => router.push('/alumno')}
        className="text-sm font-medium px-4 py-2 rounded-lg"
        style={{ color: '#3AAFA9', border: '1px solid #E2E8F0', background: '#fff' }}
      >
        Volver al inicio
      </button>
    </div>
  )

  const n = mes.materias.length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header — mismo tono que Mis Materias */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push('/alumno')}
            className="p-2 rounded-xl transition-colors flex-shrink-0"
            style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              color: '#64748B',
            }}
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#1B3A57' }}>
              Mes {mes.numero}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              Elige una materia para continuar tu avance este mes.
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium self-start"
          style={{ background: 'rgba(58,175,169,0.1)', color: '#3AAFA9' }}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {n} {n === 1 ? 'materia' : 'materias'}
        </div>
      </div>

      {n === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #E2E8F0' }}
        >
          <BookOpen className="w-10 h-10" style={{ color: '#CBD5E1' }} />
          <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>No hay materias en este mes</p>
          <p className="text-xs text-center max-w-sm" style={{ color: '#CBD5E1' }}>
            Cuando se asignen materias a este periodo, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mes.materias.map(mat => (
            <MesMateriaCard
              key={mat.id}
              mat={mat}
              onEstudiar={() => router.push(`/alumno/materia/${mat.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
