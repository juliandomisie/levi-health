'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Moon, Utensils, Dumbbell, FlaskConical, MessageCircle, Settings, AlarmClock } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Home' },
  { href: '/sleep',      icon: Moon,            label: 'Schlaf' },
  { href: '/nutrition',  icon: Utensils,        label: 'Essen' },
  { href: '/fitness',    icon: Dumbbell,        label: 'Fitness' },
  { href: '/biomarkers', icon: FlaskConical,    label: 'Werte' },
  { href: '/coach',      icon: MessageCircle,   label: 'Coach' },
  { href: '/alarm',      icon: AlarmClock,      label: 'Wecker' },
  { href: '/settings',   icon: Settings,        label: 'Settings' },
]

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href)
          return (
            <Link key={href} href={href} className={cn(
              'flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-colors min-w-0',
              active ? 'text-primary' : 'text-muted-foreground'
            )}>
              <Icon className={cn('w-4 h-4', active && 'drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]')} />
              <span className="text-[8px] font-medium truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
