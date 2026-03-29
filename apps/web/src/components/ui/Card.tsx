import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Card({ children, header, footer, className }: CardProps) {
  return (
    <div className={clsx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {header && <div className="border-b border-slate-200 px-6 py-4">{header}</div>}
      <div className="px-6 py-4">{children}</div>
      {footer && <div className="border-t border-slate-200 px-6 py-4">{footer}</div>}
    </div>
  )
}
