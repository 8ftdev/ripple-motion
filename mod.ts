/**
 * Scoped Motion mini animations for Ripple callback refs.
 *
 * @example
 * ```ts
 * import { createAnimate } from "@8ft/ripple-motion";
 * const [scope, animate] = createAnimate<HTMLElement>();
 * // In a Ripple component, attach ref={(element) => scope(element)}.
 * // Animate after attachment, such as inside effect().
 * ```
 *
 * @module
 */
export { createAnimate } from './src/create-animate.ts';
export type {
  AnimationControls,
  AnimationKeyframes,
  AnimationOptions,
  AnimationScope,
  AnimationTarget,
  ScopedAnimate,
} from './src/create-animate.ts';
