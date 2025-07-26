/**
 * Ticker 类用于控制帧率和管理渲染循环
 */
export class Ticker {
  constructor(targetFPS = 60) {
    this.targetFPS = targetFPS;
    this.targetFrameTime = 1000 / targetFPS; // 目标帧时间（毫秒）

    this.isRunning = false;
    this.callbacks = [];
    this.lastTime = 0;
    this.deltaTime = 0;
    this.currentFPS = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    this.animationId = null;
    this.timeoutId = null;

    // 绑定方法以保持正确的 this 上下文
    this.tick = this.tick.bind(this);
  }

  /**
   * 添加回调函数到渲染循环
   * @param {Function} callback - 每帧调用的回调函数
   * @param {number} priority - 优先级（数字越小优先级越高）
   */
  add(callback, priority = 0) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    const item = { callback, priority };

    // 按优先级插入到正确位置
    let inserted = false;
    for (let i = 0; i < this.callbacks.length; i++) {
      if (priority < this.callbacks[i].priority) {
        this.callbacks.splice(i, 0, item);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.callbacks.push(item);
    }

    return this;
  }

  /**
   * 移除回调函数
   * @param {Function} callback - 要移除的回调函数
   */
  remove(callback) {
    this.callbacks = this.callbacks.filter(
      (item) => item.callback !== callback
    );
    return this;
  }

  /**
   * 启动 ticker
   */
  start() {
    if (this.isRunning) return this;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsUpdateTime = this.lastTime;
    this.frameCount = 0;

    this.scheduleNextFrame();
    return this;
  }

  /**
   * 停止 ticker
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    return this;
  }

  /**
   * 调度下一帧
   */
  scheduleNextFrame() {
    if (!this.isRunning) return;

    // 对于 30 FPS 或更低的帧率，使用 setTimeout 来减少 CPU 使用
    if (this.targetFPS <= 30) {
      const delay = Math.max(0, this.targetFrameTime - 16); // 16ms 是大约 60fps 的间隔
      this.timeoutId = setTimeout(() => {
        this.animationId = requestAnimationFrame(this.tick);
      }, delay);
    } else {
      this.animationId = requestAnimationFrame(this.tick);
    }
  }

  /**
   * 设置目标帧率
   * @param {number} fps - 目标帧率
   */
  setTargetFPS(fps) {
    this.targetFPS = fps;
    this.targetFrameTime = 1000 / fps;
    return this;
  }

  /**
   * 获取当前 FPS
   * @returns {number} 当前 FPS
   */
  getFPS() {
    return this.currentFPS;
  }

  /**
   * 获取 delta time（毫秒）
   * @returns {number} delta time
   */
  getDeltaTime() {
    return this.deltaTime;
  }

  /**
   * 核心 tick 方法
   * @param {number} currentTime - 当前时间戳
   */
  tick(currentTime) {
    if (!this.isRunning) return;

    // 计算 delta time
    this.deltaTime = currentTime - this.lastTime;

    // 帧率限制 - 只有当时间间隔足够时才执行渲染
    if (this.deltaTime >= this.targetFrameTime) {
      // 更新 FPS 计算
      this.frameCount++;
      if (currentTime - this.fpsUpdateTime >= 1000) {
        this.currentFPS = Math.round(
          (this.frameCount * 1000) / (currentTime - this.fpsUpdateTime)
        );
        this.frameCount = 0;
        this.fpsUpdateTime = currentTime;
      }

      // 执行所有回调函数
      for (const item of this.callbacks) {
        try {
          item.callback(this.deltaTime, currentTime);
        } catch (error) {
          console.error('Error in ticker callback:', error);
        }
      }

      this.lastTime = currentTime;
    }

    // 调度下一帧
    this.scheduleNextFrame();
  }

  /**
   * 销毁 ticker
   */
  destroy() {
    this.stop();
    this.callbacks = [];
  }
}

/**
 * 全局 ticker 实例
 */
export const globalTicker = new Ticker();
