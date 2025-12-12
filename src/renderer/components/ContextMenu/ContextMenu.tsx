import React, { useEffect, useRef } from 'react'
import './_context-menu.scss'

export interface ContextMenuOption {
  label: string
  action: () => void
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  options: ContextMenuOption[]
  onClose: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose, onMouseEnter, onMouseLeave }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: y, left: x })

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const { innerWidth, innerHeight } = window

      let newTop = y
      let newLeft = x

      // Check right edge
      if (x + rect.width > innerWidth) {
        newLeft = x - rect.width
      }

      // Check bottom edge
      if (y + rect.height > innerHeight) {
        newTop = y - rect.height
      }

      setPosition({ top: newTop, left: newLeft })
    }
  }, [x, y])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      className="context-menu"
      ref={menuRef}
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {options.map((option, index) => (
        <button
          key={index}
          className={`context-menu__item ${option.danger ? 'danger' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            option.action()
            onClose()
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default ContextMenu
