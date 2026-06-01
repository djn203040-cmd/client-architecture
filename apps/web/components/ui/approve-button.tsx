"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Approve action button. The brighter colour fills like a progress bar: on
// click it crawls toward — but never reaches — full while the approval request
// is in flight, then completes the instant the action resolves (the "Approved"
// toast). The sweep is the loading indicator, timed to the real work.
type Phase = "idle" | "loading" | "done"

type ApproveButtonProps = React.ComponentProps<typeof Button>

// How far the crawl eases to while pending. 100% = empty, 0% = full.
const CRAWL_TO = "14%"
const CRAWL_MS = "2600ms"
const COMPLETE_MS = "280ms"

function ApproveButton({ onClick, className, children, ...props }: ApproveButtonProps) {
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [pos, setPos] = React.useState("100%")
  const [dur, setDur] = React.useState("0ms")
  const mounted = React.useRef(true)

  React.useEffect(
    () => () => {
      mounted.current = false
    },
    []
  )

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (phase !== "idle") return

    // Start empty, then ease toward full on the next frame so the browser has
    // an empty bar to transition *from* (a same-frame change wouldn't animate).
    setPhase("loading")
    setDur("0ms")
    setPos("100%")
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!mounted.current) return
        setDur(CRAWL_MS)
        setPos(CRAWL_TO)
      })
    )

    // Fire the real action immediately and complete the bar when it resolves.
    Promise.resolve(onClick?.(event)).finally(() => {
      if (!mounted.current) return
      setDur(COMPLETE_MS)
      setPos("0%")
      setPhase("done")
    })
  }

  const style =
    phase === "idle"
      ? undefined
      : ({ "--approve-pos": pos, "--approve-dur": dur } as React.CSSProperties)

  return (
    <Button
      {...props}
      aria-busy={phase === "loading" || undefined}
      data-phase={phase === "idle" ? undefined : phase}
      onClick={handleClick}
      className={cn("btn-approve-glow", className)}
      style={style}
    >
      {children}
    </Button>
  )
}

export { ApproveButton }
