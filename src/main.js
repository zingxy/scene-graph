import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container, Shape } from './scene/DisplayObject.js';
import { getRandomColor, logger, addDragBehavior } from './scene/utils.js';
import { Ticker } from './scene/Ticker.js';
import Transformer from './scene/Transformer.js';

const canvas = document.querySelector('canvas');
const world = new SceneGraph(canvas);

// 创建 Ticker 实例，设置目标帧率为 60 FPS
const ticker = new Ticker(60);

Array.from({ length: 10 }).forEach((_, i) => {
  const smallCircle = Math.random() < 0.5 ? new Circle(50) : new Rect(100, 150);
  // smallCircle.rotation = Math.random() * 2 * Math.PI;
  smallCircle.fill = getRandomColor();
  smallCircle.x = Math.random() * canvas.width;
  smallCircle.y = Math.random() * canvas.height;

  // 为每个小圆形添加拖拽行为
  // addDragBehavior(smallCircle);

  world.stage.addChild(smallCircle);
});

// 使用 Ticker 来控制渲染循环
ticker.add((deltaTime, currentTime) => {
  world.render();
});

// 启动 ticker
ticker.start();

window.world = world;
window.ticker = ticker;
