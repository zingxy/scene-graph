import EventEmitter from 'eventemitter3';
import { nanoid } from 'nanoid';
import Bound from './Bound.js';
import { logger, noop } from './utils.js';
import { Transform } from 'pixi.js';

const createReactiveXY = (obj, callback) => {
  return new Proxy(obj, {
    set(target, prop, value) {
      if ((prop === 'x' || prop === 'y') && target[prop] !== value) {
        target[prop] = value;
        // console.log(`Property ${prop} changed to ${value}`);
        callback(prop, value);
      } else if (prop !== 'x' && prop !== 'y') {
        target[prop] = value;
      }
      return true;
    },
  });
};

export class DisplayObject extends EventEmitter {
  constructor() {
    super();
    this.id = nanoid();
    this.parent = null;
    this.cache = new Map(); // (key: {dirty, value})
    this.dirty = true;
    this._zIndex = 0; // z-index for rendering order
    this.transform = new Transform({ observer: this });
  }
  _onUpdate() {
    this.clearTransformCache();
  }

  get x() {
    return this.transform.position.x;
  }
  set x(value) {
    this.transform.position.x = value;
  }
  get y() {
    return this.transform.position.y;
  }
  set y(value) {
    this.transform.position.y = value;
  }
  get scaleX() {
    return this.transform.scale.x;
  }
  set scaleX(value) {
    this.transform.scale.x = value;
  }
  get scaleY() {
    return this.transform.scale.y;
  }
  set scaleY(value) {
    this.transform.scale.y = value;
  }
  get scale() {
    return this.transform.scale;
  }
  set scale(value) {
    this.transform.scale.set(value.x, value.y); // Assuming value is an object with x and y properties
  }

  get rotation() {
    return this.transform.rotation;
  }
  set rotation(value) {
    this.transform.rotation = value;
  }

  get skew() {
    return this.transform.skew;
  }
  set skew(value) {
    this.transform.skew.set(value.x, value.y); // Assuming value is an object with x and y properties
  }

  get skewX() {
    return this.transform.skew.x;
  }
  set skewX(value) {
    this.transform.skew.x = value;
  }
  get skewY() {
    return this.transform.skew.y;
  }
  set skewY(value) {
    this.transform.skew.y = value;
  }

  get zIndex() {
    return this._zIndex;
  }

  set zIndex(value) {
    if (this._zIndex !== value) {
      this._zIndex = value;
    }
    // TODO : 触发重新排序
  }
  getRenderPath() {
    if (!this.parent) return [{ zIndex: this.zIndex, childIndex: 0 }];

    // 找到在父容器中的索引位置
    const childIndex = this.parent.children.indexOf(this);
    const parentPath = this.parent.getRenderPath();

    return [...parentPath, { zIndex: this.zIndex, childIndex }];
  }
  // 修改 compareZIndex 方法
  compareRenderOrder(other) {
    // case 1
    if (this === other) {
      return 0; // 相同对象，返回相等
    }

    const thisPath = this.getRenderPath();
    const otherPath = other.getRenderPath();

    // case 2
    for (let i = 0; i < Math.min(thisPath.length, otherPath.length); i++) {
      // 先比较 zIndex
      if (thisPath[i].zIndex !== otherPath[i].zIndex) {
        return thisPath[i].zIndex - otherPath[i].zIndex;
      }
      // zIndex 相同时比较添加顺序
      if (thisPath[i].childIndex !== otherPath[i].childIndex) {
        return thisPath[i].childIndex - otherPath[i].childIndex;
      }
    }
    // case 3
    logger.warn('Unrechable code in compareRenderOrder');
    return thisPath.length - otherPath.length;
  }

  cacheValidate(key, dirtyCallback = noop) {
    if (this.cache.has(key)) {
      const { dirty, value } = this.cache.get(key);
      if (dirty) {
        dirtyCallback(value);
        return false; // 缓存已失效
      }
      return true; // 缓存有效
    }
    return false; // 缓存不存在
  }
  invalidateCache(key) {
    if (this.cache.has(key)) {
      const item = this.cache.get(key);
      item.dirty = true; // 标记为脏
      this.cache.set(key, item);
    }
  }
  getCache(key, computeFn, dirtyCallback = noop) {
    if (this.cacheValidate(key, dirtyCallback)) {
      return this.cache.get(key).value;
    }
    const value = computeFn();
    this.cache.set(key, { dirty: false, value });
    return value;
  }

  get transformMatrix() {
    return this.transform.matrix.clone();
  }
  set transformMatrix(matrix) {
    this.batchTransformUpdate(() => {
      this.transform.setFromMatrix(matrix);
    });
  }

  get worldTransformMatrix() {
    const computeFn = () => {
      return this.parent
        ? this.parent.worldTransformMatrix.clone().append(this.transformMatrix)
        : this.transformMatrix;
    };
    return this.getCache('worldTransformMatrix', computeFn).clone();
  }
  hitTest() {
    return false;
  }

  getBounds() {
    throw new Error('getBounds() must be implemented in subclass');
  }
  getTransformedBounds() {
    const computeFn = () => {
      return this.getBounds().applyMatrix(this.transformMatrix);
    };
    return this.getCache('transformedBounds', computeFn);
  }
  getWorldBounds(flag = 'DO_NOT_USE_CACHE', dirtyCallback = noop) {
    const computeFn = () => {
      const bounds = this.getBounds();
      const transformedBounds = bounds.applyMatrix(this.worldTransformMatrix);
      transformedBounds.id = this.id; // 确保ID与当前对象一致
      return transformedBounds;
    };

    if (flag === 'DO_NOT_USE_CACHE') {
      // 手动计算，不使用缓存
      return computeFn();
    }
    return this.getCache('worldBounds', computeFn, dirtyCallback);
  }
  getAnchors() {
    return this.getBounds().applyMatrixPoints(this.worldTransformMatrix);
  }

