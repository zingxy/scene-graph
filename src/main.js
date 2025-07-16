import './style.css';
import { SceneGraph, Camera, Rect, Circle } from './scehe-graph';

const canvas = document.querySelector('#canvas');

const world = new SceneGraph(canvas);

const circle = world.stage.addChild(new Circle(50));
circle.transformMatrix = new DOMMatrix().translate(100, 100);
const rect = world.stage.addChild(new Rect(100, 50));
world.render();
