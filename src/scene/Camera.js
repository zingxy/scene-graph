import { DisplayObject } from './DisplayObject.js';

/**
 * Camera也是World的下的一个Local坐标系
 * 抽象出Camera的目的主要是快速完成Viewport到World的转换
 * Camera定义了Camera matrix和Viewport matrix
 * p_viewport = Viewport_matrix * Camera_matrix * p_world
 */
export class Camera extends DisplayObject {
  constructor(world) {
    super();
    this.world = world;
    this.ctx = world.ctx;
    // camera matrix的逆矩阵, camera matrix = this.transformMatrix.inverse()
    this.transformMatrix = new DOMMatrix();
    const dpr = window.devicePixelRatio || 1;
    // viewportMatrix用于将viewport坐标转换为camera space坐标; CSS像素到物理像素的转换
    // p_camera = viewportMatrix * p_viewport
    this.viewportMatrix = new DOMMatrix().scale(dpr, dpr);
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
      this.latestMousePosition = this.viewportMatrix.transformPoint(
        new DOMPoint(e.offsetX, e.offsetY)
      );
      if (isDragging) {
        const offsetX = e.offsetX - dragStart.x;
        const offsetY = e.offsetY - dragStart.y;
        dragStart.x = e.offsetX;
        dragStart.y = e.offsetY;
        const viewportX = offsetX;
        const viewportY = offsetY;
        const cameraPoint = this.viewportMatrix.transformPoint(
          new DOMPoint(viewportX, viewportY)
        );
        const T = new DOMMatrix([1, 0, 0, 1, cameraPoint.x, cameraPoint.y]);
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
        const viewportX = e.offsetX;
        const viewportY = e.offsetY;
        const cameraPoint = this.viewportMatrix.transformPoint(
          new DOMPoint(viewportX, viewportY)
        );
        const T = new DOMMatrix([1, 0, 0, 1, -cameraPoint.x, -cameraPoint.y]);
        const S = new DOMMatrix([scale, 0, 0, scale, 0, 0]);
        const T2 = new DOMMatrix([1, 0, 0, 1, cameraPoint.x, cameraPoint.y]);

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
    const cameraPoint = this.viewportMatrix.transformPoint(
      new DOMPoint(viewportX, viewportY)
    );
    return this.transformMatrix.inverse().transformPoint(cameraPoint);
  }

  /**
   * 将world坐标转换为viewport坐标
   * @param {number} worldX - world x坐标
   * @param {number} worldY - world y坐标
   * @returns {DOMPoint} viewport坐标点
   */
  worldToViewport(worldX, worldY) {
    const worldPoint = new DOMPoint(worldX, worldY);
    const cameraPoint = this.transformMatrix.transformPoint(worldPoint);
    return this.viewportMatrix.inverse().transformPoint(
      new DOMPoint(cameraPoint.x, cameraPoint.y)
    );
  }
}
