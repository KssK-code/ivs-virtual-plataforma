'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Lock, BookOpen, TrendingUp, GraduationCap,
  Bell, Flame, CheckCircle2, ChevronRight, Star,
} from 'lucide-react'
import { useToast, ToastContainer } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import BadgesGrid from '@/components/alumno/BadgesGrid'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Perfil {
  id:                  string
  matricula:           string
  meses_desbloqueados: number
  inscripcion_pagada:  boolean
  plan_nombre:         string
  duracion_meses:      number
  nombre_completo:     string
  email:               string
  nivel?:              string
}

interface MateriaResumen {
  id:        string
  codigo:    string
  nombre:    string
  color_hex: string
}

interface Mes {
  id:          string
  numero:      number
  titulo:      string
  desbloqueado: boolean
  materias:    MateriaResumen[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre']

function getFechaLarga() {
  const d = new Date()
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  return `${dias[d.getDay()]}, ${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`
}

// ─── Circle Progress ──────────────────────────────────────────────────────────
function CircleProgress({ pct, size = 72, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8F4F4" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#3AAFA9" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
    </svg>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, iconBg, iconColor, label, value, sub, extra,
}: {
  icon:       React.ReactNode
  iconBg:     string
  iconColor:  string
  label:      string
  value:      React.ReactNode
  sub?:       string
  extra?:     React.ReactNode
}) {
  return (
    <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3"
      style={{ background: '#fff', border: '1px solid #EEF2F7', boxShadow: '0 1px 8px rgba(27,58,87,0.06)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9DB0C0' }}>
          {label}
        </p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}>
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: '#1B3A57' }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: '#9DB0C0' }}>{sub}</p>}
      </div>
      {extra}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ background: '#EEF2F7' }} />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AlumnoDashboard() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { toasts, showToast, removeToast } = useToast()

  const [perfil,             setPerfil]             = useState<Perfil | null>(null)
  const [meses,              setMeses]               = useState<Mes[]>([])
  const [demo,               setDemo]               = useState(false)
  const [materiasAcreditadas, setMateriasAcreditadas] = useState(0)
  const [logros,             setLogros]             = useState<Array<{ tipo: string; obtenido_en: string; metadata?: Record<string, unknown> }>>([])
  const [loading,            setLoading]            = useState(true)

  // Toast on redirect
  useEffect(() => {
    const pago = searchParams.get('pago')
    if (pago === 'exitoso') {
      showToast('Pago procesado correctamente', 'success')
      router.replace('/alumno', { scroll: false })
    } else if (pago === 'cancelado') {
      showToast('Pago cancelado', 'info')
      router.replace('/alumno', { scroll: false })
    }
  }, [searchParams, router, showToast])

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/api/alumno/perfil').then(r => r.json()),
      fetch('/api/alumno/meses').then(r => r.json()),
      fetch('/api/alumno/calificaciones').then(r => r.json()),
    ]).then(([p, m, c]) => {
      setPerfil(p)
      if (m?.demo === true) {
        setDemo(true); setMeses([])
      } else {
        setDemo(false); setMeses(Array.isArray(m) ? m : [])
      }
      setMateriasAcreditadas(c?.resumen?.materias_acreditadas ?? 0)
    }).finally(() => setLoading(false))
  }, [])

  // Logros
  useEffect(() => {
    if (!perfil) return
    const sb = createClient()
    ;(async () => {
      const { data } = await sb
        .from('logros_alumno')
        .select('tipo, obtenido_en, metadata')
        .eq('alumno_id', perfil.id)
      if (data) setLogros(data as Array<{ tipo: string; obtenido_en: string; metadata?: Record<string, unknown> }>)
    })()
  }, [perfil])

  // ── Loading skeletons ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 max-w-5xl">
      {/* Header skeleton */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #EEF2F7' }}>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  )

  if (!perfil) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-sm" style={{ color: '#EF4444' }}>Error al cargar el perfil</p>
    </div>
  )

  // ── Derived values ─────────────────────────────────────────────────────────
  const porcentaje    = perfil.duracion_meses > 0
    ? Math.round((perfil.meses_desbloqueados / perfil.duracion_meses) * 100)
    : 0
  const hora          = new Date().getHours()
  const saludo        = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const primerNombre  = perfil.nombre_completo.split(' ')[0]
  const mesActivo     = perfil.meses_desbloqueados
  const rachaLogro    = logros.find(l => l.tipo === 'racha_actual')
  const diasRacha     = (rachaLogro?.metadata?.dias as number | undefined) ?? 0
  const logrosCount   = logros.filter(l => l.tipo !== 'racha_actual').length
  const nivelLabel    = perfil.nivel === 'preparatoria' ? 'Preparatoria'
                      : perfil.nivel === 'secundaria'   ? 'Secundaria'
                      : perfil.plan_nombre?.toLowerCase().includes('prepa') ? 'Preparatoria'
                      : 'Secundaria'

  return (
    <div className="space-y-6 max-w-5xl">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* ── Banner DEMO ────────────────────────────────────────────────────── */}
      {demo && (
        <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(58,175,169,0.1) 0%, rgba(27,58,87,0.06) 100%)', border: '1.5px solid rgba(58,175,169,0.3)' }}>
          <div className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(58,175,169,0.15)', border: '1px solid rgba(58,175,169,0.3)' }}>
            <GraduationCap className="w-5 h-5" style={{ color: '#3AAFA9' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: '#1B3A57' }}>🎓 Estás en modo demo</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6B8FA8' }}>
              Explora la plataforma gratis. Para iniciar tu programa contacta a tu asesor.
            </p>
          </div>
          <a href="https://wa.me/523328381405" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all"
            style={{ background: '#3AAFA9', color: '#fff', boxShadow: '0 4px 14px rgba(58,175,169,0.3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2B7A77' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#3AAFA9' }}>
            💬 Contactar por WhatsApp
          </a>
        </div>
      )}

      {/* ── Banner inscripción pendiente ───────────────────────────────────── */}
      {!demo && !perfil.inscripcion_pagada && (
        <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1.5px solid rgba(245,158,11,0.3)' }}>
          <div className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Bell className="w-5 h-5" style={{ color: '#F59E0B' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: '#B45309' }}>Inscripción pendiente de pago</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#92400E' }}>
              Control Escolar te contactará por WhatsApp para darte la bienvenida y solicitarte tus documentos.
            </p>
          </div>
          <a href="https://wa.me/523328381405" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0"
            style={{ background: '#F59E0B', color: '#fff' }}>
            💬 WhatsApp 33 2838 1405
          </a>
        </div>
      )}

      {/* ── Welcome header ────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #1B3A57 0%, #2B6B6B 60%, #3AAFA9 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circle */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 80, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div className="relative z-10">
          <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {getFechaLarga()}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#fff', fontFamily: 'Syne, sans-serif' }}>
            {saludo}, {primerNombre} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-mono px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
              {perfil.matricula}
            </span>
            <span className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: 'rgba(168,237,234,0.2)', color: '#A8EDEA' }}>
              {nivelLabel}
            </span>
          </div>
        </div>

        {!demo && mesActivo > 0 && (
          <button
            onClick={() => router.push(`/alumno/mes/${mesActivo}`)}
            className="relative z-10 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm flex-shrink-0 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            Continuar estudiando <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Stats 4 cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Progreso general */}
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="rgba(58,175,169,0.1)" iconColor="#3AAFA9"
          label="Progreso general"
          value={
            <div className="flex items-center gap-3">
              <CircleProgress pct={porcentaje} />
              <span>{porcentaje}<span className="text-sm font-normal" style={{ color: '#9DB0C0' }}>%</span></span>
            </div>
          }
          sub={`${mesActivo} de ${perfil.duracion_meses} meses`}
        />

        {/* Card 2: Racha activa */}
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          iconBg="rgba(245,158,11,0.1)" iconColor="#F59E0B"
          label="Racha activa"
          value={
            <span>{diasRacha} <span className="text-sm font-normal" style={{ color: '#9DB0C0' }}>días</span></span>
          }
          sub={diasRacha > 0 ? '¡Sigue así! 🔥' : 'Comienza hoy'}
        />

        {/* Card 3: Materias */}
        <StatCard
          icon={<BookOpen className="w-4 h-4" />}
          iconBg="rgba(99,102,241,0.1)" iconColor="#6366F1"
          label="Materias"
          value={materiasAcreditadas}
          sub="materias acreditadas"
          extra={
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EEF2F7' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (materiasAcreditadas / 10) * 100)}%`, background: '#6366F1' }} />
            </div>
          }
        />

        {/* Card 4: Logros */}
        <StatCard
          icon={<Star className="w-4 h-4" />}
          iconBg="rgba(16,185,129,0.1)" iconColor="#10B981"
          label="Logros"
          value={
            <span>{logrosCount} <span className="text-sm font-normal" style={{ color: '#9DB0C0' }}>/ 8</span></span>
          }
          sub="badges obtenidos"
          extra={
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EEF2F7' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(logrosCount / 8) * 100}%`, background: '#10B981' }} />
            </div>
          }
        />
      </div>

      {/* ── Materia DEMO ──────────────────────────────────────────────────── */}
      {demo && (
        <div>
          <SectionTitle>Materia de demostración</SectionTitle>
          <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: '#fff', border: '1.5px solid rgba(58,175,169,0.25)', boxShadow: '0 1px 8px rgba(27,58,87,0.06)' }}>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-mono font-bold" style={{ color: '#3AAFA9' }}>TUT101</p>
              <p className="text-base font-bold" style={{ color: '#1B3A57' }}>Tutoría de ingreso I</p>
              <p className="text-sm" style={{ color: '#7A92A9' }}>
                Familiarízate con la plataforma, tu plan de estudio y la metodología del bachillerato virtual.
              </p>
            </div>
            <Link href="/alumno/materia/e3f004d8-4451-4a65-9c91-bac3f87d2378"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all"
              style={{ background: '#3AAFA9', color: '#fff', boxShadow: '0 4px 14px rgba(58,175,169,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2B7A77' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#3AAFA9' }}>
              Explorar materia →
            </Link>
          </div>
        </div>
      )}

      {/* ── Meses del programa ────────────────────────────────────────────── */}
      {!demo && (
        <div>
          <SectionTitle>Meses del programa</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {meses.map(mes => {
              const completado = mes.desbloqueado && mes.numero < mesActivo
              const activo     = mes.desbloqueado && mes.numero === mesActivo
              const bloqueado  = !mes.desbloqueado

              return (
                <div
                  key={mes.id}
                  onClick={() => mes.desbloqueado && router.push(`/alumno/mes/${mes.numero}`)}
                  className="rounded-2xl p-4 transition-all duration-200 flex flex-col gap-3"
                  style={{
                    background:  bloqueado  ? '#F1F5F9'
                               : completado ? '#F0FDF4'
                               : '#fff',
                    border:      bloqueado  ? '1.5px solid #E2E8F0'
                               : completado ? '1.5px solid #86EFAC'
                               : '1.5px solid #3AAFA9',
                    opacity:     bloqueado  ? 0.7 : 1,
                    cursor:      bloqueado  ? 'default' : 'pointer',
                    boxShadow:   activo     ? '0 4px 20px rgba(58,175,169,0.18)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!bloqueado) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    if (!bloqueado) (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-3xl font-bold leading-none block"
                        style={{ color: bloqueado ? '#C0CDD8' : completado ? '#16A34A' : '#3AAFA9' }}>
                        {mes.numero < 10 ? `0${mes.numero}` : mes.numero}
                      </span>
                      <p className="text-sm font-semibold mt-1"
                        style={{ color: bloqueado ? '#9DB0C0' : completado ? '#15803D' : '#1B3A57' }}>
                        {mes.titulo || `Mes ${mes.numero}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {bloqueado  && <Lock className="w-5 h-5" style={{ color: '#C0CDD8' }} />}
                      {completado && <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} />}
                      {activo     && (
                        <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                          style={{ background: 'rgba(58,175,169,0.12)', color: '#3AAFA9' }}>
                          ▶ Activo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Materias count + progress bar */}
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: bloqueado ? '#B0C4D4' : '#7A92A9' }}>
                      {(mes.materias ?? []).length} materias
                    </p>
                    <div className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: bloqueado ? '#E2E8F0' : 'rgba(58,175,169,0.12)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width:      completado ? '100%' : activo ? `${Math.min(100, (materiasAcreditadas / Math.max(1, (mes.materias ?? []).length)) * 100)}%` : '0%',
                          background: completado ? '#22C55E' : '#3AAFA9',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Logros / Badges ───────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 sm:p-6"
        style={{ background: '#fff', border: '1px solid #EEF2F7', boxShadow: '0 1px 8px rgba(27,58,87,0.06)' }}>
        <BadgesGrid logros={logros} lang="es" />
      </div>
    </div>
  )
}

// ─── Section title helper ─────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wider flex-shrink-0" style={{ color: '#1B3A57' }}>
        {children}
      </h2>
      <div className="flex-1 h-px" style={{ background: '#EEF2F7' }} />
    </div>
  )
}
