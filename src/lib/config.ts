export const config = {
  nombre: "IVS Virtual",
  nombreCompleto: "Instituto Virtual Superior",
  slogan: "Tu educación, a tu ritmo",
  logo: "/logo-ivs.png",
  whatsapp: "523328381405",
  telefono: "3328381405",
  email: "ivsvirtualadmin@gmail.com",
  dominio: "ivsvirtual.com",
  colores: {
    primary: "#3AAFA9",
    secondary: "#1B3A57",
    accent: "#2B7A77",
    primaryLight: "#4ECDC4",
  },
  niveles: ["secundaria", "preparatoria"] as const,
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
  }
}

// Compatibilidad con código existente que usa ESCUELA_CONFIG
export const ESCUELA_CONFIG = {
  nombre: config.nombre,
  slug: 'ivs-virtual',
  logoUrl: config.logo,
  colorPrimario: config.colores.primary,
  colorSecundario: config.colores.secondary,
  contactoEmail: config.email,
  contactoTelefono: config.telefono,
}
