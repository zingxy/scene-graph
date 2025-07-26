import EventEmitter from 'eventemitter3';
import { nanoid } from 'nanoid';

export class DisplayObject extends EventEmitter {
  constructor() {
    super();
    this.id = nanoid();
    this.dirty = true;
    this.parent = null;
    this._transformMatrix = new DOMMatrix();
    this.cacheWorldMatrix = null;
    this.cacheWorldBounds = null;
  }

  get transformMatrix() {
    return this._transformMatrix;
  }
  set transformMatrix(matrix) {
    this.top2Bottom((node) => {
      node.cacheWorldMatrix = null;
      node.cacheWorldBounds = null;
    });

    this.bottom2Top((node) => {
      node.cacheWorldBounds = null;
    });
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
  getWorldBounds() {
    throw new Error('getWorldBounds() must be implemented in subclass');
  }

  bottom2Top(callback = () => {}, includeSelf = true) {
    let parent = includeSelf ? this : this.parent;
    let count = 0;
    while (parent) {
      callback(parent);
      count++;
      parent = parent.parent;
    }
    console.log(`Executed bottom2Top: ${count}`);
  }
  top2Bottom(callback = () => {}) {
    const count = this.dfs(this, (node) => {
      callback(node);
    });
    console.log(`Executed top2Bottom: ${count}`);
  }
  dfs(node, callback = () => {}) {
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
}

export class Container extends DisplayObject {
  constructor() {
    super();
    this.children = [];
  }
  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  getWorldBounds() {
    if (this.cacheWorldBounds) {
      return this.cacheWorldBounds;
    }
    if (this.children.length === 0) {
      return new Bound({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        id: this.id,
      });
    }
    let bounds = this.children[0].getWorldBounds();
    for (let i = 1; i < this.children.length; i++) {
      bounds = bounds.union(this.children[i].getWorldBounds());
    }
    // 创建新的bounds实例，避免修改原始对象
    this.cacheWorldBounds = new Bound({
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      id: this.id,
    });
    return this.cacheWorldBounds;
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

export class Bound {
  constructor({ minX, minY, maxX, maxY, ...rest }) {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    Object.assign(this, rest);
  }

  union(bound) {
    return new Bound({
      minX: Math.min(this.minX, bound.minX),
      minY: Math.min(this.minY, bound.minY),
      maxX: Math.max(this.maxX, bound.maxX),
      maxY: Math.max(this.maxY, bound.maxY),
    });
  }
  intersects(bound) {
    return !(
      this.maxX < bound.minX ||
      this.minX > bound.maxX ||
      this.maxY < bound.minY ||
      this.minY > bound.maxY
    );
  }
  contains(point) {
    return (
      point.x >= this.minX &&
      point.x <= this.maxX &&
      point.y >= this.minY &&
      point.y <= this.maxY
    );
  }
  applyMatrix(matrix) {
    const points = [
      new DOMPoint(this.minX, this.minY),
      new DOMPoint(this.maxX, this.minY),
      new DOMPoint(this.maxX, this.maxY),
      new DOMPoint(this.minX, this.maxY),
    ];
    const transformedPoints = points.map((p) => matrix.transformPoint(p));
    const xs = transformedPoints.map((p) => p.x);
    const ys = transformedPoints.map((p) => p.y);
    return new Bound({
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    });
  }
}
