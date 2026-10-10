import { animate as animateMini } from 'motion/mini';

export type AnimationTarget = Parameters<typeof animateMini>[0];
export type AnimationKeyframes = Parameters<typeof animateMini>[1];
export type AnimationOptions = Parameters<typeof animateMini>[2];
export type AnimationControls = ReturnType<typeof animateMini>;
export type ScopedAnimate = typeof animateMini;

export interface AnimationScope<T extends Element = HTMLElement> {
  (element: T): () => void;
  readonly current: T | null;
}

/**
 * Create a Ripple callback ref and a Motion-mini animate function.
 * String selectors match descendants of the mounted ref. Explicit targets
 * are passed through to Motion. Detaching the ref stops its owned animations.
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
