import { createEffect, createMemo } from "solid-js"
import type { JSX } from "solid-js"
import { Portal, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/solid"
import type { BoxRenderable } from "@opentui/core"
import { useTui } from "../hooks/useTui"
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
  children: JSX.Element
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
 * Dropdown: a Portal mounts into the render root below the viewport, which is
 * repurposed as an absolute full-screen overlay.
 *
 * - The body is `props.children`.
 * - Centered on the terminal; three sizes: small (30%), medium (70%), full.
 * - Default header shows a title and a close button.
 * - Escape or clicking the overlay outside the dialog closes it.
 */
export function Dialog(props: DialogProps) {
  const { theme } = useTui()
  const dims = useTerminalDimensions()
  const renderer = useRenderer()
  const size = () => props.size ?? "medium"
  const geo = createMemo(() => computeDialogGeometry(size(), dims()))
  let overlayBox: BoxRenderable | undefined

  // Escape closes the dialog while it is open.
  useKeyboard((key) => {
    if (props.open && key.name === "escape") props.onClose()
  })

  // The opentui <Portal> mounts its children into a plain flow box appended to
  // the render root — below the viewport. Repurpose it as an absolute
  // full-screen overlay (visible only while the dialog is open); clicking it
  // closes the dialog. Clicks inside the dialog stop propagation so they do
  // not reach this overlay handler.
  createEffect(() => {
    const o = overlayBox
    if (!o) return
    const d = dims()
    o.position = "absolute"
    o.left = 0
    o.top = 0
    o.zIndex = 60
    o.width = d.width
    o.height = d.height
    o.visible = props.open
    o.onMouseDown = () => props.onClose()
  })

  return (
    <Portal mount={renderer.root} ref={(el) => { overlayBox = el as BoxRenderable | undefined }}>
      <box
        position="absolute"
        top={geo().top}
        left={geo().left}
        width={geo().width}
        height={geo().height}
        zIndex={70}
        backgroundColor={theme().backgroundPanel}
        flexDirection="column"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingX={1}
          height={1}
        >
          <text fg={theme().text}>{props.title ?? ""}</text>
          <Button label="✕" onClick={props.onClose} />
        </box>
        <box flexGrow={1} paddingX={1} paddingY={1}>
          {props.children}
        </box>
      </box>
    </Portal>
  )
}