import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Users, UserCheck, Clock, FileWarning, Eye } from 'lucide-react'

const CARD = { background: '#1E2230', border: '1px solid #2A2F3E' }

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  bg: string
  sub?: string
}) {
  return (
    <div className="rounded-xl p-5 flex items-center gap-4" style={CARD}>
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
        style={{ background: bg }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold" style={{ color }}>
          {value}
        </p>
        <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

type AlumnoReciente = {
  id: string
  nombre_completo: string
  email: string
  meses_desbloqueados: number
  created_at: string
  matricula: string
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm" style={{ color: '#EF4444' }}>
          Error de configuración: falta SUPABASE_SERVICE_ROLE_KEY
        </p>
      </div>
    )
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const [
    { count: totalAlumnos },
    { count: alumnosActivos },
    { count: pendientesPago },
    { count: docsPendientes },
  ] = await Promise.all([
    admin.from('alumnos').select('*', { count: 'exact', head: true }),
    admin
      .from('alumnos')
      .select('*', { count: 'exact', head: true })
      .eq('inscripcion_pagada', true),
    admin
      .from('alumnos')
      .select('*', { count: 'exact', head: true })
      .eq('inscripcion_pagada', false),
    admin
      .from('documentos_alumno')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente'),
  ])

  // ── Alumnos recientes ────────────────────────────────────────────────────────
  const { data: rawAlumnos } = await admin
    .from('alumnos')
    .select(
      `
      id,
      matricula,
      meses_desbloqueados,
      created_at,
      usuarios ( nombre_completo, email )
    `
    )
    .order('created_at', { ascending: false })
    .limit(5)

  type RawRow = {
    id: string
    matricula: string
    meses_desbloqueados: number
    created_at: string
    usuarios:
      | { nombre_completo: string; email: string }
      | { nombre_completo: string; email: string }[]
      | null
  }

  const alumnosRecientes: AlumnoReciente[] = ((rawAlumnos ?? []) as unknown as RawRow[]).map(
    (row) => {
      const u = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios
      return {
        id: row.id,
        matricula: row.matricula,
        meses_desbloqueados: row.meses_desbloqueados,
        created_at: row.created_at,
        nombre_completo: u?.nombre_completo ?? '—',
        email: u?.email ?? '—',
      }
    }
  )

  const stats = [
    {
      label: 'Total alumnos',
      value: totalAlumnos ?? 0,
      icon: Users,
      color: '#3AAFA9',
      bg: 'rgba(58,175,169,0.15)',
      sub: 'Registrados en la plataforma',
    },
    {
      label: 'Alumnos activos',
      value: alumnosActivos ?? 0,
      icon: UserCheck,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.15)',
      sub: 'Con inscripción pagada',
    },
    {
      label: 'Pendientes de pago',
      value: pendientesPago ?? 0,
      icon: Clock,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.15)',
      sub: 'Sin inscripción pagada',
    },
    {
      label: 'Docs pendientes',
      value: docsPendientes ?? 0,
      icon: FileWarning,
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.15)',
      sub: 'Requieren revisión',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
          Panel de Administración
        </h2>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Resumen general de IVS Virtual
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Alumnos recientes */}
      <div className="rounded-xl overflow-hidden" style={CARD}>
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #2A2F3E' }}
        >
          <div>
            <h3 className="text-base font-semibold" style={{ color: '#E2E8F0' }}>
              Alumnos recientes
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              Últimos 5 registrados
            </p>
          </div>
          <Link
            href="/admin/alumnos"
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#3AAFA9', background: 'rgba(58,175,169,0.1)' }}
          >
            Ver todos
          </Link>
        </div>

        {alumnosRecientes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: '#2A2F3E' }} />
            <p className="text-sm" style={{ color: '#64748B' }}>
              No hay alumnos registrados aún
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2A2F3E' }}>
                  {[
                    'Nombre',
                    'Email',
                    'Matrícula',
                    'Meses desbloqueados',
                    'Fecha registro',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide"
                      style={{ color: '#64748B' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alumnosRecientes.map((a) => {
                  const initials = a.nombre_completo
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0] ?? '')
                    .join('')
                    .toUpperCase()
                  return (
                    <tr
                      key={a.id}
                      style={{ borderBottom: '1px solid rgba(42,47,62,0.5)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 text-xs font-bold"
                            style={{ background: 'rgba(58,175,169,0.2)', color: '#3AAFA9' }}
                          >
                            {initials}
                          </div>
                          <span
                            className="font-medium truncate max-w-[160px]"
                            style={{ color: '#E2E8F0' }}
                          >
                            {a.nombre_completo}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 truncate max-w-[200px]"
                        style={{ color: '#94A3B8' }}
                      >
                        {a.email}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: '#64748B' }}
                      >
                        {a.matricula || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: 'rgba(58,175,169,0.15)', color: '#3AAFA9' }}
                        >
                          {a.meses_desbloqueados} mes
                          {a.meses_desbloqueados !== 1 ? 'es' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>
                        {new Date(a.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/alumnos/${a.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: 'rgba(58,175,169,0.1)', color: '#3AAFA9' }}
                        >
                          <Eye className="w-3 h-3" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
