import { Container, Circle, Rect } from './DisplayObject';
import { Matrix, Transform } from 'pixi.js';

export default class Transformer extends Container {
  shapes = [];
  constructor() {
    super();
    this.name = 'Transformer';
  }

  addShape(shape) {
    this.shapes.push(shape);
    // 清除所有的锚点和cover
    this.removeAllChildren();
    // 准备新的cover
    this.prepare();
    this.addMoveBehavior();
    this.addRotationBehavior();
    this.addZoomBehavior();
  }

  getAnchors() {
    /*
    pixi的decompose会将矩阵分解为纯skew或者纯rotaion
    konva的不会，这里使用konva的
    */
    let decomposed = this.shapes[0].worldTransformMatrix.decompose(
      new Transform()
    );
    console.log('@pixi', decomposed)
    decomposed = decompose(this.shapes[0].worldTransformMatrix);
    console.log('@konva', decomposed);

    let r = this.shapes.length === 1 ? decomposed.rotation : 0;
    const tr = new Matrix().rotate(-r);
    let points = [];
    this.shapes.forEach((shape) => {
      const bounds = shape.getAnchors();
      points.push(
        tr.apply(bounds[0]),
        tr.apply(bounds[1]),
        tr.apply(bounds[2]),
        tr.apply(bounds[3])
      );
    });
    let minX = Math.min(...points.map((p) => p.x));
    let minY = Math.min(...points.map((p) => p.y));
    let maxX = Math.max(...points.map((p) => p.x));
    let maxY = Math.max(...points.map((p) => p.y));
    tr.invert();
    const p = tr.apply({ x: minX, y: minY });

    return {
      x: p.x,
      y: p.y,
      width: maxX - minX,
      height: maxY - minY,
      rotation: r,
    };
  }
  prepare() {
    const { x, y, width, height, rotation } = this.getAnchors();
    const worldCoverShape = new Rect(width, height);
    worldCoverShape.x = x;
    worldCoverShape.y = y;
    worldCoverShape.rotation = rotation;
    this.worldCoverShape = worldCoverShape;

    this.addChild(worldCoverShape);
  }

  applyChangeToAllShape(delta) {
    this.shapes.forEach((shape) => {
      const localTransform = shape.transformMatrix;
      const parentTransform = shape.parent.worldTransformMatrix;
      const newLocalTransform = new Matrix();
      newLocalTransform
        .append(parentTransform.clone().invert())
        .append(delta)
        .append(parentTransform)
        .append(localTransform);

      shape.transformMatrix = newLocalTransform;
    });
  }

  addMoveBehavior() {
    const worldCoverShape = this.worldCoverShape;
    let isDragging = false;
    let lastPosition = { x: 0, y: 0 };

    worldCoverShape.on('pointerdown', (event) => {
      lastPosition = event.worldPoint;
      isDragging = true;
    });

    worldCoverShape.on('global:pointermove', (event) => {
      if (!isDragging) return;
      const dx =
        worldCoverShape.parent.worldToLocal(event.worldPoint).x -
        worldCoverShape.parent.worldToLocal(lastPosition).x;
      const dy =
        worldCoverShape.parent.worldToLocal(event.worldPoint).y -
        worldCoverShape.parent.worldToLocal(lastPosition).y;
      const T = new Matrix().translate(dx, dy);

      this.applyChangeToAllShape(T);
      this.children.forEach((child) => {
        child.transformMatrix = T.clone().append(child.transformMatrix);
      });
      lastPosition = event.worldPoint;
      this.updateAnchorPosition();
    });

    worldCoverShape.on('pointerup', (event) => {
      isDragging = false;
    });
    this.worldCoverShape = worldCoverShape;
  }

  addZoomBehavior() {
    const anchorsName = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    const anchorPoints = this.worldCoverShape.getAnchors().sort((a, b) => {
      a.x - b.x || a.y - b.y;
    });
    const topLeftPoint = {
      x: anchorPoints[0].x,
      y: anchorPoints[0].y,
      name: 'topLeft',
    };
    const topRightPoint = {
      x: anchorPoints[1].x,
      y: anchorPoints[1].y,
      name: 'topRight',
    };
    const bottomRightPoint = {
      x: anchorPoints[2].x,
      y: anchorPoints[2].y,
      name: 'bottomRight',
    };
    const bottomLeftPoint = {
      x: anchorPoints[3].x,
      y: anchorPoints[3].y,
      name: 'bottomLeft',
    };

    const anchors = [
      topLeftPoint,
      topRightPoint,
      bottomRightPoint,
      bottomLeftPoint,
    ];

    anchors.forEach((anchorPoint) => {
      const anchor = new Circle(10);
      anchor.name = anchorPoint.name;
      anchor.x = anchorPoint.x;
      anchor.y = anchorPoint.y;
      this.addChild(anchor);

      let isDragging = false;
      let lastPosition = { x: 0, y: 0 };
      anchor.on('pointerdown', (event) => {
        lastPosition = event.worldPoint;
        isDragging = true;
      });
      anchor.on('global:pointermove', (event) => {
        if (!isDragging) return;
        let zoomCenterAnchor = null;
        if (anchor.name === 'topLeft') {
          zoomCenterAnchor = this.findOneAnchor('bottomRight');
        } else if (anchor.name === 'topRight') {
          zoomCenterAnchor = this.findOneAnchor('bottomLeft');
        } else if (anchor.name === 'bottomRight') {
          zoomCenterAnchor = this.findOneAnchor('topLeft');
        } else if (anchor.name === 'bottomLeft') {
          zoomCenterAnchor = this.findOneAnchor('topRight');
        }
        if (zoomCenterAnchor === null) return;
        const centerPoint = {
          x: (topLeftPoint.x + bottomRightPoint.x) / 2,
          y: (topLeftPoint.y + bottomRightPoint.y) / 2,
        };
        const distanceFromCenter = Math.sqrt(
          Math.pow(event.worldPoint.x - centerPoint.x, 2) +
            Math.pow(event.worldPoint.y - centerPoint.y, 2)
        );
        const lastDistanceFromCenter = Math.sqrt(
          Math.pow(lastPosition.x - centerPoint.x, 2) +
            Math.pow(lastPosition.y - centerPoint.y, 2)
        );
        const deltaScale = distanceFromCenter / lastDistanceFromCenter;

        const T = new Matrix().translate(
          zoomCenterAnchor.x,
          zoomCenterAnchor.y
        );

        const T_inv = T.clone().invert();
        const S = new Matrix().scale(deltaScale, deltaScale);

        const M = T.append(S).append(T_inv);
        this.applyChangeToAllShape(M.clone());
        this.worldCoverShape.transformMatrix = M.clone().append(
          this.worldCoverShape.transformMatrix
        );

        lastPosition = event.worldPoint;
        this.updateAnchorPosition();
      });
      anchor.on('pointerup', (event) => {
        isDragging = false;
      });
    });
  }

