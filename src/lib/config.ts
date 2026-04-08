/**
 * Configuración central del cliente LMS.
 * Al clonar desde el template, editar solo este archivo (ver SETUP.md).
 */
export const CONFIG = {
  nombre: 'IVS Virtual',
  nombreCompleto: 'IVS Instituto Virtual Superior',
  whatsapp: '523328381405',
  whatsappDisplay: '33 2838 1405',
  logo: '/logo.png',
  dominio: 'ivsvirtual.com',
  colores: {
    primary: '#1B3A57',
    secondary: '#3AAFA9',
    accent: '#4BBFBF',
  },
  niveles: ['secundaria', 'preparatoria'] as const,
  /** Correo de contacto (footer, perfil, etc.) */
  email: 'ivsvirtualadmin@gmail.com',
  slogan: 'Tu educación, a tu ritmo',
  sep: true,
  precios: {
    inscripcion: 399,
    preparatoria_6meses_normal: 1200,
    preparatoria_6meses_sindicalizado: 850,
    preparatoria_3meses_normal: 2400,
    preparatoria_3meses_sindicalizado: 1700,
    secundaria_6meses_normal: 1200,
    secundaria_6meses_sindicalizado: 850,
    secundaria_3meses_normal: 2400,
    secundaria_3meses_sindicalizado: 1700,
    certificacion_preparatoria: 5590,
    certificacion_secundaria: 4750,
  },
} as const

/** Compatibilidad con layout, footer y panel admin */
export const ESCUELA_CONFIG = {
  nombre: CONFIG.nombre,
  slug: 'ivs-virtual',
  logoUrl: CONFIG.logo,
  colorPrimario: CONFIG.colores.secondary,
  colorSecundario: CONFIG.colores.primary,
  contactoEmail: CONFIG.email,
  /** Número internacional sin + para wa.me */
  contactoTelefono: CONFIG.whatsapp,
  /** Texto legible en UI */
  whatsappDisplay: CONFIG.whatsappDisplay,
};

/** @deprecated usar CONFIG */
export const config = CONFIG
