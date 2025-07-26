export function drawCoordinateSystem(ctx) {
  // 设定坐标系的中心
  const centerX = -1;
  const centerY = -1;

  // 坐标轴长度
  const axisLength = 199;
  // 绘制箭头函数
  function drawArrow(x, y, axis) {
    const arrowSize = 9; // 箭头大小
    ctx.beginPath();

    if (axis === 'x') {
      // X 轴箭头：右侧箭头
      ctx.moveTo(x - arrowSize, y - arrowSize / 1); // 左侧箭头
      ctx.lineTo(x, y);
      ctx.lineTo(x - arrowSize, y + arrowSize / 1); // 右侧箭头
    } else if (axis === 'y') {
      // Y 轴箭头：下侧箭头
      ctx.moveTo(x - arrowSize / 1, y - arrowSize); // 上侧箭头
      ctx.lineTo(x, y);
      ctx.lineTo(x + arrowSize / 1, y - arrowSize); // 下侧箭头
    }

    ctx.stroke();
  }
  // 设置样式
  ctx.save();
  ctx.fillStyle = 'blue'; // 原点颜色
  ctx.beginPath();
  ctx.arc(centerX, centerY, 9, 0, Math.PI * 2); // 绘制原点
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 1; // 设置线条宽度
  ctx.strokeStyle = 'red'; // 坐标轴颜色
  ctx.fillStyle = 'red'; // 文本颜色
  ctx.font = '15px Arial';

  // 绘制 X 轴（水平）
  ctx.beginPath();
  ctx.moveTo(centerX - 9, centerY); // 从左边开始
  ctx.lineTo(centerX + axisLength, centerY); // 到右边结束
  ctx.stroke();
  // 绘制 X 轴箭头（指向右侧）
  drawArrow(centerX + axisLength, centerY, 'x');
  ctx.fillText('X', centerX + axisLength + 9, centerY - 10);

  ctx.strokeStyle = 'green'; // 坐标轴颜色
  ctx.fillStyle = 'green'; // 文本颜色
  // 绘制 Y 轴（垂直）
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 9); // 从上面开始
  ctx.lineTo(centerX, centerY + axisLength); // 到下面结束
  ctx.stroke();
  // 绘制 Y 轴箭头（指向下方）
  drawArrow(centerX, centerY + axisLength, 'y');

  // 添加轴标签
  ctx.fillText('Y', centerX - 9, centerY + axisLength + 20);
  ctx.restore();
}

export const noop = () => {};
