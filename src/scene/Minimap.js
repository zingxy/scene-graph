import { Camera } from './Camera';
import { Rect } from './DisplayObject';
import { SceneGraph } from './World';
class Minimap {
  constructor(mainWorld, canvas) {
    const minimapWorld = new SceneGraph(canvas);
    minimapWorld.camera.disabled = false;
    this.miniWorld = minimapWorld;
    this.mainWorld = mainWorld;
    this.miniWorld.stage.addChild(this.mainWorld.stage);
    this.mainWorld.parent = null;
    this.miniWorld.camera.transformMatrix
      .scaleSelf(0.5, 0.5)
      .translateSelf(100, 100);
    this.cameraRect = this.miniWorld.stage.addChild(
      new Rect(canvas.width, canvas.height)
    );
    this.update();
  }
  update() {
    this.cameraRect.transformMatrix =
      this.mainWorld.camera.transformMatrix.invert();
    requestAnimationFrame(() => {
      this.update();
    });
  }
  render() {
    this.miniWorld.render('minimap');
  }
}

export { Minimap };
