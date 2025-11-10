/**
 * 贝塞尔曲线生成器
 * 生成符合人类鼠标移动轨迹的贝塞尔曲线
 */

import { IPoint, IBezierControlPoint, IMousePathConfig } from '@/types/input';
import { GameAgentError } from '@/types';

/**
 * 二次贝塞尔曲线
 */
export class QuadraticBezier {
  private readonly p0: IPoint;
  private readonly p1: IPoint;
  private readonly p2: IPoint;

  constructor(p0: IPoint, p1: IPoint, p2: IPoint) {
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
  }

  /**
   * 计算曲线上的点
   */
  getPoint(t: number): IPoint {
    const x = Math.pow(1 - t, 2) * this.p0.x +
              2 * (1 - t) * t * this.p1.x +
              Math.pow(t, 2) * this.p2.x;
    const y = Math.pow(1 - t, 2) * this.p0.y +
              2 * (1 - t) * t * this.p1.y +
              Math.pow(t, 2) * this.p2.y;

    return { x, y };
  }

  /**
   * 计算曲线长度（近似）
   */
  getLength(): number {
    const steps = 100;
    let length = 0;
    let prevPoint = this.p0;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const point = this.getPoint(t);
      const distance = Math.sqrt(
        Math.pow(point.x - prevPoint.x, 2) +
        Math.pow(point.y - prevPoint.y, 2)
      );
      length += distance;
      prevPoint = point;
    }

    return length;
  }

  /**
   * 获取曲线的速度
   */
  getSpeed(t: number): IPoint {
    const dx = 2 * (1 - t) * (this.p1.x - this.p0.x) + 2 * t * (this.p2.x - this.p1.x);
    const dy = 2 * (1 - t) * (this.p1.y - this.p0.y) + 2 * t * (this.p2.y - this.p1.y);
    return { x: dx, y: dy };
  }
}

/**
 * 三次贝塞尔曲线
 */
export class CubicBezier {
  private readonly p0: IPoint;
  private readonly p1: IPoint;
  private readonly p2: IPoint;
  private readonly p3: IPoint;

  constructor(p0: IPoint, p1: IPoint, p2: IPoint, p3: IPoint) {
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
  }

  /**
   * 计算曲线上的点
   */
  getPoint(t: number): IPoint {
    const x = Math.pow(1 - t, 3) * this.p0.x +
              3 * Math.pow(1 - t, 2) * t * this.p1.x +
              3 * (1 - t) * Math.pow(t, 2) * this.p2.x +
              Math.pow(t, 3) * this.p3.x;

    const y = Math.pow(1 - t, 3) * this.p0.y +
              3 * Math.pow(1 - t, 2) * t * this.p1.y +
              3 * (1 - t) * Math.pow(t, 2) * this.p2.y +
              Math.pow(t, 3) * this.p3.y;

    return { x, y };
  }

  /**
   * 计算曲线长度（近似）
   */
  getLength(): number {
    const steps = 100;
    let length = 0;
    let prevPoint = this.p0;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const point = this.getPoint(t);
      const distance = Math.sqrt(
        Math.pow(point.x - prevPoint.x, 2) +
        Math.pow(point.y - prevPoint.y, 2)
      );
      length += distance;
      prevPoint = point;
    }

    return length;
  }
}

/**
 * 人性化贝塞尔曲线生成器
 */
export class HumanLikeBezierGenerator {
  private readonly random: () => number;

  constructor(randomGenerator?: () => number) {
    this.random = randomGenerator || Math.random;
  }

  /**
   * 生成鼠标移动路径
   */
  generateMousePath(config: IMousePathConfig): IPoint[] {
    const { startPoint, endPoint, curvature, speed, deviation, noise } = config;

    // 生成控制点
    const controlPoints = this.generateControlPoints(startPoint, endPoint, curvature, deviation);

    // 创建贝塞尔曲线
    const bezier = new CubicBezier(
      startPoint,
      controlPoints.cp1,
      controlPoints.cp2,
      endPoint
    );

    // 计算路径点
    const pathLength = bezier.getLength();
    const steps = Math.max(20, Math.min(100, pathLength / (2 * speed)));
    const points: IPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = bezier.getPoint(t);

      // 添加噪声
      const noisyPoint = this.addNoise(point, noise);
      points.push(noisyPoint);
    }

