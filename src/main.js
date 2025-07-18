import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container } from './scene/DisplayObject.js';
import { Camera } from './scene/Camera.js';

const canvas = document.querySelector('canvas');
const minimapCanvas = document.querySelector('#minimap');
const world = new SceneGraph(canvas);
const minimap = new SceneGraph(minimapCanvas);

const circle = new Circle(100);
circle.transformMatrix = new DOMMatrix().translate(500, 200);
world.stage.addChild(circle);

const containerB = world.stage.addChild(new Container());
containerB.transformMatrix = new DOMMatrix().translate(100, 100).rotate(45);

const containerA = world.stage.addChild(new Container());
containerA.transformMatrix = new DOMMatrix().translate(200, 100).rotate(-45);
/*
canvas.addEventListener('click', (e) => {
  const stageWorldMatrix = world.stage.transformMatrix;
  const containerBWorldMatrix = stageWorldMatrix.multiply(
    containerB.transformMatrix
  );
  const containerAWorldMatrix = stageWorldMatrix.multiply(
    containerA.transformMatrix
  );
  const worldPoint = stageWorldMatrix.transformPoint(new DOMPoint(500, 200));
  const localPointB = containerBWorldMatrix
    .invertSelf()
    .transformPoint(worldPoint);
  const localPointA = containerAWorldMatrix
    .invertSelf()
    .transformPoint(worldPoint);

  console.log('Stage Point:', 500, 200);
  console.log('World Point:', worldPoint);
  console.log('Local Point in Container B:', localPointB);
  console.log('Local Point in Container A:', localPointA);
  const circleInContainer = containerB.addChild(new Circle(30, 'red'));
  circleInContainer.transformMatrix = new DOMMatrix().translate(
    localPointB.x,
    localPointB.y
  );
  const circleInContainerA = containerA.addChild(new Circle(20, 'blue'));
  circleInContainerA.transformMatrix = new DOMMatrix().translate(
    localPointA.x,
    localPointA.y
  );
});
*/
canvas.addEventListener('click', (e) => {
  // 使用Camera的坐标转换方法
  const { offsetX, offsetY } = e;

  // 将viewport坐标转换为世界坐标
  const worldPoint = world.camera.viewportToWorld(offsetX, offsetY);

  // 将世界坐标转换为stage本地坐标
  const stagePoint = world.stage.transformMatrix
    .inverse()
    .transformPoint(worldPoint);

  const dot = world.stage.addChild(new Circle(30, 'green'));
  dot.transformMatrix = new DOMMatrix().translate(stagePoint.x, stagePoint.y);

  // 调试信息
  console.log('Viewport:', offsetX, offsetY);
  console.log('World:', worldPoint.x, worldPoint.y);
  console.log('Stage:', stagePoint.x, stagePoint.y);
});

const viewportRect = minimap.stage.addChild(
  new Rect(canvas.width, canvas.height)
);
minimap.stage.addChild(world.stage);

window.world = world;

const loop = () => {
  world.render();
  minimap.render();
  viewportRect.transformMatrix = world.camera.transformMatrix.inverse();
  requestAnimationFrame(loop);
};

loop();
