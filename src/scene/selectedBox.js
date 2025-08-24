import { Rect, Shape } from './DisplayObject';
import Transformer from './Transformer';

class SelectBox extends Rect {
  constructor(world) {
    super(0, 0);
    this.world = world;
    this.transformer = new Transformer();
    this.bindEvents();
  }
  bindEvents() {
    this.on('global:pointerdown', this.onPointerDown.bind(this));
    this.on('global:pointermove', this.onPointerMove.bind(this));
    this.on('global:pointerup', this.onPointerUp.bind(this));
  }
  onPointerDown(event) {
    if (this.isTransforming(event)) return;
    this.selecting = true;
    this.start = event.worldPoint;
    this.width = 0;
    this.height = 0;
    this.x = this.start.x;
    this.y = this.start.y;
    this.transformer.parent?.removeChild(this.transformer);
    this.transformer.removeAllChildren();
    this.transformer.shapes = [];
    console.log('Selection started:', this.start);
  }

  onPointerMove(event) {
    if (!this.selecting) return;
    console.log('Selection in progress:', event.worldPoint);
    const { x, y } = event.worldPoint;
    this.width = x - this.start.x;
    this.height = y - this.start.y;
  }

  onPointerUp() {
    if (!this.selecting) return;
    this.selecting = false;
    this.selectedBoxChanged(this);
    this.width = 0;
    this.height = 0;
  }
  selectedBoxChanged(selectBox) {
    const transformer = this.transformer;
    this.world.stage.addChild(transformer);
    transformer.shapes = [];
    const world = this.world;
    const selectedShapes = world.rtree.search({
      minX: selectBox.x,
      minY: selectBox.y,
      maxX: selectBox.x + selectBox.width,
      maxY: selectBox.y + selectBox.height,
    });
    const selectedIds = selectedShapes.map((shape) => shape.id);
    world.stage.top2Bottom((node) => {
      if (
        node instanceof Shape &&
        selectedIds.includes(node.id) &&
        node !== selectBox
      ) {
        transformer.addShape(node);
      }
    });
  }

  isTransforming(e) {
    const hit = this.transformer.children.some((c) => c.hitTest(e.worldPoint));
    return this.transformer.parent !== null && hit;
  }
}

export default SelectBox;
