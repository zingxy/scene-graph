import './style.css';

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

// Set canvas resolution based on device pixel ratio
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

// Initial resize

// Mouse handling
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
  if (isDragging) {
    const offsetX = e.offsetX - dragStart.x;
    const offsetY = e.offsetY - dragStart.y;
    dragStart.x = e.offsetX;
    dragStart.y = e.offsetY;
    const dpr = 1;
    const T = new DOMMatrix([1, 0, 0, 1, offsetX * dpr, offsetY * dpr]);
    const ctm = ctx.getTransform();

    ctx.setTransform(T.multiplySelf(ctm));
    drawShapes();
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

    const ctm = ctx.getTransform();

    ctx.setTransform(T2.multiply(S).multiply(T).multiply(ctm));

    drawShapes();
  },
  { passive: false }
);

// Update drawing function to respect transformations
function drawMiniShapes(scale = 1) {
  const ctx = canvas.getContext('2d');
  ctx.save();
  // ctx.scale(scale, scale);

  // Apply transformations
  // ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  // Rectangle
  ctx.fillStyle = 'lightgrey';
  ctx.fillRect(0, 0, 1000, 1000);
  ctx.strokeRect(0, 0, 1000, 1000);

  ctx.fillStyle = 'blue';

  ctx.fillRect(50, 50, 150, 100);

  // Circle
  ctx.beginPath();
  ctx.arc(300, 100, 50, 0, Math.PI * 2);
  ctx.fillStyle = 'green';
  ctx.fill();

  // Triangle
  ctx.beginPath();
  ctx.moveTo(500, 150);
  ctx.lineTo(550, 50);
  ctx.lineTo(600, 150);
  ctx.closePath();
  ctx.fillStyle = 'red';
  ctx.fill();

  ctx.restore();
}
function drawShapes(scale = 1) {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.save();
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.scale(scale, scale);

  // Apply transformations
  // ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  // Rectangle
  ctx.fillStyle = 'lightgrey';
  ctx.fillRect(0, 0, 1000, 1000);
  ctx.strokeRect(0, 0, 1000, 1000);

  ctx.fillStyle = 'blue';

  ctx.fillRect(50, 50, 150, 100);

  // Circle
  ctx.beginPath();
  ctx.arc(300, 100, 50, 0, Math.PI * 2);
  ctx.fillStyle = 'green';
  ctx.fill();

  // Triangle
  ctx.beginPath();
  ctx.moveTo(500, 150);
  ctx.lineTo(550, 50);
  ctx.lineTo(600, 150);
  ctx.closePath();
  ctx.fillStyle = 'red';
  ctx.fill();
  drawMinimap();
}

function drawMinimap() {
  ctx.save();
  const CTM = ctx.getTransform();
  ctx.resetTransform();
  const mapwidth = 200;
  const worldwidth = 1000;
  const factor = mapwidth / worldwidth;
  ctx.strokeStyle = 'black';
  const ox = ctx.canvas.width * 0.6;
  const oy = ctx.canvas.height * 0.6;
  ctx.beginPath();
  ctx.translate(ox, oy);
  ctx.fillStyle = 'black';
  ctx.scale(factor, factor);
  ctx.fillRect(0, 0, 1000, 1000);
  drawMiniShapes(factor);

  const { a, b, c, d, e, f } = CTM.invertSelf();
  ctx.beginPath();

  ctx.transform(a, b, c, d, e, f);
  ctx.strokeStyle = 'red';
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
}

// Call drawShapes after resize
window.addEventListener('resize', () => {
  resizeCanvas();
  drawShapes();
});

resizeCanvas();
drawShapes();
