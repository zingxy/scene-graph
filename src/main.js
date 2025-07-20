import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container } from './scene/DisplayObject.js';
import { Minimap } from './scene/Minimap.js';

const canvas = document.querySelector('canvas');
const minimapCanvas = document.querySelector('#minimap');
const world = new SceneGraph(canvas);
const minimap = new Minimap(world, minimapCanvas);

const circle1 = new Circle(20);
circle1.transformMatrix.translateSelf(100, 100);
let lastPosition = { x: 0, y: 0 };
let isDragging = false;
circle1.on('mousedown', (event) => {
  lastPosition = event.worldPoint;
  isDragging = true;
});
circle1.on('global:mousemove', (event) => {
  if (!isDragging) return;
  const dx = event.worldPoint.x - lastPosition.x;
  const dy = event.worldPoint.y - lastPosition.y;
  const translation = new DOMMatrix([1, 0, 0, 1, dx, dy]);
  circle1.transformMatrix = translation.multiply(circle1.transformMatrix);
  lastPosition = event.worldPoint;
});
circle1.on('global:mouseup', (event) => {
  isDragging = false;
});

const circle2 = new Circle(20);
circle2.transformMatrix.translateSelf(300, 400).rotateSelf(45);

world.stage.addChild(circle1);
world.stage.addChild(circle2);

const loop = () => {
  world.render();
  minimap.render();
  requestAnimationFrame(loop);
};

loop();
window.world = world;
