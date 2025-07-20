import EventEmitter from 'eventemitter3';
export class DisplayObject extends EventEmitter {
  constructor() {
    super();
    this.parent = null;
    this.transformMatrix = new DOMMatrix();
  }
  get worldTransformMatrix() {
    let worldMatrix = this.transformMatrix;
    let parent = this.parent;
    while (parent) {
      worldMatrix = parent.transformMatrix.multiply(worldMatrix);
      parent = parent.parent;
    }
    return worldMatrix;
  }
  hitTest() {
    return false;
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
}

export class Shape extends DisplayObject {
  constructor() {
    super();
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

  render(ctx) {
    ctx.fillStyle = this.fill;
    ctx.fill(this.path);
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
  }
}
