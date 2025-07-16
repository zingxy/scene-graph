class DisplayObject {
  constructor() {
    this.transformMatrix = new DOMMatrix();
  }
}

class Container extends DisplayObject {
  constructor() {
    super();
    this.children = [];
  }
  addChild(child) {
    this.children.push(child);
    return child;
  }
}

class Shape extends DisplayObject {
  constructor() {
    super();
  }
  render(ctx) {}
}

export class Circle extends Shape {
  constructor(radius) {
    super();
    this.radius = radius;
  }
  render(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Rect extends Shape {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;
  }
  render(ctx) {
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.fill();
  }
}

export class Camera extends DisplayObject {
  constructor(world) {
    super();
    this.world = world;
    const ctx = world.ctx;
    this.ctx = ctx;
    this.bindEvents();
  }
  bindEvents() {
    const canvas = this.ctx.canvas;
    const ctx = this.ctx;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStart.x = e.offsetX;
      dragStart.y = e.offsetY;
    });

    canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const offsetX = e.offsetX - dragStart.x;
        const offsetY = e.offsetY - dragStart.y;
        dragStart.x = e.offsetX;
        dragStart.y = e.offsetY;
        const dpr = 1;
        const T = new DOMMatrix([1, 0, 0, 1, offsetX * dpr, offsetY * dpr]);
        const ctm = ctx.getTransform();

        ctx.setTransform(T.multiplySelf(ctm));
      }
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        let scale = 1;
        // Adjust scale
        if (e.deltaY < 0) {
          scale *= zoomFactor;
        } else {
          scale /= zoomFactor;
        }
        const dpr = window.devicePixelRatio;
        const mouseX = e.offsetX * dpr;
        const mouseY = e.offsetY * dpr;
        const T = new DOMMatrix([1, 0, 0, 1, -mouseX, -mouseY]);
        const S = new DOMMatrix([scale, 0, 0, scale, 0, 0]);
        const T2 = new DOMMatrix([1, 0, 0, 1, mouseX, mouseY]);

        const ctm = ctx.getTransform();

        ctx.setTransform(T2.multiply(S).multiply(T).multiply(ctm));

      },
      { passive: false }
    );
  }
}
export class SceneGraph {
  constructor(canvas) {
    this.canvas = canvas;
    /**@type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext('2d');
    this.shapes = [];
    this.camera = new Camera(canvas);
    this.stage = new Container();
    this.init();
  }

  init() {
    this.resize();
  }
  bindEvents() {}
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
  }

  renderSceneGraph(root) {
    // base case
    if (!root) return;
    const { a, b, c, d, e, f } = root.transformMatrix;
    if (root instanceof Shape) {
      this.ctx.save();
      this.ctx.transform(a, b, c, d, e, f);
      drawCoordinateSystem(this.ctx);
      root.render(this.ctx);
      this.ctx.restore();
      return;
    }
    // make progress
    for (const child of root.children) {
      this.ctx.save();
      this.ctx.transform(a, b, c, d, e, f);
      drawCoordinateSystem(this.ctx);
      this.renderSceneGraph(child);
      this.ctx.restore();
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderSceneGraph(this.stage);
  }
}
export function drawCoordinateSystem(ctx) {
  // 设定坐标系的中心
  const centerX = 0;
  const centerY = 0;

  // 坐标轴长度
  const axisLength = 200;
  // 绘制箭头函数
  function drawArrow(x, y, axis) {
    const arrowSize = 10; // 箭头大小
    ctx.beginPath();

    if (axis === 'x') {
      // X 轴箭头：右侧箭头
      ctx.moveTo(x - arrowSize, y - arrowSize / 2); // 左侧箭头
      ctx.lineTo(x, y);
      ctx.lineTo(x - arrowSize, y + arrowSize / 2); // 右侧箭头
    } else if (axis === 'y') {
      // Y 轴箭头：下侧箭头
      ctx.moveTo(x - arrowSize / 2, y - arrowSize); // 上侧箭头
      ctx.lineTo(x, y);
      ctx.lineTo(x + arrowSize / 2, y - arrowSize); // 下侧箭头
    }

    ctx.stroke();
  }
  // 设置样式
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 2; // 设置线条宽度
  ctx.strokeStyle = 'red'; // 坐标轴颜色
  ctx.fillStyle = 'red'; // 文本颜色
  ctx.font = '16px Arial';

  // 绘制 X 轴（水平）
  ctx.beginPath();
  ctx.moveTo(centerX - 10, centerY); // 从左边开始
  ctx.lineTo(centerX + axisLength, centerY); // 到右边结束
  ctx.stroke();
  // 绘制 X 轴箭头（指向右侧）
  drawArrow(centerX + axisLength, centerY, 'x');
  ctx.fillText('X', centerX + axisLength + 10, centerY - 10);

  ctx.strokeStyle = 'blue'; // 坐标轴颜色
  ctx.fillStyle = 'blue'; // 文本颜色
  // 绘制 Y 轴（垂直）
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 10); // 从上面开始
  ctx.lineTo(centerX, centerY + axisLength); // 到下面结束
  ctx.stroke();
  // 绘制 Y 轴箭头（指向下方）
  drawArrow(centerX, centerY + axisLength, 'y');

  // 添加轴标签
  ctx.fillText('Y', centerX - 10, centerY + axisLength + 20);
  ctx.restore();
}
