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
    this.top2Bottom('cacheWorldMatrix');
    this.top2Bottom('cacheWorldBounds');

    // world<-parent<-parent<-...local的bounds失效
    // 感觉可以优化，比如parent.worldBounds.contains(local.worldBounds)时，就没必要继续失效了
    this.bottom2Top('cacheWorldBounds');

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

  bottom2Top(key) {
    let parent = this;
    while (parent) {
      parent[key] = null;
      parent = parent.parent;
    }
  }
  top2Bottom(key) {
    const count = this.dfs(this, (node) => {
      node[key] = null;
    });
    console.log(`top2Bottom: ${key} set ${count} nodes to null`);
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
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
      };
    }
    let bounds = this.children[0].getWorldBounds();
    for (let i = 1; i < this.children.length; i++) {
      bounds = bounds.union(this.children[i].getWorldBounds());
    }
    this.cacheWorldBounds = bounds;
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
  getWorldBounds() {
    if (this.cacheWorldBounds) {
      return this.cacheWorldBounds;
    }
    const bounds = this.getBounds();
    this.cacheWorldBounds = bounds.applyMatrix(this.worldTransformMatrix);
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
