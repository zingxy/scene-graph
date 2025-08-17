import './style.css';
import { SceneGraph } from './scene/World.js';
import { Circle, Rect, Container, Shape } from './scene/DisplayObject.js';
import { getRandomColor, logger, addDragBehavior } from './scene/utils.js';
import { Ticker } from './scene/Ticker.js';
import Transformer from './scene/Transformer.js';

const canvas = document.querySelector('canvas');
const world = new SceneGraph(canvas);
// const minimap = new Minimap(world, minimapCanvas);

// 创建 Ticker 实例，设置目标帧率为 60 FPS
const ticker = new Ticker(60);
const transformer = new Transformer();

world.selectTool.on('selection:changed', (selectBox) => {
  logger.info('Selection changed:', selectBox);
  transformer.shapes = [];
  const selectedShapes = world.rtree.search({
    minX: selectBox.x,
    minY: selectBox.y,
    maxX: selectBox.x + selectBox.width,
    maxY: selectBox.y + selectBox.height,
  });
  const selectedIds = selectedShapes.map((shape) => shape.id);
  world.stage.top2Bottom((node) => {
    if (
      node instanceof Shape &&
      selectedIds.includes(node.id) &&
      node !== selectBox
    ) {
      transformer.addShape(node);
    }
  });
});

Array.from({ length: 10 }).forEach((_, i) => {
  const smallCircle = Math.random() < 0.5 ? new Circle(50) : new Rect(30, 80);
  smallCircle.fill = getRandomColor();
  smallCircle.x = Math.random() * canvas.width;
  smallCircle.y = Math.random() * canvas.height;

  // 为每个小圆形添加拖拽行为
  // addDragBehavior(smallCircle);

  world.stage.addChild(smallCircle);
});

transformer.zIndex = 100;
world.stage.addChild(transformer);

// 使用 Ticker 来控制渲染循环
ticker.add((deltaTime, currentTime) => {
  world.render();
});

// 启动 ticker
ticker.start();

window.world = world;
window.ticker = ticker;
