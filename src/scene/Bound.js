export default class Bound {
  constructor({ minX, minY, maxX, maxY, ...rest }) {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    Object.assign(this, rest);
  }

  union(bound) {
    return new Bound({
      minX: Math.min(this.minX, bound.minX),
      minY: Math.min(this.minY, bound.minY),
      maxX: Math.max(this.maxX, bound.maxX),
      maxY: Math.max(this.maxY, bound.maxY),
    });
  }
  intersects(bound) {
    return !(
      this.maxX < bound.minX ||
      this.minX > bound.maxX ||
      this.maxY < bound.minY ||
      this.minY > bound.maxY
    );
  }
  contains(point) {
    return (
      point.x >= this.minX &&
      point.x <= this.maxX &&
      point.y >= this.minY &&
      point.y <= this.maxY
    );
  }
  applyMatrix(matrix) {
    const points = [
      new DOMPoint(this.minX, this.minY),
      new DOMPoint(this.maxX, this.minY),
      new DOMPoint(this.maxX, this.maxY),
      new DOMPoint(this.minX, this.maxY),
    ];
    const transformedPoints = points.map((p) => matrix.transformPoint(p));
    const xs = transformedPoints.map((p) => p.x);
    const ys = transformedPoints.map((p) => p.y);
    return new Bound({
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    });
  }
  applyMatrixPoints(matrix) {
    const points = [
      new DOMPoint(this.minX, this.minY),
      new DOMPoint(this.maxX, this.minY),
      new DOMPoint(this.maxX, this.maxY),
      new DOMPoint(this.minX, this.maxY),
    ];
    const transformedPoints = points.map((p) => matrix.transformPoint(p));
    return transformedPoints.map((p) => ({ x: p.x, y: p.y }));
  }
}
