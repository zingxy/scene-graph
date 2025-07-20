import { Camera } from './Camera.js';
import { Container, Shape } from './DisplayObject.js';
import { drawCoordinateSystem } from './utils.js';

export class SceneGraph {
  constructor(canvas) {
    this.canvas = canvas;
    /**@type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext('2d');
    this.shapes = [];
    this.camera = new Camera(this);
    this.stage = new Container();
    this.init();
  }

  init() {
    this.resize();
    this.bindEvents();
  }

  worldToStage(worldX, worldY) {
    const worldPoint = new DOMPoint(worldX, worldY);
    const stagePoint = this.stage.transformMatrix
      .inverse()
      .transformPoint(worldPoint);
    return stagePoint;
  }

  wrapEvent(event) {
    const { offsetX: viewportX, offsetY: viewportY } = event;

    const worldPoint = this.camera.viewportToWorld(viewportX, viewportY);
    const stagePoint = this.worldToStage(worldPoint.x, worldPoint.y);
    return { worldPoint, stagePoint, originalEvent: event };
  }

  bindEvents() {
    // TODO: 实现捕获、冒泡
    this.canvas.addEventListener('click', (e) => {
      const wrappedEvent = this.wrapEvent(e);
      // 触发全局click 事件
      this.stage.children.forEach((child) => {
        child.emit('global:click', wrappedEvent);
      });

      // 触发所有子对象的点击事件
      this.stage.children.forEach((child) => {
        if (child.hitTest(wrappedEvent.worldPoint)) {
          child.emit('click', wrappedEvent);
        }
      });
    });

    this.canvas.addEventListener('mousemove', (e) => {
      // 触发全局 mousemove 事件
      this.stage.children.forEach((child) => {
        child.emit('global:mousemove', this.wrapEvent(e));
      });
      const wrappedEvent = this.wrapEvent(e);
      this.stage.children.forEach((child) => {
        if (child.hitTest(wrappedEvent.worldPoint)) {
          child.emit('mousemove', wrappedEvent);
        }
      });
    });
    this.canvas.addEventListener('mousedown', (e) => {
      // 触发全局 mousedown 事件
      this.stage.children.forEach((child) => {
        child.emit('global:mousedown', this.wrapEvent(e));
      });
      const wrappedEvent = this.wrapEvent(e);
      this.stage.children.forEach((child) => {
        if (child.hitTest(wrappedEvent.worldPoint)) {
          child.emit('mousedown', wrappedEvent);
        }
      });
    });
    this.canvas.addEventListener('mouseup', (e) => {
      // 触发全局 mouseup 事件
      this.stage.children.forEach((child) => {
        child.emit('global:mouseup', this.wrapEvent(e));
      });
      const wrappedEvent = this.wrapEvent(e);
      this.stage.children.forEach((child) => {
        if (child.hitTest(wrappedEvent.worldPoint)) {
          child.emit('mouseup', wrappedEvent);
        }
      });
    });
  }
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
      root.render(this.ctx);
      drawCoordinateSystem(this.ctx);
      this.ctx.restore();
      return;
    }
    // make progress

    this.ctx.save();
    this.ctx.transform(a, b, c, d, e, f);
    drawCoordinateSystem(this.ctx);
    this.ctx.restore();

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
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换矩阵
    this.ctx.save();
    this.ctx.setTransform(this.camera.transformMatrix);
    this.renderSceneGraph(this.stage);
    this.ctx.restore();
  }
}
