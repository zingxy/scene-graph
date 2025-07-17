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
    // camera matrix的逆矩阵
    this.transformMatrix = new DOMMatrix();
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
        // 保持与缩放操作的一致性，使用物理像素
        const dpr = window.devicePixelRatio || 1;
        const T = new DOMMatrix([1, 0, 0, 1, offsetX * dpr, offsetY * dpr]);
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

  /**
   * 将viewport坐标转换为world坐标
   * @param {number} viewportX - viewport x坐标 (offsetX)
   * @param {number} viewportY - viewport y坐标 (offsetY)
   * @returns {DOMPoint} world坐标点
   */
  viewportToWorld(viewportX, viewportY) {
    // transformMatrix 在物理像素空间操作，需要先转换CSS像素到物理像素
    const dpr = window.devicePixelRatio || 1;
    const physicalPoint = new DOMPoint(viewportX * dpr, viewportY * dpr);
    return this.transformMatrix.inverse().transformPoint(physicalPoint);
  }

  /**
   * 将world坐标转换为viewport坐标
   * @param {number} worldX - world x坐标
   * @param {number} worldY - world y坐标
   * @returns {DOMPoint} viewport坐标点
   */
  worldToViewport(worldX, worldY) {
    const dpr = window.devicePixelRatio || 1;
    const worldPoint = new DOMPoint(worldX, worldY);
    const physicalPoint = this.transformMatrix.transformPoint(worldPoint);
    return new DOMPoint(physicalPoint.x / dpr, physicalPoint.y / dpr);
  }
}
