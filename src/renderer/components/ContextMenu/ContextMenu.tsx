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
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)

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
        top: y,
        left: x,
      }}
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
