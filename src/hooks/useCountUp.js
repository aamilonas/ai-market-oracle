import { useEffect, useState, useRef } from 'react'

/**
 * Smoothly animates a numeric value from 0 to `target` over `duration` ms.
 * Uses requestAnimationFrame and an ease-out curve.
 *
 * @param {number} target   Final value.
 * @param {number} duration Animation length in ms (default 800).
 * @param {number} decimals Number of decimals for the returned string (default 0).
 */
export function useCountUp(target, duration = 800, decimals = 0) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (target === null || target === undefined || Number.isNaN(target)) return

    startRef.current = null
    cancelAnimationFrame(rafRef.current)

    const step = (timestamp) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return Number(value.toFixed(decimals))
}
