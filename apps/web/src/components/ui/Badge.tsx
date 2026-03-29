import { clsx } from 'clsx'

type BadgeColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'

interface BadgeProps {
  color?: BadgeColor
  children: React.ReactNode
  className?: string
}

const colors: Record<BadgeColor, string> = {
  gray: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-primary-100 text-primary-700',
}

export function Badge({ color = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors[color],
        className
      )}
    >
      {children}
    </span>
  )
}
