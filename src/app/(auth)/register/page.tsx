'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { APP_NAME } from '@/lib/constants'
import { ESCUELA_CONFIG } from '@/lib/config'
import { EdvexLogo } from '@/components/ui/edvex-logo'

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F1F5F9',
}
const focusStyle = {
  border: '1px solid rgba(58,175,169,0.6)',
  boxShadow: '0 0 0 3px rgba(58,175,169,0.1)',
}
const blurStyle = {
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: 'none',
}

export default function RegisterPage() {
  const router = useRouter()

  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { nombre_completo: nombreCompleto.trim() } },
      })

      if (signUpError) {
        if (signUpError.message.includes('already') || signUpError.message.includes('registered')) {
          setError('Ya existe una cuenta con ese correo.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      const res = await fetch('/api/auth/register-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: nombreCompleto.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear la cuenta. Intenta de nuevo.')
        return
      }

      router.push('/alumno')
    } catch {
      setError('Error al crear la cuenta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md px-3 sm:px-4 flex flex-col items-center gap-6">
      <div
        className="w-full rounded-2xl p-6 sm:p-8 shadow-2xl"
        style={{ background: '#181C26', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <EdvexLogo size={56} innerFill="#181C26" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center" style={{ color: '#F1F5F9' }}>
            {APP_NAME}
          </h1>
          <p className="text-sm font-medium mt-1 text-center" style={{ color: '#3AAFA9' }}>
            {ESCUELA_CONFIG.nombre}
          </p>
          <p className="text-xs mt-1.5 text-center italic" style={{ color: '#64748B' }}>
            Regístrate en IVS Virtual
          </p>
          <div className="w-10 h-px mt-4" style={{ background: 'rgba(58,175,169,0.4)' }} />
          <p className="text-sm mt-4" style={{ color: '#94A3B8' }}>
            Crear cuenta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="nombre" className="block text-sm font-medium" style={{ color: '#94A3B8' }}>
              Nombre completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
              <input
                id="nombre"
                type="text"
                required
                autoComplete="name"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Tu nombre y apellidos"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium" style={{ color: '#94A3B8' }}>
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#94A3B8' }}>
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{ color: '#94A3B8' }}>
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
              />
            </div>
          </div>

          {error && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#FCA5A5',
              }}
            >
              <span className="mt-px">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#3AAFA9', color: '#ffffff' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#4ECDC4' }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#3AAFA9' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              'Registrarme'
            )}
          </button>

          <div className="text-center pt-1">
            <span className="text-sm" style={{ color: '#94A3B8' }}>¿Ya tienes cuenta? </span>
            <Link
              href="/login"
              className="text-sm font-medium transition-colors"
              style={{ color: '#3AAFA9' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#4ECDC4' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#3AAFA9' }}
            >
              Inicia sesión
            </Link>
          </div>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-xs" style={{ color: '#475569' }}>
            ¿Problemas para acceder? Contacta a tu administrador.
          </p>
          <p className="text-xs" style={{ color: '#374151' }}>
            Plataforma de educación 100% en línea
          </p>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs" style={{ color: '#374151' }}>
          © 2026 {ESCUELA_CONFIG.nombre}. Todos los derechos reservados.
        </p>
        <a
          href={`mailto:${ESCUELA_CONFIG.contactoEmail}`}
          className="text-xs transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#3AAFA9' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#475569' }}
        >
          {ESCUELA_CONFIG.contactoEmail}
        </a>
      </div>
    </div>
  )
}
