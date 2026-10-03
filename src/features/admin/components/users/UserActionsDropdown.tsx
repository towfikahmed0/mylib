import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  Ban,
  Eye,
  KeyRound,
  MoreVertical,
  Shield,
  ShieldOff,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { toast } from '../../../../store/toastStore'
import type { AdminUserRecord } from '../../types/admin.types'

export interface UserRowActions {
  onView: (user: AdminUserRecord) => void
  onPromote: (user: AdminUserRecord) => void
  onDemote: (user: AdminUserRecord) => void
  onResetPassword: (user: AdminUserRecord) => void
  onBan: (user: AdminUserRecord) => void
}

interface UserActionsDropdownProps {
  user: AdminUserRecord
  actions: UserRowActions
}

const MENU_GAP = 4
const VIEWPORT_PADDING = 8
const HIDDEN_STYLE: CSSProperties = {
  position: 'fixed',
  top: -9999,
  right: VIEWPORT_PADDING,
  visibility: 'hidden',
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-surface-muted',
        danger ? 'text-rose-600 dark:text-rose-400' : 'text-foreground',
      )}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  )
}

export function UserActionsDropdown({ user, actions }: UserActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Position the portaled menu relative to the trigger. `getBoundingClientRect`
  // gives viewport coordinates, which is exactly what `position: fixed` needs.
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const rect = trigger.getBoundingClientRect()
    const menuHeight = menu.offsetHeight

    const openAbove =
      rect.bottom + MENU_GAP + menuHeight > window.innerHeight &&
      rect.top - MENU_GAP - menuHeight >= VIEWPORT_PADDING

    menu.style.top = `${openAbove ? rect.top - MENU_GAP - menuHeight : rect.bottom + MENU_GAP}px`
    menu.style.right = `${Math.max(VIEWPORT_PADDING, window.innerWidth - rect.right)}px`
    menu.style.visibility = 'visible'
  }, [])

  // Runs after the menu is in the DOM, so its real height is known before paint.
  useLayoutEffect(() => {
    if (isOpen) updatePosition()
  }, [isOpen, updatePosition])

  // Keep the fixed menu aligned while the page or viewport moves.
  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  // Click-outside (trigger or menu) and Escape. The menu lives in a portal, so
  // both elements must be checked.
  useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const run = (fn: () => void) => {
    setIsOpen(false)
    fn()
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={`Actions for ${user.displayName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={HIDDEN_STYLE}
              className="z-50 w-56 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-surface py-1 shadow-xl"
            >
              <MenuItem
                icon={Eye}
                label="View Profile"
                onClick={() => run(() => actions.onView(user))}
              />

              {user.role === 'user' ? (
                <MenuItem
                  icon={Shield}
                  label="Promote to Admin"
                  onClick={() => run(() => actions.onPromote(user))}
                />
              ) : (
                <MenuItem
                  icon={ShieldOff}
                  label="Demote to User"
                  onClick={() => run(() => actions.onDemote(user))}
                />
              )}

              <MenuItem
                icon={KeyRound}
                label="Reset Password"
                onClick={() => run(() => actions.onResetPassword(user))}
              />

              <MenuItem
                icon={Ban}
                label="Ban User"
                danger
                onClick={() => run(() => actions.onBan(user))}
              />

              <MenuItem
                icon={Trash2}
                label="Delete User"
                danger
                onClick={() => run(() => toast.info('Available in Phase 6.3 (server-only)'))}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
