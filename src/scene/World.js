import Bound from './Bound.js';
import { Camera } from './Camera.js';
import { Container, Shape } from './DisplayObject.js';
import { drawCoordinateSystem, logger } from './utils.js';
import RBush from 'rbush';
const SUPPORTED_EVENTS = ['click', 'mousemove', 'mousedown', 'mouseup'];

export class SceneGraph {
  constructor(canvas) {
    this.canvas = canvas;
    /**@type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext('2d');
    this.stage = new Container();
    this.camera = new Camera(this);
    this.rtree = new RBush();
    this.init();
    this.dirtyBounds = null;
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
  getHitCandidates(wrappedEvent) {
    let candidates = this.rtree.search({
      minX: wrappedEvent.worldPoint.x,
      minY: wrappedEvent.worldPoint.y,
      maxX: wrappedEvent.worldPoint.x,
      maxY: wrappedEvent.worldPoint.y,
    });
    let hitCandidates = new Set();
    for (const candidate of candidates) {
      hitCandidates.add(candidate.id);
    }
    return hitCandidates;
  }
  bindEvent = (eventName) => {
    this.canvas.addEventListener(eventName, (e) => {
      const wrappedEvent = this.currentWrappedEvent || this.wrapEvent(e);
      this.currentWrappedEvent = wrappedEvent; // 缓存当前事件
      const hitCandidateSet =
        this.currentHitCandidateSet || this.getHitCandidates(wrappedEvent);
      this.currentHitCandidateSet = hitCandidateSet; // 缓存当前命中候选
      logger.info('Hit Candidates:', hitCandidateSet.size);
      queueMicrotask(() => {
        this.currentHitCandidateSet = null; // 清除缓存
        this.currentWrappedEvent = null; // 清除缓存
      });
      this.stage.top2Bottom((node) => {
        node.emit(`global:${eventName}`, wrappedEvent);
        if (
          hitCandidateSet.has(node.id) &&
          node.hitTest(wrappedEvent.worldPoint)
        ) {
          node.emit(eventName, wrappedEvent);
        }
      });
    });
  };

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
  }
  renderRTree() {
    this.rtree.data.children.forEach((node) => {
      this.ctx.save();
      this.ctx.strokeStyle = 'blue';
      this.ctx.lineWidth = 1;
      const bounds = node;
      this.ctx.strokeRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );
      this.ctx.restore();
    });
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

  renderSceneGraphWithTransform(root) {
    const candidateSet = this.camera.getRenderCandidateSet(); // 确保相机的候选集是最新的
    const dirtyBounds =
      this.dirtyBounds ||
      new Bound({
        minX: 0,
        minY: 0,
        maxX: this.canvas.width,
        maxY: this.canvas.height,
      });

    const dirtyCandidateSet = new Set();
    this.rtree.search(dirtyBounds).forEach((b) => {
      dirtyCandidateSet.add(b.id);
    });

    const start = performance.now();
    let count = 0;

    const dfs = (node) => {
      if (!node) return;
      if (node instanceof Shape) {
        if (
          candidateSet.has(node.id) &&
          (dirtyCandidateSet.has(node.id) || this.forceupdate)
        ) {
          const { a, b, c, d, e, f } = node.transformMatrix;
          count++;
          this.ctx.save();
          this.ctx.transform(a, b, c, d, e, f);
          node.render(this.ctx);
          this.ctx.restore();
        }
        return;
      }
      // make progress
      for (const child of node.children) {
        const { a, b, c, d, e, f } = node.transformMatrix;
        this.ctx.save();
        this.ctx.transform(a, b, c, d, e, f);
        dfs(child);
        this.ctx.restore();
      }
    };

    dfs(root);
    this.dirtyBounds = null; // 清除脏区域缓存
    this.forceupdate = false; // 重置 forceupdate 标志
    const end = performance.now();

    logger.info('candidateSet size:', candidateSet.size);
    logger.info('dirtyCandidateSet size:', dirtyCandidateSet.size);
    logger.info(
      `Render Time: ${
        end - start
      }ms, Rendered Nodes: ${count}, DirtyCandidateSet: ${
        dirtyCandidateSet.size
      }, CameracandidateSet size: ${candidateSet.size}`
    );
  }

  renderSceneGraphWithWorldTransform(root) {
    // base case

    const candidateSet = this.camera.getRenderCandidateSet(); // 确保相机的候选集是最新的
    const start = performance.now();
    let count = 0;

    const dfs = (node) => {
      if (!node) return;
      if (node instanceof Shape) {
        if (!candidateSet.has(node.id)) {
          return;
        }
        this.ctx.setTransform(
          this.camera.transformMatrix.multiply(node.worldTransformMatrix)
        );
        count++;
        node.render(this.ctx);
        return;
      }
      for (const child of node.children) {
        dfs(child);
      }
    };

    dfs(root);
    const end = performance.now();
    logger.warn(`Render Time: ${end - start}ms, Rendered Nodes: ${count}`);
  }

  reflow() {
    let count = 0;
    const start = performance.now();
    this.dirtyBounds = null;
    this.stage.top2Bottom((node) => {
      if (!node.cacheValidate('worldBounds')) {
        count++;
        // 在清空缓存之前，先从 R-tree 中删除旧的 bounds
        let oldBounds = null;
        const newBounds = node.getWorldBounds('', (old) => {
          if (node instanceof Shape) {
            oldBounds = old;
            this.rtree.remove(old, (a, b) => {
              return a.id === b.id;
            });
          }
        });
        if (node instanceof Shape) {
          if (!this.dirtyBounds) {
            this.dirtyBounds = new Bound({
              minX: newBounds.minX,
              minY: newBounds.minY,
              maxX: newBounds.maxX,
              maxY: newBounds.maxY,
            });
          }
          if (oldBounds) {
            this.dirtyBounds = this.dirtyBounds.union(oldBounds);
          }
          this.dirtyBounds = this.dirtyBounds.union(newBounds);
        }
        if (node instanceof Shape) {
          // 插入新的 bounds
          this.rtree.insert(newBounds);
        }

        // 验证：检查是否有重复的 ID
        /*
        const duplicates = this.rtree.all().filter((b) => b.id === node.id);
        if (duplicates.length > 1) {
          logger.error(
            `Duplicate bounds found for node ${node.id}:`,
            duplicates
          );
        }
        */
      }
    });
    logger.info(
      `Reflow time: ${performance.now() - start}ms, Reflowed ${count} nodes`
    );
  }

  wrap(callback) {
    this.ctx.save();
    callback.call(this);
    this.ctx.restore();
  }

  cleanDirtyBounds(dirtyBounds) {
    // 清理脏区域（也使用世界坐标，因为Canvas会自动转换）
    this.ctx.clearRect(
      dirtyBounds.minX,
      dirtyBounds.minY,
      dirtyBounds.maxX - dirtyBounds.minX,
      dirtyBounds.maxY - dirtyBounds.minY
    );
    // 设置 clip 区域（使用世界坐标，因为已经设置了相机变换）
    this.ctx.beginPath(); // 重要：开始新路径
    this.ctx.rect(
      dirtyBounds.minX,
      dirtyBounds.minY,
      dirtyBounds.maxX - dirtyBounds.minX,
      dirtyBounds.maxY - dirtyBounds.minY
    );
    this.ctx.clip();
  }

  render() {
    if (!this.stage.dirty) return;
    this.stage.dirty = false;
    this.reflow();
    this.ctx.save();
    this.ctx.setTransform(this.camera.transformMatrix); // 设置相机变换矩阵

    // 修复：使用世界坐标系的默认边界
    const defaultWorldBounds = this.camera.getWorldBounds();
    this.cleanDirtyBounds(this.dirtyBounds || defaultWorldBounds);
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
    this.ctx.restore();
    // this.renderSceneGraphWithWorldTransform(this.stage);
    // this.renderBounds(this.stage);
    // this.renderRTree();
  }
}
