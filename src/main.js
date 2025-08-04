import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container } from './scene/DisplayObject.js';
import { Minimap } from './scene/Minimap.js';
import { getRandomColor, logger } from './scene/utils.js';
import { Ticker } from './scene/Ticker.js';

const canvas = document.querySelector('canvas');
const minimapCanvas = document.querySelector('#minimap');
const world = new SceneGraph(canvas);
// const minimap = new Minimap(world, minimapCanvas);

// 创建 Ticker 实例，设置目标帧率为 60 FPS
const ticker = new Ticker(60);

// 创建第一个大圆形
const mainCircle = new Circle(50);
mainCircle.transformMatrix.translateSelf(800, 200);

// 为每个圆形添加拖拽功能的函数
function addDragBehavior(circle) {
  let isDragging = false;
  let lastPosition = { x: 0, y: 0 };

  circle.on('mousedown', (event) => {
    lastPosition = event.worldPoint;
    isDragging = true;
  });

  circle.on('global:mousemove', (event) => {
    if (!isDragging) return;
    const dx = event.worldPoint.x - lastPosition.x;
    const dy = event.worldPoint.y - lastPosition.y;
    const translation = new DOMMatrix([1, 0, 0, 1, dx, dy]);
    circle.transformMatrix = translation.multiply(circle.transformMatrix);
    lastPosition = event.worldPoint;
  });

  circle.on('global:mouseup', (event) => {
    isDragging = false;
  });
}

// 为主圆形添加拖拽行为
addDragBehavior(mainCircle);

Array.from({ length: 20000 }).forEach((_, i) => {
  const smallCircle = new Circle(30);
  smallCircle.fill = getRandomColor();
  smallCircle.position.x = Math.random() * canvas.width;
  smallCircle.position.y = Math.random() * canvas.height;

  // 为每个小圆形添加拖拽行为
  addDragBehavior(smallCircle);

  world.stage.addChild(smallCircle);
});

const container = new Container();
container.addChild(mainCircle);
container.transformMatrix.translateSelf(50, 50);
world.stage.addChild(container);

// 使用 Ticker 来控制渲染循环
ticker.add((deltaTime, currentTime) => {
  world.render();
});

// 启动 ticker
ticker.start();

window.world = world;
window.mainCircle = mainCircle;
window.ticker = ticker;
