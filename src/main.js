import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container } from './scene/DisplayObject.js';
import { Minimap } from './scene/Minimap.js';

const canvas = document.querySelector('canvas');
const minimapCanvas = document.querySelector('#minimap');
const world = new SceneGraph(canvas);
const minimap = new Minimap(world, minimapCanvas);

let lastPosition = { x: 0, y: 0 };
let isDragging = false;

const circle1 = new Circle(50);
circle1.transformMatrix.translateSelf(100, 100);
circle1.on('click', () => {
  console.log('Circle clicked');
  circle1.fill = `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;
  circle1.markDirty();
});
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

Array.from({ length: 50 }).forEach((_, i) => {
  const circle = new Circle(30);
  circle.transformMatrix.translateSelf(
    Math.random() * 1.5 * world.canvas.width,
    Math.random() * 1.5 * world.canvas.height
  );
  circle.on('click', (event) => {
    console.log(`Circle ${i} clicked:`, event.worldPoint);
  });
  world.stage.addChild(circle);
});

const container = new Container();
container.addChild(circle1);
container.transformMatrix.translateSelf(50, 50);
world.stage.addChild(container);

const loop = () => {
  world.render();
  minimap.render();
  requestAnimationFrame(loop);
};

loop();
window.world = world;
