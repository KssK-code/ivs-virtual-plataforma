import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Syne, DM_Sans } from 'next/font/google'
import { CONFIG } from '@/lib/config'

/**
 * Landing minimal — solicitud del cliente IVS (2026-07-29).
 * Solo logo, titulo y tres accesos: Iniciar sesion, Registrarse y WhatsApp.
 *
 * La landing de marketing anterior (~450 lineas, 10 secciones) queda en el
 * historial de git: ver src/app/page.tsx en el commit e1c8855 y anteriores.
 *
 * Paleta y tipografias tomadas de src/lib/config.ts y del antiguo landing.css
 * (borrado; queda en el historial de git junto con la landing anterior):
 *   navy #1B3A57 / navy-light #2D5F8A / teal #3AAFA9 / teal-dark #2B7A77 / blanco #FFFFFF
 */

// Mismas tipografias que ya usaba el sitio (antes via @import de Google Fonts en
// landing.css), ahora auto-hospedadas por Next: sin request externo en runtime.
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })

const WA_MESSAGE = 'Hola, quiero información sobre la Plataforma Virtual de IVS'
const WA_URL = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(WA_MESSAGE)}`

export const metadata: Metadata = {
  title: { absolute: 'Plataforma Virtual de IVS' },
  description: `Accede a la Plataforma Virtual de ${CONFIG.nombreCompleto}: inicia sesión, crea tu cuenta o escríbenos por WhatsApp.`,
  openGraph: {
    title: 'Plataforma Virtual de IVS',
    description: `Accede a la Plataforma Virtual de ${CONFIG.nombreCompleto}.`,
    type: 'website',
    locale: 'es_MX',
    siteName: CONFIG.nombre,
  },
}

/** Base compartida: ancho completo apilado en movil, auto en fila desde sm. */
const BTN_BASE =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 ' +
  'text-base font-semibold transition-colors focus-visible:outline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto'

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.538 5.943L0 24l6.232-1.503A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.366l-.36-.214-3.7.893.935-3.58-.235-.372A9.818 9.818 0 1112 21.818z" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <main
      // bg blanco (--bg-white de landing.css): logo.png no tiene canal alfa, su
      // fondo es blanco solido; asi no se ve el recuadro. Coincide ademas con el
      // bg-white del layout de auth, sin salto visual al ir a iniciar sesion.
      className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16"
      // 100dvh donde el navegador lo soporte; si no, cae al min-h-screen (100vh).
      style={{ minHeight: '100dvh', fontFamily: `${dmSans.style.fontFamily}, sans-serif` }}
    >
      <Image
        src={CONFIG.logo}
        alt={CONFIG.nombreCompleto}
        width={500}
        height={500}
        priority
        // unoptimized: logo.png no tiene canal alfa y su fondo es blanco plano.
        // Al pasar por el optimizador el WebP lo degrada a 254 (incluso con
        // quality=100) y se alcanza a ver el recuadro contra el blanco de la
        // pagina. Son 12 KB: se sirve el PNG tal cual, con color exacto.
        unoptimized
        className="h-32 w-32 object-contain sm:h-44 sm:w-44"
      />

      <h1
        className="mt-8 text-balance text-center text-3xl font-extrabold leading-tight text-[#1B3A57] sm:mt-10 sm:text-4xl md:text-5xl"
        style={{ fontFamily: `${syne.style.fontFamily}, sans-serif` }}
      >
        Plataforma Virtual de IVS
      </h1>

      <nav
        aria-label="Accesos principales"
        className="mt-10 flex w-full max-w-xs flex-col items-stretch gap-3 sm:mt-12 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4"
      >
        <Link
          href="/login"
          className={`${BTN_BASE} bg-[#1B3A57] text-white hover:bg-[#2D5F8A] focus-visible:outline-[#1B3A57]`}
        >
          Iniciar sesión
        </Link>

        <Link
          href="/register"
          className={`${BTN_BASE} border-2 border-[#3AAFA9] text-[#2B7A77] hover:bg-[#3AAFA9]/10 focus-visible:outline-[#2B7A77]`}
        >
          Registrarse
        </Link>

        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BTN_BASE} bg-green-500 text-white hover:bg-green-600 focus-visible:outline-green-600`}
        >
          <WhatsAppIcon />
          WhatsApp
        </a>
      </nav>
    </main>
  )
}
