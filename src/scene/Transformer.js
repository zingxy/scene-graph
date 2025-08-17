import { Container, Circle, Rect } from './DisplayObject';
import { Matrix } from 'pixi.js';

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
    let points = [];
    this.shapes.forEach((shape) => {
      const bounds = shape.getAnchors();
      points.push(bounds[0], bounds[1], bounds[2], bounds[3]);
    });
    let minX = Math.min(...points.map((p) => p.x));
    let minY = Math.min(...points.map((p) => p.y));
    let maxX = Math.max(...points.map((p) => p.x));
    let maxY = Math.max(...points.map((p) => p.y));
    return { minX, minY, maxX, maxY };
  }
  prepare() {
    const worldBounds = this.getAnchors();
    const worldCoverShape = new Rect(
      worldBounds.maxX - worldBounds.minX,
      worldBounds.maxY - worldBounds.minY
    );
    worldCoverShape.x = worldBounds.minX;
    worldCoverShape.y = worldBounds.minY;
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
      this.updateRotateAnchor();
      this.updateZoomAnchors();
      lastPosition = event.worldPoint;
    });

    worldCoverShape.on('pointerup', (event) => {
      isDragging = false;
    });
    this.worldCoverShape = worldCoverShape;
  }

  addZoomBehavior() {
    const worldBounds = this.getAnchors();
    const topLeftPoint = {
      x: worldBounds.minX,
      y: worldBounds.minY,
      name: 'topLeft',
    };
    const topRightPoint = {
      x: worldBounds.maxX,
      y: worldBounds.minY,
      name: 'topRight',
    };
    const bottomRightPoint = {
      x: worldBounds.maxX,
      y: worldBounds.maxY,
      name: 'bottomRight',
    };
    const bottomLeftPoint = {
      x: worldBounds.minX,
      y: worldBounds.maxY,
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

    const worldBounds = this.getAnchors();

    const topLeftPoint = { x: worldBounds.minX, y: worldBounds.minY };
    const topRightPoint = { x: worldBounds.maxX, y: worldBounds.minY };
    const bottomRightPoint = { x: worldBounds.maxX, y: worldBounds.maxY };
    const bottomLeftPoint = { x: worldBounds.minX, y: worldBounds.maxY };

    rotator.x = (topLeftPoint.x + topRightPoint.x) / 2;
    rotator.y = (topLeftPoint.y + topRightPoint.y) / 2;

    let isDragging = false;
    let lastPosition = { x: 0, y: 0 };

    rotator.on('pointerdown', (event) => {
      lastPosition = event.worldPoint;
      isDragging = true;
    });

    rotator.on('global:pointermove', (event) => {
      if (!isDragging) return;

      const worldBounds = this.getAnchors();
      const topLeftPoint = { x: worldBounds.minX, y: worldBounds.minY };
      const bottomRightPoint = { x: worldBounds.maxX, y: worldBounds.maxY };

      const rotateCenterPoint = {
        x: (topLeftPoint.x + bottomRightPoint.x) / 2,
        y: (topLeftPoint.y + bottomRightPoint.y) / 2,
      };

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