    return points;
  }

  /**
   * 生成符合人类特征的鼠标速度曲线
   */
  generateVelocityProfile(distance: number, duration: number): number[] {
    const steps = Math.max(20, Math.min(100, duration / 10));
    const velocities: number[] = [];

    // 人类鼠标移动通常有加速、匀速、减速三个阶段
    const accelRatio = 0.3; // 加速阶段占比
    const decelRatio = 0.3; // 减速阶段占比
    const constRatio = 1 - accelRatio - decelRatio; // 匀速阶段占比

    const accelSteps = Math.floor(steps * accelRatio);
    const constSteps = Math.floor(steps * constRatio);
    const decelSteps = steps - accelSteps - constSteps;

    // 加速阶段 - 非线性加速
    for (let i = 0; i < accelSteps; i++) {
      const t = i / accelSteps;
      const acceleration = 1 - Math.cos(t * Math.PI / 2); // 平滑加速
      velocities.push(acceleration);
    }

    // 匀速阶段 - 带有轻微波动
    const baseVelocity = velocities[accelSteps - 1] || 1;
    for (let i = 0; i < constSteps; i++) {
      const fluctuation = this.gaussianRandom(0, 0.05); // 5% 的波动
      velocities.push(baseVelocity + fluctuation);
    }

    // 减速阶段 - 非线性减速
    const startVelocity = velocities[accelSteps + constSteps - 1] || 1;
    for (let i = 0; i < decelSteps; i++) {
      const t = i / decelSteps;
      const deceleration = Math.cos(t * Math.PI / 2); // 平滑减速
      velocities.push(startVelocity * deceleration);
    }

    // 归一化速度以匹配总距离和时间
    const totalDistance = velocities.reduce((sum, v, i) => {
      return sum + v * (duration / steps);
    }, 0);

    const scaleFactor = distance / totalDistance;
    return velocities.map(v => v * scaleFactor);
  }

  /**
   * 生成控制点
   */
  private generateControlPoints(
    start: IPoint,
    end: IPoint,
    curvature: number,
    deviation: number
  ): { cp1: IPoint; cp2: IPoint } {
    // 计算中点和向量
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // 计算垂直向量
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      return { cp1: start, cp2: end };
    }

    // 归一化向量
    const unitX = dx / length;
    const unitY = dy / length;

    // 垂直向量 (顺时针旋转90度)
    const perpX = -unitY;
    const perpY = unitX;

    // 控制点距离
    const controlDistance = (length * curvature) / 2;

    // 添加随机偏差
    const randomDeviation = this.gaussianRandom(0, deviation);
    const finalDistance = controlDistance + randomDeviation;

    // 生成控制点
    const cp1: IPoint = {
      x: start.x + unitX * length * 0.25 + perpX * finalDistance * 0.5,
      y: start.y + unitY * length * 0.25 + perpY * finalDistance * 0.5
    };

    const cp2: IPoint = {
      x: end.x - unitX * length * 0.25 + perpX * finalDistance * 0.5,
      y: end.y - unitY * length * 0.25 + perpY * finalDistance * 0.5
    };

    return { cp1, cp2 };
  }

  /**
   * 添加噪声到点
   */
  private addNoise(point: IPoint, noiseLevel: number): IPoint {
    if (noiseLevel <= 0) {
      return point;
    }

    const noiseX = this.gaussianRandom(0, noiseLevel);
    const noiseY = this.gaussianRandom(0, noiseLevel);

    return {
      x: point.x + noiseX,
      y: point.y + noiseY
    };
  }

  /**
   * 高斯分布随机数
   */
  private gaussianRandom(mean: number, stdDev: number): number {
    // Box-Muller 变换
    let u = 0, v = 0;
    while (u === 0) u = this.random();
    while (v === 0) v = this.random();

    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
  }

  /**
   * 生成人类般的微抖动
   */
  generateMicroTremor(basePoint: IPoint, intensity: number = 0.5): IPoint {
    // 人类手部自然抖动频率约为 8-12 Hz
    const tremorX = Math.sin(Date.now() * 0.01) * intensity +
                   Math.sin(Date.now() * 0.015) * intensity * 0.5;
    const tremorY = Math.cos(Date.now() * 0.012) * intensity +
                   Math.cos(Date.now() * 0.008) * intensity * 0.3;

    return {
      x: basePoint.x + tremorX,
      y: basePoint.y + tremorY
    };
  }

  /**
   * 模拟人类瞄准时的矫正移动
   */
  generateAimingCorrection(
    currentPoint: IPoint,
    targetPoint: IPoint,
    accuracy: number = 0.8
  ): IPoint {
    // 计算误差
    const errorX = targetPoint.x - currentPoint.x;
    const errorY = targetPoint.y - currentPoint.y;
    const distance = Math.sqrt(errorX * errorX + errorY * errorY);

    if (distance < 1) {
      return currentPoint; // 已经足够接近
    }

    // 根据准确度调整矫正幅度
    const correctionFactor = (1 - accuracy) * 0.1; // 最大矫正 10%

    return {
      x: currentPoint.x + errorX * correctionFactor,
      y: currentPoint.y + errorY * correctionFactor
    };
  }
}