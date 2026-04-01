'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_REDIRECTS } from '@/lib/constants'

const WA_URL = 'https://wa.me/523328381405'

const inputBase: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #E2EAF0',
  color: '#1B3A57',
  borderRadius: 10,
  fontSize: 14,
  width: '100%',
  padding: '11px 12px 11px 40px',
  outline: 'none',
  transition: 'border .15s, box-shadow .15s',
}

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  function focus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.border    = '1.5px solid #3AAFA9'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(58,175,169,0.12)'
  }
  function blur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.border    = '1.5px solid #E2EAF0'
    e.currentTarget.style.boxShadow = 'none'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError('Correo o contraseña incorrectos. Verifica tus datos.')
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('No se pudo obtener la sesión.'); return }

      const { data: usuario } = await supabase
        .from('usuarios').select('rol').eq('id', user.id).single()

      const redirect = ROLE_REDIRECTS[usuario?.rol ?? 'alumno'] ?? '/alumno'
      router.push(redirect)
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">

      {/* Card */}
      <div
        className="w-full rounded-2xl p-8"
        style={{ background: '#fff', boxShadow: '0 8px 40px rgba(27,58,87,0.12)', border: '1px solid #E8F0F6' }}
      >
        {/* Logo + título */}
        <div className="flex flex-col items-center mb-7">
          <Image src="/logo-ivs.jpg" alt="IVS Virtual" width={64} height={64}
            style={{ borderRadius: 12, objectFit: 'contain', marginBottom: 14 }} />
          <h1 className="text-xl font-bold text-center" style={{ color: '#1B3A57', fontFamily: 'Syne, sans-serif' }}>
            Bienvenido a IVS Virtual
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: '#6B8FA8' }}>
            Inicia sesión con tu cuenta
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-xs font-600 mb-1.5" style={{ color: '#4A6785', fontWeight: 600 }}>
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9DB0C0' }} />
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                style={inputBase} onFocus={focus} onBlur={blur}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#4A6785', fontWeight: 600 }}>
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9DB0C0' }} />
              <input
                type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...inputBase, paddingRight: 40 }} onFocus={focus} onBlur={blur}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#9DB0C0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          {/* Botón */}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#3AAFA9', color: '#fff', boxShadow: '0 4px 14px rgba(58,175,169,0.3)' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2B7A77' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#3AAFA9' }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Iniciando sesión...</> : 'Iniciar sesión'}
          </button>

          {/* Olvidé contraseña */}
          <div className="text-center">
            <Link href="/forgot-password" className="text-sm transition-colors"
              style={{ color: '#6B8FA8' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#3AAFA9' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6B8FA8' }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: '#E2EAF0' }} />
          <span className="text-xs" style={{ color: '#9DB0C0' }}>o</span>
          <div className="flex-1 h-px" style={{ background: '#E2EAF0' }} />
        </div>

        {/* Registro */}
        <p className="text-center text-sm" style={{ color: '#6B8FA8' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-semibold transition-colors"
            style={{ color: '#3AAFA9' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#1B3A57' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#3AAFA9' }}
          >
            Regístrate aquí
          </Link>
        </p>
      </div>

      {/* WhatsApp */}
      <a href={WA_URL} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: '#6B8FA8' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#16a34a' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#6B8FA8' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.538 5.943L0 24l6.232-1.503A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.366l-.36-.214-3.7.893.935-3.58-.235-.372A9.818 9.818 0 1112 21.818z"/>
        </svg>
        ¿Necesitas ayuda? WhatsApp
      </a>

      <p className="text-xs" style={{ color: '#9DB0C0' }}>
        © {new Date().getFullYear()} IVS Instituto Virtual Superior
      </p>
    </div>
  )
}
