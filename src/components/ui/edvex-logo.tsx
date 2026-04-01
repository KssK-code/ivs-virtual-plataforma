'use client'

import Image from 'next/image'

interface IVSLogoProps {
  size?: number
  innerFill?: string  // kept for API compatibility, unused
}

export function EdvexLogo({ size = 36 }: IVSLogoProps) {
  return (
    <Image
      src="/logo-ivs.jpg"
      alt="IVS Instituto Virtual Superior"
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: 6 }}
    />
  )
}
