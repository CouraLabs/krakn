import { useContext, useMemo, useRef, useState } from "react"
import { createPortal, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react"
import { TextAttributes, type BoxRenderable } from "@opentui/core"
import { AppContext } from "../context/appContext"

export type DropdownSide = "bottom" | "top" | "right" | "left"

export type DropdownOption<T> = {
  value: T
  label: string
}

export type DropdownProps<T> = {
  options: DropdownOption<T>[]
  value?: T
  key?: string
  onChange?: (value: T, option: DropdownOption<T>) => void
  /** Preferred side the popup opens toward. Flipped automatically when there is no room. */
  side?: DropdownSide
  /** Max option rows shown before scrolling. */
  maxVisible?: number
  /** Width of the popup menu. Defaults to the trigger width. */
  width?: number
  /** Gap, in cells, between the trigger and the popup. */
  offset?: number
  placeholder?: string
  /** Optional stable id for the popup box (useful for tests/introspection). */
  menuId?: string
  /** Optional stable id for the trigger box (useful for tests/introspection). */
  triggerId?: string
  /** Custom trigger renderer. Receives the open state. */
  renderTrigger?: (open: boolean, selectedLabel: string) => unknown
}

export type Placement = { top: number, left: number, side: DropdownSide }

export type DropdownGeo = {
  /** Trigger rectangle in screen coordinates. */
  trigger: { x: number, y: number, width: number, height: number }
  /** Desired popup size, in cells. */
  menuSize: { width: number, height: number }
  /** Terminal dimensions. */
  term: { width: number, height: number }
  side?: DropdownSide
  offset?: number
}

/**
 * Pick the side to open toward and the top-left position so the popup fits
 * inside the terminal. `side` is the preferred side; it is flipped when there
 * is not enough room, then clamped to the edges.
 */
export function computePlacement(geo: DropdownGeo): Placement {
  const { trigger, menuSize, term } = geo
  const side = geo.side ?? "bottom"
  const gap = geo.offset ?? 1
  const rows = term.height
  const cols = term.width
  const { x: tx, y: ty, width: tw, height: th } = trigger
  const mw = menuSize.width
  const mh = menuSize.height

  let s = side

  // Vertical fit: "bottom" needs room below, "top" needs room above.
  if (s === "bottom" && ty + th + gap + mh > rows) s = "top"
  else if (s === "top" && ty - gap - mh < 0) s = "bottom"
  // Horizontal fit: "right" needs room to the right, "left" to the left.
  if (s === "right" && tx + tw + gap + mw > cols) s = "left"
  else if (s === "left" && tx - gap - mw < 0) s = "right"

  let top: number
  let left: number
  if (s === "bottom") {
    top = ty + th
    left = tx
  } else if (s === "top") {
    top = ty - gap - mh
    left = tx
  } else if (s === "right") {
    top = ty
    left = tx + tw + gap
  } else {
    top = ty
    left = tx - gap - mw
  }

  // Clamp to the terminal edges.
  if (left < 0) left = 0
  if (left + mw > cols) left = cols - mw
  if (top < 0) top = 0
  if (top + mh > rows) top = rows - mh

  return { top, left, side: s }
}

/**
 * Terminal dropdown built on opentui.
 * - Click the trigger to open; the popup is placed toward a preferred side and
 *   flipped (top/bottom/left/right) + clamped to stay within the terminal.
 * - Options scroll (mouse wheel) when they exceed `maxVisible`.
 * - Hover highlights; click selects and closes.
 */
export function Dropdown<T>(props: DropdownProps<T>) {
  const { theme } = useContext(AppContext)
  const dims = useTerminalDimensions()
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState('')
  const [placement, setPlacement] = useState<Placement>()
  const renderer = useRenderer()
  const triggerRef = useRef<BoxRenderable | null>(null)

  const selected = useMemo(() => props.options.find((o) => o.value === props.value), [props.options, props.value])
  const selectedLabel = selected?.label ?? props.placeholder ?? "Select…"
  // Show the selected option first in the open list so the current value is
  // always immediately visible; the rest keep their original order.
  const orderedOptions = useMemo<DropdownOption<T>[]>(() => {
    if (props.value === undefined) return props.options
    const idx = props.options.findIndex((o) => o.value === props.value)
    if (idx <= 0) return props.options
    const rest = [...props.options]
    const [sel] = rest.splice(idx, 1)
    return [sel, ...rest]
  }, [props.options, props.value])
  const maxVisible = Math.max(1, props.maxVisible ?? 10)
  const visibleRows = Math.min(orderedOptions.length, maxVisible)
  // Longest option label, measured in display cells.
  const longestLabel = orderedOptions.reduce((m, o) => {
      const len = [...o.label].length
      return len > m ? len : m
    }, 0)
  // Menu width = longest label + the row padding (paddingX) on each side, so
  // every option fits regardless of how the trigger happens to be laid out.
  const menuWidth = props.width ?? longestLabel + 2
  const menuHeight = visibleRows

  const close = () => setOpen(false)

  const openMenu = () => {
    const t = dims
    setHovered('')
    setPlacement(computePlacement({
      trigger: {
        x: triggerRef.current?.screenX ?? 0,
        y: triggerRef.current?.screenY ?? 0,
        width: triggerRef.current?.width ?? 0,
        height: triggerRef.current?.height ?? 1,
      },
      menuSize: { width: menuWidth, height: menuHeight },
      term: { width: t.width, height: t.height },
      side: props.side,
      offset: props.offset,
    }))
    setOpen(true)
  }

  const toggle = () => (open ? close() : openMenu())

  // Escape closes the menu while it is open.
  useKeyboard((key) => {
    if (open && key.name === "escape") close()
  })

  return (
    <>
      {props.renderTrigger
        ? props.renderTrigger(open, selectedLabel)
        : (
          <box
            ref={triggerRef}
            id={props.triggerId}
            focusable
            onMouseDown={toggle}
            height={1}
            paddingX={1}
            flexDirection="row"
            gap={1}
            backgroundColor={theme.backgroundElement}
          >
            <text fg={theme.text}>{props.key}:</text>
            <text fg={theme.text} attributes={TextAttributes.DIM}>{selectedLabel}</text>
            <text fg={theme.text} attributes={TextAttributes.DIM}>{open ? "▴" : "▾"}</text>
          </box>
        )}
      {/* Always mounted via portal; the overlay is a full-screen absolute box
          above the layout, hidden until opened. Clicking it closes the menu. */}
      {createPortal(
        <box
          position="absolute"
          left={0}
          top={0}
          zIndex={50}
          width={dims.width}
          height={dims.height}
          visible={open && !!placement}
          onMouseDown={() => close()}
        >
          <box
            id={props.menuId}
            position="absolute"
            top={placement?.top ?? 0}
            left={placement?.left ?? 0}
            width={menuWidth + 6}
            height={menuHeight + 2}
            zIndex={100}
            paddingX={2}
            paddingY={1}
            backgroundColor={theme.backgroundMenu}
            flexDirection="column"
            visible={open && !!placement}
          >
            <scrollbox>
              {orderedOptions.map((option, i) => {
                const absIndex = `item-${i}`
                const isSelected = selected === option
                return (
                  <box
                    key={option.value !== undefined ? String(option.value) : absIndex}
                    id={`item-${i}`}
                    height={1}
                    paddingX={1}
                    backgroundColor={hovered === absIndex ? theme.border : undefined}
                    onMouseOver={() => setHovered(`item-${i}`)}
                    onMouseDown={() => {
                      setHovered('')
                      props.onChange?.(option.value, option)
                      close()
                    }}
                  >
                    <text fg={isSelected ? theme.accent : hovered === absIndex ? theme.text : theme.textMuted}>
                      {option.label}
                    </text>
                  </box>
                )
              })}
            </scrollbox>
          </box>
        </box>,
        renderer.root,
        null
      )}
    </>
  )
}