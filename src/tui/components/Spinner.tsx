import "opentui-spinner/react"
import { AppContext } from "../context/appContext"
import { useContext } from "react"
import { icons } from "../shared/icons"

export type SpinnerProps = {
  label?: string
}

export const Spinner = (props: SpinnerProps) => {
  const { theme } = useContext(AppContext)

  return (
    <box flexDirection="row" gap={1}>
      <spinner frames={['▫▫▫', '▪▫▫', '■▪▫', '▪■▪', '▫▪■', '▫▫▪']} interval={100} color={theme.accent} />
      {!!props.label && (
        <spinner frames={[props.label!, `${props.label!}.`, `${props.label!}..`, `${props.label!}...`]} interval={100} color={theme.accent} />
      )}
      <text fg={theme.textMuted}>{icons.chevronLeft}esc{icons.chevronRight}</text>
    </box>
  )
}