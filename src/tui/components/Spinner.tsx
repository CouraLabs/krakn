import "opentui-spinner/solid"
import { useTui } from "../hooks/useTui"

export const Spinner = () => {
  const { theme } = useTui()

  return (
    <spinner frames={['▫▫▫', '▪▫▫', '■▪▫', '▪■▪', '▫▪■', '▫▫▪']} interval={200} color={theme().accent} />
  )
}