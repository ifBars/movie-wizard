export const softSpring = {
  type: "spring",
  stiffness: 260,
  damping: 32,
  mass: 0.9,
} as const;

export const quickSpring = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.65,
} as const;

export const smoothEase = [0.22, 1, 0.36, 1] as const;

export function fadeSlide(shouldReduceMotion?: boolean | null, distance = 16) {
  return {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: shouldReduceMotion ? 0 : -distance * 0.5 },
    transition: { duration: shouldReduceMotion ? 0.08 : 0.2, ease: smoothEase },
  };
}

export function pageFade(shouldReduceMotion?: boolean | null) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: shouldReduceMotion ? 0.06 : 0.14, ease: smoothEase },
  };
}

export function fadeScale(shouldReduceMotion?: boolean | null) {
  return {
    initial: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 },
    transition: { duration: shouldReduceMotion ? 0.12 : 0.22, ease: smoothEase },
  };
}
