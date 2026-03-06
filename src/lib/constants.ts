export const ROLES = {
  ADMIN: 'ADMIN',
  ALUMNO: 'ALUMNO',
} as const

export const ROLE_REDIRECTS: Record<string, string> = {
  ADMIN: '/admin',
  ALUMNO: '/alumno',
}

export const APP_NAME = 'Bachillerato Virtual'

export const COLORS = {
  bg: '#0B0D11',
  card: '#181C26',
  accent: '#5B6CFF',
  accentHover: '#7B8AFF',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
}
