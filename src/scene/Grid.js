// TODO将其实现为一个Rect
class Grid {
  constructor(world) {
    this.world = world;
    this.gridSize = 1;
    this.snapTolerance = 1;
  }

  getNearestPoint(point) {
    const gridSize = this.gridSize;
    const x = Math.round(point.x / gridSize) * gridSize;
    const y = Math.round(point.y / gridSize) * gridSize;
    return {
      x,
      y,
    };
  }

  snapToGrid(point) {
    const nearest = this.getNearestPoint(point);
    const dx = point.x - nearest.x;
    const dy = point.y - nearest.y;
    if (
      Math.abs(dx) < this.snapTolerance &&
      Math.abs(dy) < this.snapTolerance
    ) {
      return nearest;
    }
    return point;
  }

  renderGrid(ctx) {
    const { minX, minY, maxX, maxY } = this.world.camera.getWorldBounds();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    const zoom = this.world.camera.getZoomLevel();
    ctx.lineWidth = 1 / zoom;
    {
      let start = minX - (minX % this.gridSize);
      let end = maxX + (this.gridSize - (maxX % this.gridSize));
      for (let x = start; x <= end; x += this.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
        ctx.stroke();
      }
    }
    {
      let start = minY - (minY % this.gridSize);
      let end = maxY + (this.gridSize - (maxY % this.gridSize));
      for (let y = start; y <= end; y += this.gridSize) {
        ctx.beginPath();
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();
      }
    }
  }
}
export default Grid;
