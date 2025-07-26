import { Camera } from './Camera.js';
import { Container, Shape } from './DisplayObject.js';
import { drawCoordinateSystem } from './utils.js';
import RBush from 'rbush';
const SUPPORTED_EVENTS = ['click', 'mousemove', 'mousedown', 'mouseup'];

export class SceneGraph {
  constructor(canvas) {
    this.canvas = canvas;
    /**@type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext('2d');
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
    SUPPORTED_EVENTS.forEach((eventName) => {
      this.bindEvent(eventName);
    });
  }
  bindEvent = (eventName) => {
    this.canvas.addEventListener(eventName, (e) => {
      const wrappedEvent = this.wrapEvent(e);
      this.stage.top2Bottom((node) => {
        node.emit(`global:${eventName}`, wrappedEvent);
        if (node.hitTest(wrappedEvent.worldPoint)) {
          node.emit(eventName, wrappedEvent);
        }
      });
    });
  };

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

  renderSceneGraphWithTransform(root) {
    // base case
    if (!root) return;
    const { a, b, c, d, e, f } = root.transformMatrix;
    if (root instanceof Shape) {
      this.ctx.save();
      this.ctx.transform(a, b, c, d, e, f);
      root.render(this.ctx);
      this.ctx.restore();
      return;
    }
    // make progress
    for (const child of root.children) {
      this.ctx.save();
      this.ctx.transform(a, b, c, d, e, f);
      this.renderSceneGraphWithTransform(child);
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

  renderSceneGraphWithWorldTransform(root) {
    // base case
    if (!root) return;
    this.ctx.resetTransform();
    if (root instanceof Shape) {
      this.ctx.setTransform(
        this.camera.transformMatrix.multiply(root.worldTransformMatrix)
      );
      root.render(this.ctx);
      return;
    }
    for (const child of root.children) {
      this.renderSceneGraphWithWorldTransform(child);
    }
  }

  calcWorldBounds() {
    return this.stage.getWorldBounds();
  }

  reflow() {
    if (!this.stage.dirty) return;
    this.stage.dirty = false;
    let count = 0;
    this.stage.top2Bottom((node) => {
      if (node.needReflow) {
        count++;
        node.needReflow = false;
        node.cacheWorldBounds = null;
        node.cacheWorldMatrix = null;
        node.cacheTransformedBounds = null;
      }
    });
    console.log(`Reflowed ${count} nodes`);
  }

  render() {
    this.reflow();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换矩阵
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(this.camera.transformMatrix); // 设置相机变换矩阵
    this.calcWorldBounds();
    /*
    支持两种渲染方式
    1. renderSceneGraphWithTransform，在每次渲染时逐层计算每个节点的变换矩阵
    2. renderSceneGraphWithWorldTransform， 预先计算好每个节点的世界变换矩阵
    经过测试方法【1】性能更优
    可能的原因：
    1. setTransform性能比transform性能差
    2. DOMMatrix矩阵乘法性能差 
    */
    this.renderSceneGraphWithTransform(this.stage);
    // this.ctx.save();
    // this.renderSceneGraphWithWorldTransform(this.stage);
    // this.ctx.restore();

    // 绘制bounds
    this.ctx.save();
    // this.renderBounds(this.stage);
    this.ctx.restore();
  }
}
