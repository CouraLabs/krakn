import { useContext, useMemo } from "react"
import type { ReactNode } from "react"
import { createPortal, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react"
import { RGBA } from "@opentui/core"
import { AppContext } from "../context/appContext"
import { Button } from "./Button"

export type DialogSize = "small" | "medium" | "full"

export type DialogProps = {
  open: boolean
  onClose: () => void
  /** Title shown in the header. */
  title?: string
  /** Dialog size; defaults to "medium". */
  size?: DialogSize
  /** Dialog body, rendered below the header. */
  children: ReactNode
}

export type DialogGeometry = { top: number, left: number, width: number, height: number }

/**
 * Compute the centered on-screen dialog rectangle for a given size.
 * - "small"  fills ~30% of the terminal.
 * - "medium" fills ~70%.
 * - "full"   fills the terminal minus a 2-cell margin on every side.
 */
export function computeDialogGeometry(size: DialogSize, term: { width: number, height: number }): DialogGeometry {
  const { width, height } = term
  if (size === "full") {
    return { top: 2, left: 2, width: Math.max(0, width - 4), height: Math.max(0, height - 4) }
  }
  const ratio = size === "small" ? 0.3 : 0.7
  const w = Math.round(width * ratio)
  const h = Math.round(height * ratio)
  return {
    top: Math.max(0, Math.round((height - h) / 2)),
    left: Math.max(0, Math.round((width - w) / 2)),
    width: Math.max(0, w),
    height: Math.max(0, h),
  }
}

/**
 * Terminal modal dialog built on opentui. Uses the same technique as the
 * Dropdown: a portal into the render root below the viewport, with a full-screen
 * absolute overlay.
 *
 * - The body is `props.children`.
 * - Centered on the terminal; three sizes: small (30%), medium (70%), full.
 * - Default header shows a title and a close button.
 * - Escape or clicking the overlay outside the dialog closes it.
 */
export function Dialog(props: DialogProps) {
  const { theme } = useContext(AppContext)
  const dims = useTerminalDimensions()
  const renderer = useRenderer()
  const size = props.size ?? "medium"
  const geo = useMemo(() => computeDialogGeometry(size, dims), [size, dims.width, dims.height])

  // Escape closes the dialog while it is open.
  useKeyboard((key) => {
    if (props.open && key.name === "escape") props.onClose()
  })

  return createPortal(
    <>
      {/* Full-screen overlay; clicking it closes the dialog. */}
      <box
        position="absolute"
        left={0}
        top={0}
        zIndex={60}
        width={dims.width}
        height={dims.height}
        visible={props.open}
        backgroundColor={RGBA.fromInts(0, 0, 0, 180)}
        onMouseDown={() => props.onClose()}
      />
      {/* Dialog panel; clicks inside stop propagation so they do not reach the overlay. */}
      <box
        position="absolute"
        top={geo.top}
        left={geo.left}
        width={geo.width}
        height={geo.height}
        zIndex={70}
        visible={props.open}
        backgroundColor={theme.backgroundPanel}
        flexDirection="column"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <box
          flexDirection="row"
          alignItems="space-between"
          justifyContent="space-between"
          paddingX={2} paddingY={1}
        >
          <text fg={theme.text}>{props.title ?? ""}</text>
          <Button label="X" onClick={props.onClose} />
        </box>
        <box flexGrow={1} paddingX={1} paddingY={1} backgroundColor={theme.backgroundElement}>
          {props.children}
        </box>
        <box paddingX={1} paddingY={1} alignItems="flex-end" backgroundColor={theme.backgroundPanel}>
          <Button label=" cancel " onClick={props.onClose} />
        </box>
      </box>
    </>,
    renderer.root,
    null
  )
}