  worldToLocal(point) {
    return this.worldTransformMatrix.invert().apply(point);
  }
  localToWorld(point) {
    return this.worldTransformMatrix.apply(point);
  }

  clearTransformCache() {
    // 如果当前transformMatrix被修改，清空相关缓存
    // 清空当前和后代节点的缓存
    if (this.batchTransformEnabled) return;
    this.top2Bottom((node) => {
      // 只清空矩阵缓存
      node.cache.delete('worldTransformMatrix');
    });
    this.batchBoundingBoxUpdate();
    this.batchDraw();
  }

  /**
   * 为什么要批量更新
   * circle.transformMatrix = a
   * circle.transformMatrix = b
   * 如果没有批量更新，同一tick内，上面会触发两次递归计算
   * 实际上我们只需要在最后一次更新时计算一次
   */
  batchTransformUpdate(callback = noop) {
    this.batchTransformEnabled = true;
    callback();
    this.batchTransformEnabled = false;
    this.clearTransformCache(); // 清空变换缓存
  }
  batchBoundingBoxUpdate() {
    // 当transformMatrix被修改时，清空相关缓存
    if (this.batchBoundingBoxEnabled) return;
    this.batchBoundingBoxEnabled = true;
    queueMicrotask(() => {
      this.top2Bottom((node) => {
        node.invalidateCache('worldBounds');
      });
      this.bottom2Top((node) => {
        node.invalidateCache('worldBounds');
        node.cache.delete('transformedBounds');
      });
      this.batchBoundingBoxEnabled = false;
    });
  }
  batchDraw() {
    if (this.waitingDraw) return;
    this.waitingDraw = true;
    queueMicrotask(() => {
      this.markDirty();
      this.waitingDraw = false;
    });
  }
  markDirty() {
    this.dirty = true;
    this.parent?.markDirty();
  }

  bottom2Top(callback = noop, includeSelf = true) {
    let parent = includeSelf ? this : this.parent;
    let count = 0;
    while (parent) {
      callback(parent);
      count++;
      parent = parent.parent;
    }
    // console.log(`Executed bottom2Top: ${count}`);
  }
  top2Bottom(callback = noop) {
    const count = this.dfs(this, (node) => {
      callback(node);
    });
    // console.log(`Executed top2Bottom: ${count}`);
  }
  dfs(node, callback = noop) {
    // base case
    let count = 0;
    if (!node) return;
    callback(node);
    count++;
    if (node instanceof Shape) {
      return count;
    }
    // make progress
    for (const child of node.children) {
      count += this.dfs(child, callback);
    }
    return count;
  }
}

export class Container extends DisplayObject {
  constructor() {
    super();
    this.children = [];
  }
  addChild(child) {
    child.parent = this;
    this.children.push(child);
    child.clearTransformCache(); // 清空子节点的变换缓存
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    this.clearTransformCache(); // 清空节点的变换缓存
    child.parent = null;
    child.clearTransformCache(); // 清空子节点的变换缓存
  }
  removeAllChildren() {
    this.children.forEach((child) => {
      child.parent = null;
    });
    // TODO 从Rtree中移除
    this.clearTransformCache();
    this.children = [];
  }

  getBounds() {
    if (this.children.length === 0) {
      return new Bound({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
      });
    }
    let bounds = this.children[0].getTransformedBounds();
    for (let i = 1; i < this.children.length; i++) {
      bounds = bounds.union(this.children[i].getTransformedBounds());
    }
    return bounds;
  }
}

export class Shape extends DisplayObject {
  constructor() {
    super();
  }
  getBounds() {
    return new Bound({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    });
  }
  render(ctx) {}
}

export class Circle extends Shape {
  constructor(radius, fill) {
    super();
    this.radius = radius;
    this.fill = fill;
    this.path = new Path2D();
    this.path.arc(0, 0, radius, 0, Math.PI * 2);
  }

  hitTest(point) {
    const { x, y } = point;
    const { x: localX, y: localY } = this.worldTransformMatrix
      .invert()
      .apply(new DOMPoint(x, y));
    return localX * localX + localY * localY <= this.radius * this.radius;
  }

  getBounds() {
    const radius = this.radius;
    return new Bound({
      minX: -radius,
      minY: -radius,
      maxX: radius,
      maxY: radius,
    });
  }

  render(ctx) {
    ctx.fillStyle = this.fill;
    ctx.fill(this.path);
    return this.path;
  }
}

export class Rect extends Shape {
  constructor(width, height) {
    super();
    this._width = width;
    this._height = height;
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  set width(value) {
    this._width = value;
    this.clearTransformCache();
  }

  set height(value) {
    this._height = value;
    this.clearTransformCache();
  }

  hitTest(point) {
    const { x, y } = point;
    const { x: localX, y: localY } = this.worldTransformMatrix
      .invert()
      .apply(new DOMPoint(x, y));
    const bounds = this.getBounds();
    return (
      localX >= bounds.minX &&
      localX <= bounds.maxX &&
      localY >= bounds.minY &&
      localY <= bounds.maxY
    );
  }
  getBounds() {
    return new Bound({
      minX: 0,
      minY: 0,
      maxX: this._width,
      maxY: this._height,
    });
  }
  render(ctx) {
    ctx.beginPath();
    ctx.globalAlpha = 0.5;
    ctx.rect(0, 0, this._width, this._height);
    ctx.fill();
    return new Path2D();
  }
}
