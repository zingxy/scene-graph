import EventEmitter from 'eventemitter3';
import { nanoid } from 'nanoid';
import Bound from './Bound.js';
import { noop } from './utils.js';

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

    this.position = createReactiveXY(
      { x: 0, y: 0 },
      this.clearTransformCache.bind(this)
    );
    this._rotation = 0; // 以弧度为单位
    this.scale = createReactiveXY(
      { x: 1, y: 1 },
      this.clearTransformCache.bind(this)
    );
    this.skew = createReactiveXY(
      { x: 0, y: 0 },
      this.clearTransformCache.bind(this)
    );
  }
  get rotation() {
    return this._rotation;
  }
  set rotation(value) {
    this._rotation = value;
    this.clearTransformCache();
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
    const matrix = new DOMMatrix();
    matrix.translateSelf(this.position.x, this.position.y);
    matrix.rotateSelf(this.rotation * (180 / Math.PI)); // 转换为度
    matrix.skewXSelf(this.skew.x);
    matrix.skewYSelf(this.skew.y);
    matrix.scaleSelf(this.scale.x, this.scale.y);
    return matrix;
  }
  decompose(matrix) {
    const { a, b, c, d, e, f } = matrix;

    const delta = a * d - b * c;

    const result = {
      x: e,
      y: f,
      rotation: 0,
      scaleX: 0,
      scaleY: 0,
      skewX: 0,
      skewY: 0,
    };

    // Apply the QR-like decomposition.
    if (a != 0 || b != 0) {
      const r = Math.sqrt(a * a + b * b);
      result.rotation = b > 0 ? Math.acos(a / r) : -Math.acos(a / r);
      result.scaleX = r;
      result.scaleY = delta / r;
      result.skewX = (a * c + b * d) / delta;
      result.skewY = 0;
    } else if (c != 0 || d != 0) {
      const s = Math.sqrt(c * c + d * d);
      result.rotation =
        Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s));
      result.scaleX = delta / s;
      result.scaleY = s;
      result.skewX = 0;
      result.skewY = (a * c + b * d) / delta;
    } else {
      // a = b = c = d = 0
    }
    this.position.x = result.x;
    this.position.y = result.y;
    this.rotation = result.rotation;
    this.scale.x = result.scaleX;
    this.scale.y = result.scaleY;
    this.skew.x = result.skewX;
    this.skew.y = result.skewY;
  }
  set transformMatrix(matrix) {
    this.batchTransformUpdate(() => {
      this.decompose(matrix);
    });
  }

  get worldTransformMatrix() {
    const computeFn = () => {
      return this.parent
        ? this.parent.worldTransformMatrix.multiply(this.transformMatrix)
        : this.transformMatrix;
    };
    return this.getCache('worldTransformMatrix', computeFn);
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

  global2Local(point) {
    return this.worldTransformMatrix.inverse().transformPoint(point);
  }
  local2Global(point) {
    return this.worldTransformMatrix.transformPoint(point);
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
  markReflow() {
    this.needReflow = true;
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
      .inverse()
      .transformPoint(new DOMPoint(x, y));
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
    this.width = width;
    this.height = height;
  }
  hitTest(point) {
    const { x, y } = point;
    const { x: localX, y: localY } = this.worldTransformMatrix
      .inverse()
      .transformPoint(new DOMPoint(x, y));
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
      maxX: this.width,
      maxY: this.height,
    });
  }
  render(ctx) {
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.stroke();
    return new Path2D();
  }
}
