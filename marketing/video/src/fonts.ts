import { loadFont } from "@remotion/fonts"
import { staticFile } from "remotion"

export const fontsReady = Promise.all([
  loadFont({ family: "Alegreya", url: staticFile("fonts/google/Alegreya-Regular.ttf"), weight: "400" }),
  loadFont({ family: "Alegreya", url: staticFile("fonts/google/Alegreya-Bold.ttf"), weight: "700" }),
  loadFont({ family: "Alegreya", url: staticFile("fonts/google/Alegreya-Black.ttf"), weight: "900" }),
  loadFont({ family: "PT Sans", url: staticFile("fonts/google/PTSans-Regular.ttf"), weight: "400" }),
  loadFont({ family: "PT Sans", url: staticFile("fonts/google/PTSans-Bold.ttf"), weight: "700" }),
])
