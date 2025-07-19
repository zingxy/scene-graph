import { Camera } from './Camera';
import { Rect } from './DisplayObject';
import { SceneGraph } from './World';
class Minimap {
  constructor(mainWorld, canvas) {
    const minimapWorld = new SceneGraph(canvas);
    this.miniWorld = minimapWorld;
    this.mainWorld = mainWorld;
    this.miniWorld.stage.addChild(this.mainWorld.stage);
    this.mainWorld.parent = null;
    this.cameraRect = this.miniWorld.stage.addChild(
      new Rect(canvas.width, canvas.height)
    );
    this.update();
  }
  update() {
    this.cameraRect.transformMatrix =
      this.mainWorld.camera.transformMatrix.inverse();
    requestAnimationFrame(() => {
      this.update();
    });
  }
  render() {
    this.miniWorld.render();
  }
}

export { Minimap };
