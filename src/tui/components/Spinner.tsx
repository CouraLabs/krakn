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

  return (
    <box flexDirection="row" gap={1}>
      <spinner frames={['▫▫▫', '▪▫▫', '■▪▫', '▪■▪', '▫▪■', '▫▫▪']} interval={100} color={theme().accent} />
      <Show when={!!props.label}>
        <spinner frames={[props.label!, `${props.label!}.`, `${props.label!}..`, `${props.label!}...`]} interval={100} color={theme().accent} />
      </Show>
      <text fg={theme().textMuted}>{icons.chevronLeft}esc{icons.chevronRight}</text>
    </box>
  )
}