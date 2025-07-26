import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container } from './scene/DisplayObject.js';
import { Minimap } from './scene/Minimap.js';
import { getRandomColor } from './scene/utils.js';
import { Ticker } from './scene/Ticker.js';

const canvas = document.querySelector('canvas');
const minimapCanvas = document.querySelector('#minimap');
const world = new SceneGraph(canvas);
// const minimap = new Minimap(world, minimapCanvas);

// 创建 Ticker 实例，设置目标帧率为 60 FPS
const ticker = new Ticker(60);

// 创建第一个大圆形
const mainCircle = new Circle(50);
mainCircle.transformMatrix.translateSelf(100, 100);

// 为每个圆形添加拖拽功能的函数
function addDragBehavior(circle) {
  let isDragging = false;
  let lastPosition = { x: 0, y: 0 };

  circle.on('click', () => {
    console.log('Circle clicked');
    circle.fill = `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')}`;
  });

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

Array.from({ length: 10000 }).forEach((_, i) => {
  const smallCircle = new Circle(30);
  smallCircle.fill = getRandomColor();
  smallCircle.transformMatrix.translateSelf(
    Math.random() * canvas.width,
    Math.random() * canvas.height
  );
  smallCircle.transformMatrix.translateSelf(100, 100);

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
  // minimap.render();

  // 可以在这里添加其他需要每帧执行的逻辑
  // console.log(`FPS: ${ticker.getFPS()}, Delta: ${deltaTime.toFixed(2)}ms`);
});

// 启动 ticker
ticker.start();

// 添加一些调试功能
let fpsDisplay = document.createElement('div');
fpsDisplay.style.position = 'fixed';
fpsDisplay.style.top = '10px';
fpsDisplay.style.left = '10px';
fpsDisplay.style.background = 'rgba(0,0,0,0.7)';
fpsDisplay.style.color = 'white';
fpsDisplay.style.padding = '10px';
fpsDisplay.style.fontFamily = 'monospace';
fpsDisplay.style.fontSize = '12px';
fpsDisplay.style.zIndex = '1000';
document.body.appendChild(fpsDisplay);

// 更新 FPS 显示
ticker.add(() => {
  fpsDisplay.innerHTML = `
    Target FPS: ${ticker.targetFPS}<br>
    Current FPS: ${ticker.getFPS()}<br>
    Delta Time: ${ticker.getDeltaTime().toFixed(2)}ms<br>
    <button onclick="window.ticker.setTargetFPS(30)">30 FPS</button>
    <button onclick="window.ticker.setTargetFPS(60)">60 FPS</button>
    <button onclick="window.ticker.setTargetFPS(15)">15 FPS</button>
  `;
}, -1); // 低优先级，最后执行

window.world = world;
window.ticker = ticker;
