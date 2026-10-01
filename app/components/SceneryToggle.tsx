'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_SCENE, SCENE_LIST, SCENERY_STORAGE_KEY, currentSceneChoice } from './scenes';

// Cycles the background: each scene in turn, then off. The choice lives on <html> (see scenes/index.ts)
// and a script in layout.tsx restores it before first paint; this component watches and changes it.
const CHOICES = [...SCENE_LIST.map(scene => scene.id), 'off'];

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scene', 'data-scene-style'] });
  return () => observer.disconnect();
}

export default function SceneryToggle() {
  const choice = useSyncExternalStore(subscribe, currentSceneChoice, () => DEFAULT_SCENE.id);
  const on = choice !== 'off';
  const next = CHOICES[(CHOICES.indexOf(choice) + 1) % CHOICES.length];

  const describe = (id: string) => (id === 'off' ? 'off' : (SCENE_LIST.find(scene => scene.id === id)?.label ?? id));

  const cycle = () => {
    const root = document.documentElement;
    if (next === 'off') {
      root.dataset.scene = 'off';
    } else {
      delete root.dataset.scene;
      root.dataset.sceneStyle = next;
    }
    try {
      localStorage.setItem(SCENERY_STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode): the choice just won't persist
    }
  };

  const label = `Background: ${describe(choice)}. Switch to ${describe(next)}`;

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg hover:bg-surface transition-colors text-fg-muted hover:text-fg"
      title={label}
      aria-label={label}
    >
      {/* five-petal blossom */}
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.2c1.7 1.6 2 3.5 0 5.6-2-2.1-1.7-4 0-5.6Z" />
        <path d="M20.1 9.1c-.5 2.3-2 3.5-4.8 2.8.6-2.8 2.5-3.5 4.8-2.8Z" />
        <path d="M17 19.4c-2-1.2-2.6-3-.9-5.4 2.3 1.6 2.6 3.6.9 5.4Z" />
        <path d="M7 19.4c-1.7-1.8-1.4-3.8.9-5.4 1.7 2.4 1.1 4.2-.9 5.4Z" />
        <path d="M3.9 9.1c2.3-.7 4.2 0 4.8 2.8-2.8.7-4.3-.5-4.8-2.8Z" />
        <circle cx="12" cy="12.2" r="1.3" fill="var(--app)" stroke="none" />
      </svg>
    </button>
  );
}