  addRotationBehavior() {
    const rotator = new Circle(10);
    rotator.name = 'rotationAnchor';
    this.addChild(rotator);
    this.updateRotateAnchor();

    let isDragging = false;
    let lastPosition = { x: 0, y: 0 };

    rotator.on('pointerdown', (event) => {
      lastPosition = event.worldPoint;
      isDragging = true;
    });

    rotator.on('global:pointermove', (event) => {
      if (!isDragging) return;
      const rotateCenterPoint = this.worldCoverShape.localToWorld({
        x: this.worldCoverShape._width / 2,
        y: this.worldCoverShape._height / 2,
      });

      // 计算从旋转中心到上一个位置的向量
      const lastVector = {
        x: lastPosition.x - rotateCenterPoint.x,
        y: lastPosition.y - rotateCenterPoint.y,
      };

      // 计算从旋转中心到当前位置的向量
      const currentVector = {
        x: event.worldPoint.x - rotateCenterPoint.x,
        y: event.worldPoint.y - rotateCenterPoint.y,
      };

      // 计算两个向量之间的角度差
      const lastAngle = Math.atan2(lastVector.y, lastVector.x);
      const currentAngle = Math.atan2(currentVector.y, currentVector.x);

      // 计算角度增量，确保角度在 -π 到 π 之间
      let deltaAngle = currentAngle - lastAngle;

      const R = new Matrix().rotate(deltaAngle);

      const T = new Matrix().translate(
        rotateCenterPoint.x,
        rotateCenterPoint.y
      );

      this.applyChangeToAllShape(
        T.clone().append(R).append(T.clone().invert())
      );
      this.children.forEach((child) => {
        child.transformMatrix = T.clone()
          .append(R)
          .append(T.clone().invert())
          .append(child.transformMatrix);
      });
      this.updateAnchorPosition();
      lastPosition = event.worldPoint;
    });

    rotator.on('pointerup', (event) => {
      isDragging = false;
    });
  }

  findOneAnchor = (name) => {
    return this.children.find((child) => child.name?.includes(name));
  };
  updateRotateAnchor() {
    const worldCoverShape = this.worldCoverShape;

    // 获取原始的本地边界（未变换的边界）
    const width = worldCoverShape._width;

    // 计算顶边中点的本地坐标
    const topCenter = { x: width / 2, y: 0 };

    // 通过worldCoverShape的变换矩阵将本地坐标转换为正确的位置
    const transformedTopCenter =
      worldCoverShape.transformMatrix.apply(topCenter);

    const anchor = this.findOneAnchor('rotationAnchor');
    if (anchor) {
      anchor.x = transformedTopCenter.x;
      anchor.y = transformedTopCenter.y;
    }
  }

  updateZoomAnchors() {
    const worldCoverShape = this.worldCoverShape;

    // 获取原始的本地边界（未变换的边界）
    const width = worldCoverShape._width;
    const height = worldCoverShape._height;

    // 定义四个角的本地坐标（相对于worldCoverShape的本地坐标系）
    const localCorners = [
      { x: 0, y: 0 }, // topLeft
      { x: width, y: 0 }, // topRight
      { x: width, y: height }, // bottomRight
      { x: 0, y: height }, // bottomLeft
    ];

    const anchorNames = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

    localCorners.forEach((corner, index) => {
      const anchorName = anchorNames[index];
      const anchor = this.findOneAnchor(anchorName);
      if (anchor) {
        // 通过worldCoverShape的变换矩阵将本地坐标转换为正确的位置
        const transformedPoint = worldCoverShape.transformMatrix.apply(corner);
        anchor.x = transformedPoint.x;
        anchor.y = transformedPoint.y;
      }
    });
  }
  updateAnchorPosition() {
    this.updateRotateAnchor();
    this.updateZoomAnchors();
  }
}
