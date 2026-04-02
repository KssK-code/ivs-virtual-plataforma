import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import PageTransition from '@/components/ui/PageTransition'

export default async function AlumnoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, apellidos, rol, foto_url')
    .eq('id', user.id)
    .single()

  // Normalizar rol a mayúsculas: soporta 'admin'/'ADMIN', 'alumno'/'ALUMNO'
  const rol = (usuario?.rol as string | undefined)?.toUpperCase()

  // Admin intentando entrar a /alumno → redirigir a su panel
  if (rol === 'ADMIN') redirect('/admin')

  // Otro rol desconocido con fila en usuarios → rechazar
  if (usuario && rol && rol !== 'ALUMNO') redirect('/login')

  // Fetch nivel del alumno
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('nivel')
    .eq('id', user.id)
    .single()

  const userName = [usuario?.nombre, usuario?.apellidos].filter(Boolean).join(' ')
    || user.email
    || 'Alumno'

  const avatarUrl = (usuario as unknown as { foto_url?: string | null } | null)?.foto_url ?? null

  return (
    <DashboardLayout
      role="ALUMNO"
      userName={userName}
      avatarUrl={avatarUrl}
      nivel={alumno?.nivel ?? null}
      pageTitle="Mi Portal de Estudios"
      showFooter={true}
      theme="light"
    >
      <PageTransition>{children}</PageTransition>
    </DashboardLayout>
  )
}
