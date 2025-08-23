// TODO将其实现为一个Rect
class Grid {
  constructor(world) {
    this.world = world;
  }

  renderGrid(ctx) {
    const { minX, minY, maxX, maxY } = this.world.camera.getWorldBounds();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    {
      let start = minX - (minX % 50);
      let end = maxX + (50 - (maxX % 50));
      for (let x = start; x <= end; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
        ctx.stroke();
      }
    }
    {
      let start = minY - (minY % 50);
      let end = maxY + (50 - (maxY % 50));
      for (let y = start; y <= end; y += 50) {
        ctx.beginPath();
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();
      }
    }
  }
}
export default Grid;
