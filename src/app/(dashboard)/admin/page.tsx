import { ESCUELA_CONFIG } from '@/lib/config'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#F1F5F9' }}>
          {ESCUELA_CONFIG.nombre}
        </h2>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
          Panel de administración
        </p>
      </div>
      <div
        className="rounded-xl p-6"
        style={{ background: '#181C26', border: '1px solid #2A2F3E' }}
      >
        <p style={{ color: '#94A3B8' }}>
          Panel de administración. Aquí verás las estadísticas de tu escuela.
        </p>
      </div>
    </div>
  )
}
