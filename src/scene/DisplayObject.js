export class DisplayObject {
  constructor() {
    this.transformMatrix = new DOMMatrix();
  }
}

export class Container extends DisplayObject {
  constructor() {
    super();
    this.children = [];
  }
  addChild(child) {
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
  render(ctx, { mousePosition }) {
    const isInside = ctx.isPointInPath(
      this.path,
      mousePosition.x,
      mousePosition.y
    );
    const fillColor = isInside ? 'red' : this.fill;
    ctx.fillStyle = fillColor;
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
