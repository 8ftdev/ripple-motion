# @8ft/ripple-motion

A small `createAnimate()` adapter over the public `animate` export from `motion/mini`. It gives a Ripple component a callback ref, scoped selectors, Motion playback controls, and automatic animation cleanup when the ref detaches. The helper has no React imports and implements no animation engine of its own.

## Use in an existing Ripple project

After the first JSR publication, install the package in an existing Ripple project:

```sh
npx jsr add @8ft/ripple-motion
```

Motion mini is included as a dependency. See `examples/Card.tsrx` for a complete mount animation that respects reduced motion. The public entry point is `mod.ts`; JSR generates the JavaScript and declarations for npm consumers.

```tsx
import { effect } from 'ripple';
import { createAnimate } from '@8ft/ripple-motion';

export function List() @{
  const [scope, animate] = createAnimate<HTMLUListElement>();

  effect(() => {
    animate('.item', {
      opacity: [0, 1],
      transform: ['translateY(12px)', 'translateY(0px)'],
    }, { duration: 0.25, ease: 'easeOut' });
  });

  <ul ref={(element) => scope(element)}>
    <li class="item">Hello from Ripple</li>
  </ul>
}
```

Use the explicit callback `ref={(element) => scope(element)}` with the linked Ripple compiler. At that commit, `ref={scope}` for this destructured `const` compiles to an assignment to the constant. The wrapper compiles correctly and returns the cleanup function Ripple invokes on detach.

## Behavior

- Call `createAnimate()` once in each component that owns a scope.
- `scope.current` is the mounted element, or `null` before attachment and after detachment. It is a plain getter, not reactive state.
- String selectors match descendants of that element. To animate the root, pass `scope.current`. Explicit elements and collections pass through to Motion, including targets outside the scope.
- Call `animate()` after the ref attaches, such as inside Ripple's `effect()`. Calling it before attachment or after detachment throws a descriptive error.
- Motion keyframes, options, and controls are forwarded. Timing uses seconds: `duration: 0.25` means 250 ms. Controls can be awaited and support `play()`, `pause()`, `stop()`, and `cancel()`.
- Detachment permanently stops and cancels every animation created through this helper, including replayed controls and explicit external targets. Unrelated animations remain running. Remounting clears the previous binding, and an old cleanup cannot detach the new one.
- Completed controls are retained until detach so replayed animations remain owned by the scope. A long-lived component with many animation calls retains those controls for its mounted lifetime.
- The helper can be imported during SSR. Ripple's server `effect()` does not run the animation; mounting or hydration starts it in the browser. Keep browser calls inside the effect or event handler.

This uses Motion's mini API. Use a complete CSS `transform` value for transforms, as shown above. It does not add independent `x`/`y` transforms, timeline sequences, layout animation, or automatic exit presence. Exit animation can be awaited before your component removes an element.

WAAPI can run eligible animations on the compositor. Property choice and browser behavior still matter; `opacity` and `transform` are useful defaults. See [Motion's mini animation API](https://motion.dev/docs/animate), [performance guidance](https://motion.dev/docs/performance), and the original [React useAnimate scope/cleanup API](https://motion.dev/docs/react-use-animate).

## Verification and size

Verified with Motion **14.1.0** and Ripple source at [be48601f488acd0644cc06ba3e7d7a37e88c5b17](https://github.com/Ripple-TS/ripple/commit/be48601f488acd0644cc06ba3e7d7a37e88c5b17). At verification time, `ripple@0.5.0` was unavailable on npm, so the exact source compiler and runtime were used. Your Ripple application must provide its compiler/build setup; this package supplies only the helper.

Strict TypeScript compilation, **3 server tests**, and **39 browser tests across Chromium, Firefox, and WebKit** pass (13 tests per browser). They cover mounting, hydration preserving existing DOM, reduced motion in the Card example, scoping, playback, remounts, and cleanup.

Firefox initially exited during startup with `Could not find profile folder` on macOS 27.0.1. The [Mozilla bug report's app-data workaround](https://bugzilla.mozilla.org/show_bug.cgi?id=2060476#c7) resolves this: create an isolated test app-data directory and pass its absolute path as `MOZ_APP_DATA` in Firefox's launch environment. The test configuration uses `.test/firefox-app-data` on macOS. Firefox 155.0 then launches successfully and passes all 13 tests; the adapter implementation is unchanged.

The measured minified bundle is **8,902 bytes**, or **3,563 bytes gzip**, including Motion mini. The same build of Motion mini alone is **3,347 bytes gzip**, so this adapter adds **216 bytes gzip** in that comparison. No React code is included. These are local measurements with esbuild 0.28.2 targeting ES2022; dependency versions and bundler settings affect the result. The documented 2.3 kB mini figure is not this combined build's measured size.

`validation.json` records the versions, source hash, checks, and measurement method.

## Publishing

The SSH remote is `git@github.com:8ftdev/ripple-motion.git`. The package is `@8ft/ripple-motion`, version `0.1.0`, under the MIT license.

Before the first publish, create the package on JSR if necessary and link its GitHub repository to `8ftdev/ripple-motion` in the package settings. The publishing actor must satisfy the JSR scope publishing settings. See [JSR GitHub Actions publishing](https://jsr.io/docs/publishing-packages#publishing-from-github-actions).

The `Publish` workflow installs the locked dependencies with `npm ci --ignore-scripts`, then runs `npx jsr publish` on pushes to `main`, using GitHub OIDC (`id-token: write`) with no registry token secret. Installing dependencies is required because the JSR CLI resolves `motion/mini` through `node_modules`. Update `jsr.json` before each new release; an already-published version is skipped by the CLI.

For a local check, run `npm ci --ignore-scripts`, `npm run check`, and `npm run publish:check`. The last command validates the package without publishing a version.
