import "opentui-spinner/solid"
import { createWave, createPulse } from "opentui-spinner"
import { useTui } from "../hooks/useTui"
import { Show } from "solid-js"
import { icons } from "../shared/icons"

export type SpinnerProps = {
  label?: string
}

export const Spinner = (props: SpinnerProps) => {
  const { theme } = useTui()

  const colorGen = createWave(["#ff0000", "#00ff00", "#0000ff"]);
  
  return (
    <box flexDirection="row" gap={1}>
      <spinner frames={['▫▫▫', '▪▫▫', '■▪▫', '▪■▪', '▫▪■', '▫▫▪']} interval={200} color={colorGen} />
      <Show when={!!props.label}>
        <spinner frames={[props.label!]} interval={200} color={colorGen} />
      </Show>
      <text fg={theme().textMuted}>{icons.chevronLeft}esc{icons.chevronRight}</text>
    </box>
  )
}