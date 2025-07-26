import EventEmitter from 'eventemitter3';
import { nanoid } from 'nanoid';
import Bound from './Bound.js';
import { noop } from './utils.js';

const DIRTY_FLAGS = {
  BOUNDING_BOX: 'boundingBox',
  TRANSFORM_MATRIX: 'transformMatrix',
};

export class DisplayObject extends EventEmitter {
  constructor() {
    super();
    this.id = nanoid();
    this.flagQueue = [];
    this.parent = null;
    this._transformMatrix = new DOMMatrix();
    this.cacheWorldMatrix = null;
    this.cacheWorldBounds = null;
    this.cacheTransformedBounds = null;
    this.needReflow = true;
    this.dirty = true;
    this.batchCount = 0;
  }

  get transformMatrix() {
    return this._transformMatrix;
  }
  set transformMatrix(matrix) {
    this.batchUpdate();
    this.cacheTransformedBounds = null;
    this._transformMatrix = matrix;
  }

  get worldTransformMatrix() {
    if (this.cacheWorldMatrix) {
      return this.cacheWorldMatrix;
    }

    this.cacheWorldMatrix = this.parent
      ? this.parent.worldTransformMatrix.multiply(this.transformMatrix)
      : this.transformMatrix;
    return this.cacheWorldMatrix;
  }
  hitTest() {
    return false;
  }

  getBounds() {
    throw new Error('getBounds() must be implemented in subclass');
  }
  getTransformedBounds() {
    if (this.cacheTransformedBounds) {
      return this.cacheTransformedBounds;
    }
    this.cacheTransformedBounds = this.getBounds().applyMatrix(
      this.transformMatrix
    );
    return this.cacheTransformedBounds;
  }
  getWorldBounds() {
    if (this.cacheWorldBounds) {
      if (this.cacheWorldBounds.id !== this.id) {
        console.warn(
          `Bounds ID mismatch! Shape ID: ${this.id}, Bounds ID: ${this.cacheWorldBounds.id}`
        );
        // 缓存ID不匹配，说明缓存已失效，重新计算
        this.cacheWorldBounds = null;
      } else {
        return this.cacheWorldBounds;
      }
    }
    const bounds = this.getBounds();
    const transformedBounds = bounds.applyMatrix(this.worldTransformMatrix);
    // 确保创建新的bounds实例
    this.cacheWorldBounds = new Bound({
      minX: transformedBounds.minX,
      minY: transformedBounds.minY,
      maxX: transformedBounds.maxX,
      maxY: transformedBounds.maxY,
      id: this.id,
    });
    return this.cacheWorldBounds;
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
  global2Local(point) {
    return this.worldTransformMatrix.inverse().transformPoint(point);
  }
  local2Global(point) {
    return this.worldTransformMatrix.transformPoint(point);
  }

  /**
   * 为什么要批量更新
   * circle.transformMatrix = a
   * circle.transformMatrix = b
   * 如果没有批量更新，同一tick内，上面会触发两次递归计算
   * 实际上我们只需要在最后一次更新时计算一次
   */
  batchUpdate() {
    this.batchCount++;
    if (this.batchCount === 1) {
      queueMicrotask(() => {
        this.top2Bottom((node) => {
          // node.cacheWorldBounds = null;
          // node.cacheWorldMatrix = null;
          node.needReflow = true;
        });

        this.bottom2Top((node) => {
          // node.cacheWorldBounds = null;
          // node.cacheWorldMatrix = null;
          // node.cacheTransformedBounds = null;
          node.needReflow = true;
        });

        this.batchCount = 0;
        this.markDirty();
      });
    } else {
    }
  }
  markReflow() {
    this.needReflow = true;
  }
  markDirty() {
    this.dirty = true;
    this.parent?.markDirty();
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
    this.batchUpdate();
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
  render(ctx) {
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.stroke();
    return new Path2D();
  }
}
