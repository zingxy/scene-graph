import { DisplayObject } from './DisplayObject.js';

/**
 * Camera也是World的下的一个Local坐标系
 * 抽象出Camera的目的主要是快速完成Viewport到World的转换
 */
export class Camera extends DisplayObject {
  constructor(world) {
    super();
    this.world = world;
    this.ctx = world.ctx;
    const dpr = window.devicePixelRatio || 1;
    // 这是viewport matrix, 也就是camera matrix的逆矩阵
    this.transformMatrix = new DOMMatrix().scale(dpr, dpr);
    this.latestMousePosition = {
      x: 0,
      y: 0,
    };
    this.bindEvents();
  }
  bindEvents() {
    const canvas = this.ctx.canvas;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStart.x = e.offsetX;
      dragStart.y = e.offsetY;
    });

    canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      this.latestMousePosition = {
        x: e.offsetX,
        y: e.offsetY,
      };
      if (isDragging) {
        const offsetX = e.offsetX - dragStart.x;
        const offsetY = e.offsetY - dragStart.y;
        dragStart.x = e.offsetX;
        dragStart.y = e.offsetY;
        const T = new DOMMatrix([1, 0, 0, 1, offsetX, offsetY]);
        this.transformMatrix = T.multiply(this.transformMatrix);
      }
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        let scale = 1;
        // Adjust scale
        if (e.deltaY < 0) {
          scale *= zoomFactor;
        } else {
          scale /= zoomFactor;
        }
        const dpr = window.devicePixelRatio;
        const mouseX = e.offsetX * dpr;
        const mouseY = e.offsetY * dpr;
        const T = new DOMMatrix([1, 0, 0, 1, -mouseX, -mouseY]);
        const S = new DOMMatrix([scale, 0, 0, scale, 0, 0]);
        const T2 = new DOMMatrix([1, 0, 0, 1, mouseX, mouseY]);

        const ctm = this.transformMatrix;
        this.transformMatrix = T2.multiply(S).multiply(T).multiply(ctm);
      },
      { passive: false }
    );
  }
}
