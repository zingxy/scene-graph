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
export function getRandomColor() {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F06292',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 浏览器兼容的简单 Logger 实现
 */
class BrowserLogger {
  constructor(level = 'info') {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    this.currentLevel = this.levels[level] || this.levels.info;

    // 定义每个级别的样式
    this.styles = {
      error:
        'background: #ff4757; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      warn: 'background: #ffa502; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      info: 'background: #3742fa; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      debug:
        'background: #747d8c; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    };
  }

  _formatMessage(level, message, ...args) {
    // 使用 performance.now() 获取高精度时间戳
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    // 添加微秒级精度（基于 performance.now()）
    const performanceTime = performance.now();
    const microseconds = String(
      Math.floor((performanceTime % 1) * 1000)
    ).padStart(3, '0');

    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}.${microseconds}`;

    const levelStyle = this.styles[level];
    return {
      formatted: [
        `%c${level.toUpperCase()}%c [${timestamp}] ${message}`,
        levelStyle,
        '',
        ...args,
      ],
      plain: [`[${timestamp}] [${level.toUpperCase()}] ${message}`, ...args],
    };
  }

  error(message, ...args) {
    if (this.currentLevel >= this.levels.error) {
      const { formatted } = this._formatMessage('error', message, ...args);
      console.error(...formatted);
    }
  }

  warn(message, ...args) {
    if (this.currentLevel >= this.levels.warn) {
      const { formatted } = this._formatMessage('warn', message, ...args);
      console.warn(...formatted);
    }
  }

  info(message, ...args) {
    if (this.currentLevel >= this.levels.info) {
      const { formatted } = this._formatMessage('info', message, ...args);
      console.info(...formatted);
    }
  }

  debug(message, ...args) {
    if (this.currentLevel >= this.levels.debug) {
      const { formatted } = this._formatMessage('debug', message, ...args);
      console.log(...formatted);
    }
  }

  setLevel(level) {
    this.currentLevel = this.levels[level] || this.levels.info;
    this.info(`Logger level set to: ${level}`);
  }

  // 添加一个方法来显示所有可用的级别
  showLevels() {
    console.group('Available Log Levels:');
    Object.keys(this.levels).forEach((level) => {
      const style = this.styles[level];
      console.log(
        `%c${level.toUpperCase()}%c - Level ${this.levels[level]}`,
        style,
        ''
      );
    });
    console.groupEnd();
  }
}

export const logger = new BrowserLogger('info');
