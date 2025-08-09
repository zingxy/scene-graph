import { Container, Circle } from './DisplayObject';

export class Transformer extends Container {
  shapes = [];
  constructor() {
    super();
    this.name = 'Transformer';
  }

  addShape(shape) {
    this.shapes.push(shape);
    const { topLeft, topRight, bottomRight, bottomLeft } = shape.getAnchors();
    const anchors = [topLeft, topRight, bottomRight, bottomLeft];
    for (const anchor of anchors) {
      const { x, y } = anchor;
      console.log(`Creating anchor at (${x}, ${y})`);
      const anchorShape = new Circle(20, 'red');
      anchorShape.position.x = x;
      anchorShape.position.y = y;
      anchorShape.name = `anchor-${anchor.name}`;
      this.addChild(anchorShape);
    }
  }
}
