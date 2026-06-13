import { TransitionSeries, linearTiming } from "@remotion/transitions"
import { fade } from "@remotion/transitions/fade"
import { slide } from "@remotion/transitions/slide"
import { ClipScene, type ClipSceneProps } from "./components/ClipScene"
import { EndCard } from "./components/EndCard"
import { HookScene } from "./components/HookScene"

export const TRANSITION_FRAMES = 12

export type ShortSpec = {
  hook: { lines: string[]; accent?: string; duration: number }
  scenes: Array<ClipSceneProps & { duration: number }>
  end: { tagline: string; duration: number }
}

export function shortDuration(spec: ShortSpec): number {
  const seqs = [spec.hook.duration, ...spec.scenes.map((s) => s.duration), spec.end.duration]
  return seqs.reduce((a, b) => a + b, 0) - (seqs.length - 1) * TRANSITION_FRAMES
}

export const Short: React.FC<{ spec: ShortSpec }> = ({ spec }) => {
  const children: React.ReactNode[] = []

  children.push(
    <TransitionSeries.Sequence key="hook" durationInFrames={spec.hook.duration}>
      <HookScene lines={spec.hook.lines} accent={spec.hook.accent} />
    </TransitionSeries.Sequence>,
    <TransitionSeries.Transition
      key="hook-t"
      presentation={slide({ direction: "from-bottom" })}
      timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
    />,
  )

  spec.scenes.forEach((scene, i) => {
    const { duration, ...props } = scene
    children.push(
      <TransitionSeries.Sequence key={`scene-${i}`} durationInFrames={duration}>
        <ClipScene {...props} />
      </TransitionSeries.Sequence>,
      <TransitionSeries.Transition
        key={`scene-${i}-t`}
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />,
    )
  })

  children.push(
    <TransitionSeries.Sequence key="end" durationInFrames={spec.end.duration}>
      <EndCard tagline={spec.end.tagline} />
    </TransitionSeries.Sequence>,
  )

  return <TransitionSeries>{children}</TransitionSeries>
}
