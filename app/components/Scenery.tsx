'use client';

import { useEffect, useRef } from 'react';
import { DEFAULT_SCENE, sceneById } from './scenes';

// Decorative background behind every page. The drawings live in scenes/ (one file per scene, listed in
// scenes/index.ts) and are built in the browser after the page loads, so they add nothing to the page
// HTML. Colours come from the palette in globals.css for the scene's data-style and data-time; the
// time of day follows the app theme (each scene says which palette goes with which theme).

// Deterministic so the server and client render the same thing
const PETALS = [
  { x: '98%', s: '11px', d: '15s', delay: '-1s', drift: '-55vw' },
  { x: '88%', s: '9px', d: '19s', delay: '-8s', drift: '-48vw' },
  { x: '78%', s: '13px', d: '17s', delay: '-4s', drift: '-60vw' },
  { x: '70%', s: '8px', d: '21s', delay: '-12s', drift: '-42vw' },
  { x: '94%', s: '10px', d: '16s', delay: '-14s', drift: '-52vw' },
  { x: '62%', s: '12px', d: '20s', delay: '-6s', drift: '-38vw' },
  { x: '84%', s: '9px', d: '14s', delay: '-10s', drift: '-50vw' },
  { x: '104%', s: '12px', d: '18s', delay: '-3s', drift: '-65vw' },
  { x: '74%', s: '10px', d: '22s', delay: '-16s', drift: '-44vw' },
  { x: '92%', s: '8px', d: '13s', delay: '-7s', drift: '-46vw' },
  { x: '56%', s: '11px', d: '19s', delay: '-11s', drift: '-34vw' },
  { x: '100%', s: '9px', d: '23s', delay: '-18s', drift: '-58vw' },
];

export default function Scenery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage) return;

    let built: string | null = null;
    let width = 0;
    let height = 0;

    const update = () => {
      // Not drawn at all while the scenery is switched off
      if (document.documentElement.dataset.scene === 'off') return;

      const root = document.documentElement;
      const scene = sceneById(root.dataset.sceneStyle);
      container.dataset.style = scene.id;
      container.dataset.time = scene.timeFor(root.dataset.theme === 'day' ? 'day' : 'night');

      const vw = window.innerWidth;
      // Phone browsers change the height as the address bar hides and shows. Keep the tallest height
      // seen at this width so the scene isn't resized (and repainted) on every scroll.
      const vh = vw === width ? Math.max(height, window.innerHeight) : window.innerHeight;
      const layout = scene.layoutFor(vw, vh);
      const key = `${scene.id}:${layout.name}`;
      if (vw === width && vh === height && built === key) return;
      width = vw;
      height = vh;

      if (built !== key) {
        scene.build(stage, layout);
        built = key;
        stage.dataset.ready = 'true';
      }
      // Cover the viewport, anchored to the bottom so the trees and pagoda are never cropped
      const scale = Math.max(vw / layout.W, vh / layout.H);
      stage.style.width = `${layout.W * scale}px`;
      stage.style.height = `${layout.H * scale}px`;
    };

    update();
    window.addEventListener('resize', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scene', 'data-scene-style', 'data-theme'] });

    return () => {
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="scenery" data-style={DEFAULT_SCENE.id} data-time={DEFAULT_SCENE.timeFor('night')} aria-hidden="true">
      <div ref={stageRef} className="scenery-stage" />
      <div className="petals">
        {PETALS.map((petal, i) => (
          <span
            key={i}
            className="petal"
            style={
              {
                '--x': petal.x,
                '--s': petal.s,
                '--d': petal.d,
                '--delay': petal.delay,
                '--drift': petal.drift,
              } as React.CSSProperties
            }
          >
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}
