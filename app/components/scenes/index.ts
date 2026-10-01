// Registry of background scenes. Each scene is a self-contained drawing: it picks a layout for the
// viewport shape and draws itself into the stage element. Scenery.tsx shows the one the viewer chose
// (the blossom button in the nav bar cycles through them, then off), or DEFAULT_SCENE.
//
// To add another style, write a new file here that exports a Scene, add it to ALL_SCENES, and give it
// palette blocks in globals.css scoped to `.scenery[data-style="<id>"][data-time="<time>"]`.

import { animeValley } from './animeValley';
import { sunsetValley } from './sunsetValley';

export interface SceneLayoutBase {
  /** changes when the scene must be redrawn for a different viewport shape */
  name: string;
  W: number;
  H: number;
}

export interface Scene {
  id: string;
  label: string;
  layoutFor(viewportWidth: number, viewportHeight: number): SceneLayoutBase;
  /** which of the scene's palettes to use with each app theme */
  timeFor(theme: 'night' | 'day'): string;
  /** Too slow to offer to viewers. The scene stays in the code but can't be picked or restored. */
  shelved?: boolean;
  build(stage: HTMLElement, layout: SceneLayoutBase): void;
}

// Every scene we have, including shelved ones
export const ALL_SCENES: Scene[] = [animeValley, sunsetValley];

// The ones viewers can actually get
export const SCENE_LIST: Scene[] = ALL_SCENES.filter(scene => !scene.shelved);

export const DEFAULT_SCENE: Scene = animeValley;

export function sceneById(id: string | undefined): Scene {
  return SCENE_LIST.find(scene => scene.id === id) ?? DEFAULT_SCENE;
}

// The viewer's choice is kept on <html>: data-scene="off" hides the scenery, data-scene-style picks
// the scene. Both are restored from localStorage ("scenery") by the script in layout.tsx.
export const SCENERY_STORAGE_KEY = 'scenery';

export function currentSceneChoice(): string {
  const root = document.documentElement;
  return root.dataset.scene === 'off' ? 'off' : sceneById(root.dataset.sceneStyle).id;
}
