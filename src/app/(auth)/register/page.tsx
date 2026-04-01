'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, Eye, EyeOff, Phone, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const WA_URL = 'https://wa.me/523328381405'

const inputBase: React.CSSProperties = {
  background: '#fff', border: '1.5px solid #E2EAF0', color: '#1B3A57',
  borderRadius: 10, fontSize: 14, width: '100%',
  padding: '10px 12px 10px 40px', outline: 'none',
  transition: 'border .15s, box-shadow .15s',
}
const inputNoIcon: React.CSSProperties = { ...inputBase, paddingLeft: 12 }

function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.border    = '1.5px solid #3AAFA9'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(58,175,169,0.12)'
}
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.border    = '1.5px solid #E2EAF0'
  e.currentTarget.style.boxShadow = 'none'
}

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label className="block text-xs mb-1.5" style={{ color: '#4A6785', fontWeight: 600 }}>
    {text}{required && <span style={{ color: '#EF4444' }}> *</span>}
  </label>
)

export default function RegisterPage() {
  const router = useRouter()

  const [nombre,          setNombre]          = useState('')
  const [apellidoPat,     setApellidoPat]     = useState('')
  const [apellidoMat,     setApellidoMat]     = useState('')
  const [email,           setEmail]           = useState('')
  const [telefono,        setTelefono]        = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass,        setShowPass]        = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [nivel,           setNivel]           = useState('')
  const [modalidad,       setModalidad]       = useState('')
  const [sindicalizado,   setSindicalizado]   = useState(false)
  const [sindicato,       setSindicato]       = useState('')
  const [error,           setError]           = useState<string | null>(null)
  const [loading,         setLoading]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!nivel) { setError('Selecciona tu nivel educativo.'); return }
    if (!modalidad) { setError('Selecciona la modalidad.'); return }
    if (sindicalizado && !sindicato) { setError('Selecciona tu sindicato.'); return }

    setLoading(true)
    try {
      const supabase = createClient()

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nombre: nombre.trim(),
            apellidos: `${apellidoPat.trim()} ${apellidoMat.trim()}`.trim(),
            rol: 'alumno',
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already')) {
          setError('Ya existe una cuenta con ese correo. Inicia sesión.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      const res = await fetch('/api/auth/register-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:         nombre.trim(),
          apellidos:      `${apellidoPat.trim()} ${apellidoMat.trim()}`.trim(),
          telefono:       telefono.trim(),
          nivel,
          modalidad,
          es_sindicalizado: sindicalizado,
          sindicato:      sindicalizado ? sindicato : null,
        }),
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

  const selectStyle: React.CSSProperties = {
    ...inputNoIcon, appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239DB0C0' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  }

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-5">
      <div className="w-full rounded-2xl p-6 sm:p-8"
        style={{ background: '#fff', boxShadow: '0 8px 40px rgba(27,58,87,0.12)', border: '1px solid #E8F0F6' }}>

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo-ivs.jpg" alt="IVS Virtual" width={56} height={56}
            style={{ borderRadius: 10, objectFit: 'contain', marginBottom: 12 }} />
          <h1 className="text-xl font-bold text-center" style={{ color: '#1B3A57', fontFamily: 'Syne, sans-serif' }}>
            Crear mi cuenta gratis
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: '#6B8FA8' }}>
            IVS Instituto Virtual Superior
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre + Apellidos en grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label text="Nombre(s)" required />
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9DB0C0' }} />
                <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="María" style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
            <div>
              <Label text="Apellido Paterno" required />
              <input type="text" required value={apellidoPat} onChange={e => setApellidoPat(e.target.value)}
                placeholder="García" style={inputNoIcon} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <Label text="Apellido Materno" required />
              <input type="text" required value={apellidoMat} onChange={e => setApellidoMat(e.target.value)}
                placeholder="López" style={inputNoIcon} onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label text="Correo electrónico" required />
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9DB0C0' }} />
              <input type="email" required autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com"
                style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <Label text="Teléfono / WhatsApp" required />
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9DB0C0' }} />
              <input type="tel" required value={telefono}
                onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 dígitos"
                style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>

          {/* Contraseñas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label text="Contraseña" required />
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9DB0C0' }} />
                <input type={showPass ? 'text' : 'password'} required autoComplete="new-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mín. 8 caracteres"
                  style={{ ...inputBase, paddingRight: 38 }} onFocus={focusIn} onBlur={focusOut} />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#9DB0C0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label text="Confirmar contraseña" required />
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9DB0C0' }} />
                <input type={showConfirm ? 'text' : 'password'} required autoComplete="new-password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  style={{ ...inputBase, paddingRight: 38 }} onFocus={focusIn} onBlur={focusOut} />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#9DB0C0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Nivel + Modalidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label text="Nivel educativo" required />
              <select value={nivel} onChange={e => setNivel(e.target.value)} required
                style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
                <option value="">Selecciona…</option>
                <option value="secundaria">Secundaria</option>
                <option value="preparatoria">Preparatoria</option>
              </select>
            </div>
            <div>
              <Label text="Modalidad" required />
              <select value={modalidad} onChange={e => setModalidad(e.target.value)} required
                style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
                <option value="">Selecciona…</option>
                <option value="6_meses">6 meses (Estándar)</option>
                <option value="3_meses">3 meses (Express)</option>
              </select>
            </div>
          </div>

          {/* Sindicalizado */}
          <div className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: 'rgba(58,175,169,0.05)', border: '1px solid rgba(58,175,169,0.2)' }}>
            <input type="checkbox" id="sindicalizado" checked={sindicalizado}
              onChange={e => { setSindicalizado(e.target.checked); if (!e.target.checked) setSindicato('') }}
              className="mt-0.5 cursor-pointer"
              style={{ width: 16, height: 16, accentColor: '#3AAFA9' }} />
            <div className="flex-1">
              <label htmlFor="sindicalizado" className="text-sm font-semibold cursor-pointer"
                style={{ color: '#1B3A57' }}>
                Soy trabajador sindicalizado 🤝
              </label>
              <p className="text-xs mt-0.5" style={{ color: '#6B8FA8' }}>
                IMSS o Ferrocarrileros — aplica precio preferencial
              </p>
            </div>
          </div>

          {sindicalizado && (
            <div>
              <Label text="¿Cuál sindicato?" required />
              <select value={sindicato} onChange={e => setSindicato(e.target.value)} required
                style={selectStyle} onFocus={focusIn} onBlur={focusOut}>
                <option value="">Selecciona tu sindicato…</option>
                <option value="IMSS">IMSS</option>
                <option value="Ferrocarrileros">Ferrocarrileros</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            style={{ background: '#3AAFA9', color: '#fff', boxShadow: '0 4px 14px rgba(58,175,169,0.3)' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2B7A77' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#3AAFA9' }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Creando cuenta...</>
              : 'Crear mi cuenta gratis →'}
          </button>

          {/* Legal */}
          <p className="text-xs text-center leading-relaxed" style={{ color: '#9DB0C0' }}>
            Al registrarte aceptas que IVS Instituto Virtual Superior tratará tus datos
            conforme a su política de privacidad.
          </p>

          {/* Login link */}
          <p className="text-center text-sm" style={{ color: '#6B8FA8' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold transition-colors" style={{ color: '#3AAFA9' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1B3A57' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#3AAFA9' }}>
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>

      {/* WhatsApp */}
      <a href={WA_URL} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm transition-colors" style={{ color: '#6B8FA8' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#16a34a' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#6B8FA8' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.538 5.943L0 24l6.232-1.503A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.366l-.36-.214-3.7.893.935-3.58-.235-.372A9.818 9.818 0 1112 21.818z"/>
        </svg>
        ¿Necesitas ayuda? WhatsApp
      </a>
    </div>
  )
}
