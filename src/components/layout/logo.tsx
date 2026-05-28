interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
  iconOnly?: boolean
}

const sizes = {
  sm: { icon: 20, text: 'text-base', gap: 'gap-2' },
  md: { icon: 28, text: 'text-xl', gap: 'gap-2.5' },
  lg: { icon: 40, text: 'text-3xl', gap: 'gap-3' },
}

export function Logo({ size = 'sm', dark = false, iconOnly = false }: LogoProps) {
  const { icon, text, gap } = sizes[size]

  return (
    <div className={`flex items-center ${gap}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <polygon points="2,2 24,2 30,8 30,30 2,30" fill="#F59E0B" />
        <polygon points="24,2 24,8 30,8" fill="#B45309" />
        <line x1="6" y1="15" x2="22" y2="15" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="20" x2="22" y2="20" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="25" x2="16" y2="25" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {!iconOnly && (
        <span className={`font-sans font-normal tracking-tight leading-none ${text} ${dark ? 'text-white' : 'text-foreground'}`}>
          retro
          <span className="relative font-bold" style={{ color: dark ? '#F59E0B' : '#4F46E5' }}>
            not
            <span
              className="absolute left-0 right-0 rounded-full"
              style={{
                bottom: '-2px',
                height: '2px',
                background: '#F59E0B',
              }}
            />
          </span>
        </span>
      )}
    </div>
  )
}
