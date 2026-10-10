import { effect } from 'ripple';
import { createAnimate } from '../src/create-animate.js';

export function Card() @{
  const [scope, animate] = createAnimate<HTMLElement>();

  effect(() => {
    const element = scope.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    animate(element, {
      opacity: [0, 1],
      transform: ['translateY(12px)', 'translateY(0px)'],
    }, { duration: 0.25, ease: 'easeOut' });
  });

  <section ref={(element) => scope(element)}>
    <h2>Hello from Ripple</h2>
    <p>This card animates when mounted or hydrated.</p>
  </section>
}
