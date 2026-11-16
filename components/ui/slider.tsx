"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, onPointerDown, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-pan-y select-none items-center",
      className
    )}
    // On a phone a vertical swipe that starts on the track must scroll the
    // page, not jump the value: touch moves only the thumb. preventDefault
    // makes Radix skip its slide start; releasing the browser's implicit
    // touch capture stops its pointermove handler sliding the value anyway.
    onPointerDown={(e) => {
      onPointerDown?.(e)
      const target = e.target as HTMLElement
      if (e.pointerType !== "touch" || target.closest("[role=slider]")) return
      e.preventDefault()
      if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
    }}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="relative block h-5 w-5 touch-none rounded-full after:absolute after:-inset-3 after:content-[''] border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
