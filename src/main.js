import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container } from './scene/DisplayObject.js';
import { getRandomColor, logger, addDragBehavior } from './scene/utils.js';
import { Ticker } from './scene/Ticker.js';
import Transformer from './scene/Transformer.js';

const canvas = document.querySelector('canvas');
const world = new SceneGraph(canvas);
// const minimap = new Minimap(world, minimapCanvas);

// 创建 Ticker 实例，设置目标帧率为 60 FPS
const ticker = new Ticker(60);
const transformer = new Transformer();
const mainCircle = new Circle(100, 200);
mainCircle.rotation = Math.PI / 4; // 设置倾斜角度
mainCircle.on('pointerdown', (event) => {
  transformer.addShape(mainCircle);
});

// 为每个圆形添加拖拽功能的函数

// 为主圆形添加拖拽行为
addDragBehavior(mainCircle);

Array.from({ length: 10 }).forEach((_, i) => {
  const smallCircle = Math.random() < 0.5 ? new Circle(50) : new Rect(30, 50);
  smallCircle.fill = getRandomColor();
  smallCircle.x = Math.random() * canvas.width;
  smallCircle.y = Math.random() * canvas.height;

  // 为每个小圆形添加拖拽行为
  addDragBehavior(smallCircle);

  world.stage.addChild(smallCircle);
});

const container = new Container();
container.addChild(mainCircle);
container.x = 500;
container.y = 500;
world.stage.addChild(container);
transformer.zIndex = 100;
world.stage.addChild(transformer);

// 使用 Ticker 来控制渲染循环
ticker.add((deltaTime, currentTime) => {
  world.render();
});

// 启动 ticker
ticker.start();

window.world = world;
window.mainCircle = mainCircle;
window.ticker = ticker;
