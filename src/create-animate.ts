import { animate as animateMini } from 'motion/mini';

/**
 * A CSS selector, element, or element collection accepted by Motion mini.
 * {@link ScopedAnimate} resolves selectors within the mounted scope's descendants.
 * Explicit elements and collections can include targets outside that scope.
 */
export type AnimationTarget = Parameters<typeof animateMini>[0];

/**
 * A mapping of CSS properties to target values or keyframe arrays accepted by
 * Motion mini.
 * For transforms, supply a complete `transform` value, such as
 * `{ transform: ['translateY(12px)', 'translateY(0px)'] }`.
 */
export type AnimationKeyframes = Parameters<typeof animateMini>[1];

/**
 * Motion mini's animation options, including duration, delay, easing, and repeat.
 * Duration and delay are expressed in seconds; `duration: 0.25` means 250 ms.
 * Omit the options argument to use Motion's defaults.
 */
export type AnimationOptions = Parameters<typeof animateMini>[2];

/**
 * Awaitable playback controls returned by {@link ScopedAnimate}.
 * Use `play()`, `pause()`, `stop()`, or `cancel()` to control the animation.
 * The owning scope retains these controls until detach so replayed animations
 * are also stopped and cancelled during cleanup.
 */
export type AnimationControls = ReturnType<typeof animateMini>;

/**
 * A Motion mini animation function bound to an {@link AnimationScope}.
 * Selectors match descendants of the mounted element. Pass `scope.current`
 * as an explicit target to animate the scope element itself.
 *
 * Call after attaching the scope ref, such as inside a Ripple `effect()`.
 * Calling before attachment or after detachment throws an error.
 * Returns {@link AnimationControls} owned by the scope.
 */
export type ScopedAnimate = typeof animateMini;

/**
 * A Ripple callback ref that owns the animations created by {@link createAnimate}.
 * Attach with `ref={(element) => scope(element)}` in the Ripple component.
 * Ripple invokes the returned cleanup when the ref detaches.
 *
 * Attaching another element cleans up the previous binding. An old binding's
 * cleanup cannot detach a newer binding.
 *
 * @typeParam T The element type attached to the ref; defaults to `HTMLElement`.
 */
export interface AnimationScope<T extends Element = HTMLElement> {
  /**
   * Attach an element and return its cleanup function.
   * Cleanup stops and cancels all animations owned by this binding.
   *
   * @param element The mounted element that defines the selector scope.
   * @returns An idempotent cleanup function for this binding.
   */
  (element: T): () => void;

  /**
   * The mounted element, or `null` before attachment and after detachment.
   * This is a plain getter and does not track Ripple reactive dependencies.
   */
  readonly current: T | null;
}

/**
 * Create a Ripple callback ref and a scoped Motion mini animation function.
 * String selectors match descendants of the mounted ref. Explicit targets
 * are passed through to Motion. Detaching the ref stops and cancels its owned
 * animations, including completed animations that have been replayed.
 *
 * Call once per component and attach with `ref={(element) => scope(element)}`.
 * Start animations after attachment, such as inside Ripple's `effect()`.
 * Creating the pair is safe during SSR; animation calls require a mounted ref.
 *
 * @typeParam T The element type attached to the ref; defaults to `HTMLElement`.
 * @returns A readonly pair containing the scope callback ref and animate function.
 *
 * @example
 * ```ts
 * import { createAnimate } from '@8ft/ripple-motion';
 *
 * const [scope, animate] = createAnimate<HTMLDivElement>();
 * const element = document.createElement('div');
 * const cleanup = scope(element);
 *
 * await animate(element, { opacity: [0, 1] }, { duration: 0.25 });
 * cleanup();
 * ```
 */
export function createAnimate<T extends Element = HTMLElement>(): readonly [AnimationScope<T>, ScopedAnimate] {
  type Binding = { element: T; animations: Set<AnimationControls> };
  let binding: Binding | null = null;

  function detach(owner: Binding) {
    if (binding === owner) binding = null;
    for (const animation of owner.animations) {
      try {
        animation.stop();
      } catch {
        // Hidden elements cannot commit styles. Cancel before stopping the
        // rest of the group so all controls become permanently stopped.
        animation.cancel();
        animation.stop();
      } finally {
        // Motion's stop can skip cancellation for completed/replayed handles.
        animation.cancel();
      }
    }
    owner.animations.clear();
  }

  const scope = ((element: T) => {
    if (binding) detach(binding);
    const owner: Binding = { element, animations: new Set() };
    binding = owner;
    return () => detach(owner);
  }) as AnimationScope<T>;

  Object.defineProperty(scope, 'current', { get: () => binding?.element ?? null });

  const animate: ScopedAnimate = (target, keyframes, options) => {
    const owner = binding;
    if (!owner) {
      throw new Error('Attach the scope ref before calling animate.');
    }
    const elements = typeof target === 'string' ? owner.element.querySelectorAll(target) : target;
    const controls = animateMini(elements, keyframes, options);
    // Retain controls until detach so completed animations that are replayed
    // are still owned by this scope and cleaned up.
    owner.animations.add(controls);
    return controls;
  };

  return [scope, animate] as const;
}
