import { useState } from 'react'
import { cn } from '../../../lib/utils'

function logoSrc(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/logo.png`
  }
  return '/logo.png'
}

export function ShareLogo({ size = 40 }: { size?: number }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className={cn('font-serif font-black text-accent')} style={{ fontSize: size * 0.6 }}>
        MyLib
      </span>
    )
  }

  return (
    <img
      src={logoSrc()}
      alt="MyLib"
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="rounded-xl object-contain"
    />
  )
}
