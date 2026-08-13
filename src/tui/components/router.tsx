import { useTui } from "../hooks/useTui"
import "opentui-spinner/solid"
import type { SpinnerOptions } from "opentui-spinner"

type SpinnerName = NonNullable<SpinnerOptions["name"]>

// All spinners shipped by opentui-spinner (cli-spinners), for visual testing.
const SPINNERS = [
  "aesthetic",
  "arc",
  "arrow",
  "arrow2",
  "arrow3",
  "balloon",
  "balloon2",
  "betaWave",
  "binary",
  "bluePulse",
  "bounce",
  "bouncingBall",
  "bouncingBar",
  "boxBounce",
  "boxBounce2",
  "christmas",
  "circle",
  "circleHalves",
  "circleQuarters",
  "clock",
  "dots",
  "dots10",
  "dots11",
  "dots12",
  "dots13",
  "dots14",
  "dots2",
  "dots3",
  "dots4",
  "dots5",
  "dots6",
  "dots7",
  "dots8",
  "dots8Bit",
  "dots9",
  "dotsCircle",
  "dqpb",
  "dwarfFortress",
  "earth",
  "fingerDance",
  "fish",
  "fistBump",
  "flip",
  "grenade",
  "growHorizontal",
  "growVertical",
  "hamburger",
  "hearts",
  "layer",
  "line",
  "line2",
  "material",
  "mindblown",
  "monkey",
  "moon",
  "noise",
  "orangeBluePulse",
  "orangePulse",
  "pipe",
  "point",
  "pong",
  "rollingLine",
  "runner",
  "sand",
  "shark",
  "simpleDots",
  "simpleDotsScrolling",
  "smiley",
  "soccerHeader",
  "speaker",
  "squareCorners",
  "squish",
  "star",
  "star2",
  "timeTravel",
  "toggle",
  "toggle10",
  "toggle11",
  "toggle12",
  "toggle13",
  "toggle2",
  "toggle3",
  "toggle4",
  "toggle5",
  "toggle6",
  "toggle7",
  "toggle8",
  "toggle9",
  "triangle",
  "weather",
] as const

export const Router = () => {
  const { theme } = useTui()
  return (
    <box height="100%" width="100%" flexDirection="column" backgroundColor={theme().background}>
      <box flexDirection="row">
        <box borderStyle="rounded" border={['left', 'top', 'right']} paddingX={1} borderColor={theme().borderActive} focusedBorderColor={theme().borderActive} focused={true}>
          <text fg={theme().text}>Tab 1</text>
        </box>
        <box borderStyle="rounded" border={['left', 'top', 'right']} paddingX={1}>
          <text fg={theme().text}>Tab 2</text>
        </box>
        <box borderStyle="rounded" border={['left', 'top', 'right']} paddingX={1}>
          <text fg={theme().text}>Tab 3</text>
        </box>
        <box borderStyle="rounded" border={['left', 'top', 'right']} paddingX={1}>
          <text fg={theme().text}>Tab 4</text>
        </box>
      </box>
      <box border borderColor={theme().accent} flexDirection="column" paddingX={1} paddingY={1}>
        <spinner frames={['▫▫▫', '▪▫▫', '■▪▫', '▪■▪', '▫▪■', '▫▫▪']} interval={200} color={theme().accent} />
      </box>
    </box>
  )
}
