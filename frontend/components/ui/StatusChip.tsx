import { cn } from '@/lib/utils'

type Status = 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI' | 'AKTIF' | 'NONAKTIF'

const statusConfig: Record<Status, { bg: string; text: string; label: string }> = {
  TERSEDIA: { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]', label: 'Tersedia' },
  DIPESAN:  { bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]', label: 'Dipesan' },
  TERJUAL:  { bg: 'bg-[#dbeef8]', text: 'text-primary',   label: 'Terjual' },
  MATI:     { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', label: 'Mati' },
  AKTIF:    { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]', label: 'Aktif' },
  NONAKTIF: { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', label: 'Nonaktif' },
}

interface StatusChipProps {
  status: Status
  className?: string
}

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status]

  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium',
      config.bg, config.text, className
    )}>
      {config.label}
    </span>
  )
}
