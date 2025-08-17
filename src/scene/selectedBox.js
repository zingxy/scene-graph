import { Rect } from './DisplayObject';

class SelectBox extends Rect {
  constructor(world) {
    super(0, 0);
    this.world = world;
    this.disabled = false;
    this.bindEvents();
  }
  bindEvents() {
    this.on('global:pointerdown', this.onPointerDown.bind(this));
    this.on('global:pointermove', this.onPointerMove.bind(this));
    this.on('global:pointerup', this.onPointerUp.bind(this));
  }
  onPointerDown(event) {
    if (this.disabled) return;
    this.selecting = true;
    this.start = event.worldPoint;
    this.width = 0;
    this.height = 0;
    this.x = this.start.x;
    this.y = this.start.y;
    console.log('Selection started:', this.start);
  }

  onPointerMove(event) {
    if (this.disabled) return;
    if (!this.selecting) return;
    console.log('Selection in progress:', event.worldPoint);
    const { x, y } = event.worldPoint;
    this.width = x - this.start.x;
    this.height = y - this.start.y;
  }

  onPointerUp() {
    if (this.disabled) return;
    if (!this.selecting) return;
    this.disabled = true;
    this.selecting = false;
    this.emit('selection:changed', this);
    this.width = 0;
    this.height = 0;
  }
}

export default SelectBox;
