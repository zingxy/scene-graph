import './style.css';
import { SceneGraph } from './scene/world.js';
import { Circle, Rect, Container } from './scene/DisplayObject.js';

const canvas = document.querySelector('canvas');

const world = new SceneGraph(canvas);

const circle = new Circle(100);
circle.transformMatrix = new DOMMatrix().translate(500, 200);
world.stage.addChild(circle);

const container = world.stage.addChild(new Container());
container.transformMatrix = new DOMMatrix().translate(100, 100).rotate(45);

const containerA = world.stage.addChild(new Container());
containerA.transformMatrix = new DOMMatrix().translate(200, 100).rotate(-45);

world.render();

canvas.addEventListener('click', (e) => {
  const stageWorldMatrix = world.stage.transformMatrix;
  const containerWorldMatrix = stageWorldMatrix.multiply(
    container.transformMatrix
  );
  const containerAWorldMatrix = stageWorldMatrix.multiply(
    containerA.transformMatrix
  );
  const worldPoint = stageWorldMatrix.transformPoint(new DOMPoint(500, 200));
  const localPoint = containerWorldMatrix
    .invertSelf()
    .transformPoint(worldPoint);
  const localPointA = containerAWorldMatrix
    .invertSelf()
    .transformPoint(worldPoint);

  console.log('Stage Point:', 500, 200);
  console.log('World Point:', worldPoint);
  console.log('Local Point in Container:', localPoint);
  console.log('Local P  oint in Container A:', localPointA);
  const circleInContainer = container.addChild(new Circle(30, 'red'));
  circleInContainer.transformMatrix = new DOMMatrix().translate(
    localPoint.x,
    localPoint.y
  );
  const circleInContainerA = containerA.addChild(new Circle(20, 'blue'));
  circleInContainerA.transformMatrix = new DOMMatrix().translate(
    localPointA.x,
    localPointA.y
  );
});

window.world = world;

const loop = () => {
  world.render();
  requestAnimationFrame(loop);
};

loop();
