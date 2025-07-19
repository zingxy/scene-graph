import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container } from './scene/DisplayObject.js';
import { Minimap } from './scene/Minimap.js';

const canvas = document.querySelector('canvas');
const minimapCanvas = document.querySelector('#minimap');
const world = new SceneGraph(canvas);
const minimap = new Minimap(world, minimapCanvas);

window.world = world;

const loop = () => {
  world.render();
  minimap.render();
  requestAnimationFrame(loop);
};

loop();
