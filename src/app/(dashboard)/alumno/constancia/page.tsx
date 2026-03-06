'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Download, Printer } from 'lucide-react'
import { ESCUELA_CONFIG } from '@/lib/config'

interface MateriaCursada {
  codigo: string
  nombre: string
  mes_numero: number
  estado: 'Acreditada' | 'No acreditada' | 'Pendiente'
}

interface DatosConstancia {
  nombre_completo: string
  matricula: string
  plan_nombre: string
  meses_desbloqueados: number
  duracion_meses: number
  porcentaje_avance: number
  fecha_inscripcion: string
  materias_cursadas: MateriaCursada[]
}

const CARD = { background: '#181C26', border: '1px solid #2A2F3E' }

function generarFolio() {
  const year = new Date().getFullYear()
  const rand = Math.floor(100000 + Math.random() * 900000)
  return `CONST-${year}-${rand}`
}

export default function ConstanciaPage() {
  const [datos, setDatos] = useState<DatosConstancia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const folioRef = useRef<string>('')

  useEffect(() => {
    fetch('/api/alumno/constancia')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setDatos(data)
        folioRef.current = generarFolio()
      })
      .catch(() => setError('Error al cargar los datos'))
      .finally(() => setLoading(false))
  }, [])

  async function descargarPDF() {
    if (!datos) return
    setGenerando(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

      const margenIzq = 20
      const margenDer = 190
      const ancho = margenDer - margenIzq
      let y = 20

      // Encabezado — nombre de escuela
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text(ESCUELA_CONFIG.nombre.toUpperCase(), 105, y, { align: 'center' })
      y += 8

      // Línea decorativa
      doc.setDrawColor(91, 108, 255)
      doc.setLineWidth(0.8)
      doc.line(margenIzq, y, margenDer, y)
      y += 10

      // Título
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text('CONSTANCIA DE ESTUDIOS', 105, y, { align: 'center' })
      y += 12

      // Cuerpo principal
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(55, 65, 81)

      const textoConstancia = `Se hace constar que ${datos.nombre_completo}, con matrícula ${datos.matricula}, se encuentra inscrito(a) en el programa de ${datos.plan_nombre} del ${ESCUELA_CONFIG.nombre}.`
      const lineas = doc.splitTextToSize(textoConstancia, ancho)
      doc.text(lineas, margenIzq, y)
      y += lineas.length * 6 + 6

      // Avance
      const textoAvance = `Ha completado ${datos.meses_desbloqueados} de ${datos.duracion_meses} meses del programa (${datos.porcentaje_avance}% de avance).`
      const lineasAvance = doc.splitTextToSize(textoAvance, ancho)
      doc.text(lineasAvance, margenIzq, y)
      y += lineasAvance.length * 6 + 10

      // Tabla de materias
      if (datos.materias_cursadas.length > 0) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(17, 24, 39)
        doc.text('Materias cursadas:', margenIzq, y)
        y += 7

        // Encabezados tabla
        doc.setFillColor(240, 242, 255)
        doc.rect(margenIzq, y - 4, ancho, 8, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(55, 65, 81)
        doc.text('Mes', margenIzq + 2, y + 1)
        doc.text('Código', margenIzq + 18, y + 1)
        doc.text('Materia', margenIzq + 40, y + 1)
        doc.text('Estado', margenDer - 28, y + 1)
        y += 8

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)

        for (const mat of datos.materias_cursadas) {
          if (y > 240) {
            doc.addPage()
            y = 20
          }
          const bgColor = mat.estado === 'Acreditada' ? [240, 253, 244] :
            mat.estado === 'No acreditada' ? [254, 242, 242] : [255, 251, 235]
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
          doc.rect(margenIzq, y - 3.5, ancho, 7, 'F')

          doc.setTextColor(55, 65, 81)
          doc.text(`Mes ${mat.mes_numero}`, margenIzq + 2, y + 1)
          doc.text(mat.codigo, margenIzq + 18, y + 1)

          const nombreCorto = doc.splitTextToSize(mat.nombre, 80)
          doc.text(nombreCorto[0], margenIzq + 40, y + 1)

          const colorEstado = mat.estado === 'Acreditada' ? [16, 185, 129] :
            mat.estado === 'No acreditada' ? [239, 68, 68] : [245, 158, 11]
          doc.setTextColor(colorEstado[0], colorEstado[1], colorEstado[2])
          doc.setFont('helvetica', 'bold')
          doc.text(mat.estado, margenDer - 28, y + 1)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(55, 65, 81)
          y += 7
        }
        y += 8
      }

      // Folio y fecha
      const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      doc.text(`Folio: ${folioRef.current}`, margenIzq, y)
      doc.text(`Fecha de expedición: ${fecha}`, margenDer, y, { align: 'right' })
      y += 20

      // Firma
      doc.setDrawColor(17, 24, 39)
      doc.setLineWidth(0.3)
      doc.line(105 - 30, y, 105 + 30, y)
      y += 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text('Dirección Académica', 105, y, { align: 'center' })
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(107, 114, 128)
      doc.text(ESCUELA_CONFIG.nombre, 105, y, { align: 'center' })

      doc.save(`constancia-${datos.matricula}.pdf`)
    } finally {
      setGenerando(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#5B6CFF' }} />
    </div>
  )

  if (error || !datos) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-sm" style={{ color: '#EF4444' }}>{error ?? 'Error al cargar'}</p>
    </div>
  )

  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#F1F5F9' }}>Constancia de Estudios</h2>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Vista previa de tu constancia oficial
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid #2A2F3E' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={descargarPDF}
            disabled={generando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: '#5B6CFF', color: '#fff' }}
            onMouseEnter={e => { if (!generando) e.currentTarget.style.background = '#7B8AFF' }}
            onMouseLeave={e => { if (!generando) e.currentTarget.style.background = '#5B6CFF' }}
          >
            {generando
              ? <><Loader2 className="w-4 h-4 animate-spin" />Generando...</>
              : <><Download className="w-4 h-4" />Descargar PDF</>
            }
          </button>
        </div>
      </div>

      {/* Vista previa */}
      <div
        id="constancia-preview"
        className="rounded-xl p-8 shadow-2xl"
        style={{ background: '#FFFFFF', color: '#111827' }}
      >
        {/* Encabezado */}
        <div className="text-center mb-6">
          <p className="text-lg font-bold tracking-wide" style={{ color: '#111827' }}>
            {ESCUELA_CONFIG.nombre.toUpperCase()}
          </p>
          <div className="h-0.5 my-3 rounded-full" style={{ background: '#5B6CFF' }} />
          <p className="text-xl font-black tracking-widest" style={{ color: '#111827' }}>
            CONSTANCIA DE ESTUDIOS
          </p>
        </div>

        {/* Texto principal */}
        <div className="mb-6 leading-relaxed text-sm" style={{ color: '#374151' }}>
          <p>
            Se hace constar que <strong style={{ color: '#111827' }}>{datos.nombre_completo}</strong>, con matrícula{' '}
            <strong style={{ color: '#111827' }}>{datos.matricula}</strong>, se encuentra inscrito(a) en el programa de{' '}
            <strong style={{ color: '#111827' }}>{datos.plan_nombre}</strong> del {ESCUELA_CONFIG.nombre}.
          </p>
          <p className="mt-3">
            Ha completado <strong style={{ color: '#111827' }}>{datos.meses_desbloqueados} de {datos.duracion_meses} meses</strong> del programa
            ({datos.porcentaje_avance}% de avance).
          </p>
        </div>

        {/* Tabla de materias */}
        {datos.materias_cursadas.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Materias cursadas:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: '#F0F2FF' }}>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#374151', border: '1px solid #E5E7EB' }}>Mes</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#374151', border: '1px solid #E5E7EB' }}>Código</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#374151', border: '1px solid #E5E7EB' }}>Materia</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#374151', border: '1px solid #E5E7EB' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.materias_cursadas
                  .sort((a, b) => a.mes_numero - b.mes_numero)
                  .map((mat, i) => (
                    <tr key={i} style={{
                      background: mat.estado === 'Acreditada' ? '#F0FDF4' :
                        mat.estado === 'No acreditada' ? '#FEF2F2' : '#FFFBEB'
                    }}>
                      <td className="px-3 py-2" style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
                        Mes {mat.mes_numero}
                      </td>
                      <td className="px-3 py-2 font-mono" style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
                        {mat.codigo}
                      </td>
                      <td className="px-3 py-2" style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
                        {mat.nombre}
                      </td>
                      <td className="px-3 py-2 font-semibold" style={{
                        border: '1px solid #E5E7EB',
                        color: mat.estado === 'Acreditada' ? '#059669' :
                          mat.estado === 'No acreditada' ? '#DC2626' : '#D97706'
                      }}>
                        {mat.estado}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Folio y fecha */}
        <div className="flex items-center justify-between text-xs mb-10" style={{ color: '#6B7280' }}>
          <span>Folio: <strong>{folioRef.current}</strong></span>
          <span>Fecha de expedición: <strong>{fecha}</strong></span>
        </div>

        {/* Firma */}
        <div className="flex justify-center">
          <div className="text-center">
            <div className="w-40 mx-auto mb-1" style={{ borderTop: '1px solid #374151' }} />
            <p className="text-sm font-bold" style={{ color: '#111827' }}>Dirección Académica</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>{ESCUELA_CONFIG.nombre}</p>
          </div>
        </div>
      </div>

      {/* Info folio */}
      <div className="rounded-xl p-4 flex items-center gap-3" style={CARD}>
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#5B6CFF' }} />
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Este documento es informativo. El folio <strong style={{ color: '#F1F5F9' }}>{folioRef.current}</strong> es generado de manera única en cada descarga.
        </p>
      </div>
    </div>
  )
}
