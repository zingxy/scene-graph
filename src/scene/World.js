import { Camera } from './Camera.js';
import { Container, Shape } from './DisplayObject.js';
import { drawCoordinateSystem } from './utils.js';
import RBush from 'rbush';

export class SceneGraph {
  constructor(canvas) {
    this.canvas = canvas;
    /**@type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext('2d');
    this.shapes = new Map(); // 用于存储所有形状
    this.camera = new Camera(this);
    this.stage = new Container();
    this.rtree = new RBush();
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
      this.recursiveTriggerEvent(this.stage, 'global:click', wrappedEvent);
      this.recursiveTriggerEventWhenHit(this.stage, 'click', wrappedEvent);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const wrappedEvent = this.wrapEvent(e);
      // 触发全局mousemove 事件
      this.recursiveTriggerEvent(this.stage, 'global:mousemove', wrappedEvent);
      this.recursiveTriggerEventWhenHit(this.stage, 'mousemove', wrappedEvent);
    });
    this.canvas.addEventListener('mousedown', (e) => {
      const wrappedEvent = this.wrapEvent(e);
      // 触发全局mousedown 事件
      this.recursiveTriggerEvent(this.stage, 'global:mousedown', wrappedEvent);
      this.recursiveTriggerEventWhenHit(this.stage, 'mousedown', wrappedEvent);
    });
    this.canvas.addEventListener('mouseup', (e) => {
      const wrappedEvent = this.wrapEvent(e);
      // 触发全局mouseup 事件
      this.recursiveTriggerEvent(this.stage, 'global:mouseup', wrappedEvent);
      this.recursiveTriggerEventWhenHit(this.stage, 'mouseup', wrappedEvent);
    });
  }

  recursiveTriggerEvent(root, eventName, event) {
    if (!root) return;
    // 触发当前节点的事件
    root.emit(eventName, event);
    // 如果是容器，递归触发子节点的事件
    if (root instanceof Container) {
      for (const child of root.children) {
        this.recursiveTriggerEvent(child, eventName, event);
      }
    }
  }
  recursiveTriggerEventWhenHit(root, eventName, event) {
    if (!root) return;
    // 如果当前节点命中，触发事件
    if (root.hitTest(event.worldPoint)) {
      root.emit(eventName, event);
    }
    // 如果是容器，递归触发子节点的事件
    if (root instanceof Container) {
      for (const child of root.children) {
        this.recursiveTriggerEventWhenHit(child, eventName, event);
      }
    }
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
    // 在渲染的时候把形状存入 Map TODO: 好像不应该在这里做
    this.shapes.set(root.id, root);
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
  renderBounds(root) {
    if (!root) return;
    const bounds = root.getWorldBounds();
    this.ctx.save();
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY
    );
    this.ctx.restore();
    if (root instanceof Shape) {
      return;
    }
    for (const child of root.children) {
      this.renderBounds(child);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换矩阵
    this.ctx.save();
    this.ctx.setTransform(this.camera.transformMatrix);
    this.renderSceneGraph(this.stage);
    this.renderBounds(this.stage);
    this.ctx.restore();
  }
}
