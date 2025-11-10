/**
 * 人性化输入模拟器
 * 模拟真实的鼠标和键盘输入，避免被反作弊系统检测
 */

import * as robot from 'robotjs';
import { IPoint, IInputEvent, IInputSession, IHumanBehaviorProfile } from '@/types';
import {
  IMousePathConfig,
  IKeyboardInputConfig,
  IInputDelayConfig,
  IInputStatistics
} from '@/types/input';
import { HumanLikeBezierGenerator } from './bezier-generator';
import { IntelligentDelayCalculator, HumanReactionModel } from './delay-calculator';
import { logger } from '@/utils/logger';
import { GameAgentError } from '@/types';

/**
 * 输入模拟器配置
 */
interface IInputSimulatorConfig {
  enableRealTimeMode: boolean;
  enableMicroTremors: boolean;
  enableErrorSimulation: boolean;
  humanAccuracyLevel: number; // 0-1，越高越精确
  speedVariationLevel: number; // 0-1，速度变化程度
  errorRate: number; // 0-1，错误率
}

/**
 * 人性化输入模拟器
 */
export class HumanInputSimulator {
  private readonly config: IInputSimulatorConfig;
  private readonly bezierGenerator: HumanLikeBezierGenerator;
  private readonly delayCalculator: IntelligentDelayCalculator;
  private readonly session: IInputSession;
  private readonly statistics: IInputStatistics;
  private readonly eventHistory: IInputEvent[];

  constructor(
    session: IInputSession,
    config: Partial<IInputSimulatorConfig> = {}
  ) {
    this.session = session;
    this.eventHistory = [];

    // 默认配置
    this.config = {
      enableRealTimeMode: true,
      enableMicroTremors: true,
      enableErrorSimulation: true,
      humanAccuracyLevel: 0.85,
      speedVariationLevel: 0.3,
      errorRate: 0.02, // 2% 错误率
      ...config
    };

    // 初始化组件
    this.bezierGenerator = new HumanLikeBezierGenerator();
    this.delayCalculator = new IntelligentDelayCalculator(session);

    // 初始化统计信息
    this.statistics = {
      totalEvents: 0,
      averageReactionTime: 0,
      mousePathAccuracy: 0,
      errorRate: 0,
      fatigueScore: 0,
      humanLikenessScore: 0,
      lastUpdate: new Date()
    };

    // 配置 robotjs
    this.configureRobotJS();

    logger.info('人性化输入模拟器已初始化', { config: this.config });
  }

  /**
   * 模拟鼠标移动
   */
  async simulateMouseMove(
    targetPoint: IPoint,
    options: {
      duration?: number;
      curvature?: number;
      deviation?: number;
      targetSize?: number;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();
    const currentPos = robot.getMousePos();

    // 记录开始事件
    this.recordEvent({
      id: this.generateEventId(),
      type: 'mouse_move',
      timestamp: new Date(),
      position: currentPos,
      duration: 0,
      confidence: 0,
      metadata: { targetPoint, options }
    });

    try {
      // 生成鼠标路径
      const pathConfig: IMousePathConfig = {
        startPoint: currentPos,
        endPoint: targetPoint,
        curvature: options.curvature || 0.3,
        speed: this.config.speedVariationLevel,
        deviation: options.deviation || 5,
        noise: this.config.enableMicroTremors ? 0.5 : 0
      };

      const path = this.bezierGenerator.generateMousePath(pathConfig);

      // 计算移动时间
      const distance = Math.sqrt(
        Math.pow(targetPoint.x - currentPos.x, 2) +
        Math.pow(targetPoint.y - currentPos.y, 2)
      );
      const moveDuration = options.duration ||
        this.delayCalculator.calculateMouseMoveDelay(distance, options.targetSize);

      // 执行鼠标移动
      await this.executeMouseMovement(path, moveDuration);

      // 记录完成事件
      const actualDuration = Date.now() - startTime;
      this.recordEvent({
        id: this.generateEventId(),
        type: 'mouse_move',
        timestamp: new Date(),
        position: targetPoint,
        duration: actualDuration,
        confidence: this.calculateHumanLikeness('mouse_move', actualDuration, moveDuration),
        metadata: { pathLength: path.length, distance }
      });

      // 更新会话统计
      this.session.operationCount++;

      logger.debug(`鼠标移动完成: (${currentPos.x},${currentPos.y}) -> (${targetPoint.x},${targetPoint.y})`, {
        duration: actualDuration,
        distance
      });

    } catch (error) {
      this.session.errorCount++;
      throw new GameAgentError(
        `鼠标移动失败: ${error}`,
        'MOUSE_MOVE_ERROR',
        'input',
        { currentPos, targetPoint, error }
      );
    }
  }

  /**
   * 模拟鼠标点击
   */
  async simulateMouseClick(
    button: 'left' | 'right' | 'middle' = 'left',
    position?: IPoint,
    options: {
      doubleClick?: boolean;
      holdDuration?: number;
      precisionLevel?: number;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();

    // 如果指定了位置，先移动到该位置
    if (position) {
      await this.simulateMouseMove(position, {
        targetSize: options.precisionLevel ? 10 : 20
      });
    }

    // 添加点击前的延迟
    const preClickDelay = this.delayCalculator.calculateDelay(
      {
        baseDelay: 100,
        variance: 50,
        distribution: 'gaussian',
        fatigueMultiplier: 1
      },
      {
        operationType: 'simple_click',
        importance: 0.5
      }
    );

    await this.sleep(preClickDelay);

    try {
      // 执行点击
      const clickDuration = options.holdDuration || this.generateClickDuration();

      robot.mouseToggle('down', button);
      await this.sleep(clickDuration);
      robot.mouseToggle('up', button);

      // 双击处理
      if (options.doubleClick) {
        const doubleClickDelay = this.delayCalculator.calculateDelay(
          {
            baseDelay: 50,
            variance: 20,
            distribution: 'gaussian',
            fatigueMultiplier: 1
          }
        );
        await this.sleep(doubleClickDelay);

        robot.mouseToggle('down', button);
        await this.sleep(clickDuration);
        robot.mouseToggle('up', button);
      }

      // 记录点击事件
      const actualDuration = Date.now() - startTime;
      this.recordEvent({
        id: this.generateEventId(),
        type: 'mouse_click',
        timestamp: new Date(),
        position: position || robot.getMousePos(),
        duration: actualDuration,
        confidence: this.calculateHumanLikeness('mouse_click', actualDuration),
        metadata: { button, doubleClick: options.doubleClick, clickDuration }
      });

      this.session.operationCount++;

      logger.debug(`鼠标点击完成: ${button}${options.doubleClick ? ' (双击)' : ''}`, {
        position,
        duration: actualDuration
      });

    } catch (error) {
      this.session.errorCount++;
      throw new GameAgentError(
        `鼠标点击失败: ${error}`,
        'MOUSE_CLICK_ERROR',
        'input',
        { button, position, error }
      );
    }
  }

  /**
   * 模拟键盘按键
   */
  async simulateKeyPress(
    config: IKeyboardInputConfig,
    options: {
      simulateTyping?: boolean;
      expected?: boolean;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // 计算按键前延迟
      const preKeyDelay = this.delayCalculator.calculateKeyPressDelay(config.key, config.modifiers?.length > 0);

      // 如果是模拟打字，添加犹豫时间
      if (options.simulateTyping) {
        const hesitationTime = this.delayCalculator.calculateHesitationTime(0.05);
        await this.sleep(preKeyDelay + hesitationTime);
      } else {
        await this.sleep(preKeyDelay);
      }

      // 处理修饰键
      if (config.modifiers) {
        for (const modifier of config.modifiers) {
          robot.keyToggle(modifier, 'down');
          await this.sleep(20); // 修饰键间的小延迟
        }
      }

      // 按下主键
      robot.keyToggle(config.key, 'down');
      await this.sleep(config.duration);
      robot.keyToggle(config.key, 'up');

      // 释放修饰键
      if (config.modifiers) {
        for (const modifier of config.modifiers.reverse()) {
          await this.sleep(10);
          robot.keyToggle(modifier, 'up');
        }
      }

      // 按键后延迟
      if (config.delay) {
        await this.sleep(config.delay);
      }

      // 记录按键事件
      const actualDuration = Date.now() - startTime;
      this.recordEvent({
        id: this.generateEventId(),
        type: 'key_press',
        timestamp: new Date(),
        key: config.key,
        duration: actualDuration,
        confidence: this.calculateHumanLikeness('key_press', actualDuration, config.duration),
        metadata: { modifiers: config.modifiers, pressure: config.pressure }
      });

      this.session.operationCount++;

      logger.debug(`键盘按键完成: ${config.key}${config.modifiers ? ` + ${config.modifiers.join('+')}` : ''}`, {
        duration: actualDuration
      });

    } catch (error) {
      this.session.errorCount++;
      throw new GameAgentError(
        `键盘按键失败: ${error}`,
        'KEY_PRESS_ERROR',
        'input',
        { config, error }
      );
    }
  }

  /**
   * 模拟拖拽操作
   */
  async simulateDragDrop(
    startPoint: IPoint,
    endPoint: IPoint,
    options: {
      duration?: number;
      button?: 'left' | 'right';
      intermediatePoints?: IPoint[];
    } = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // 移动到起始点
      await this.simulateMouseMove(startPoint);

      // 开始拖拽
      const button = options.button || 'left';
      robot.mouseToggle('down', button);
      await this.sleep(50); // 抓取延迟

      // 如果有中间点，经过它们
      if (options.intermediatePoints && options.intermediatePoints.length > 0) {
        const allPoints = [startPoint, ...options.intermediatePoints, endPoint];
        for (let i = 1; i < allPoints.length; i++) {
          await this.simulateMouseMove(allPoints[i]);
          await this.sleep(30); // 中间停顿
        }
      } else {
        // 直接移动到终点
        await this.simulateMouseMove(endPoint, {
          duration: options.duration
        });
      }

      // 释放拖拽
      await this.sleep(100); // 释放前的短暂停顿
      robot.mouseToggle('up', button);

      // 记录拖拽事件
      const actualDuration = Date.now() - startTime;
      this.recordEvent({
        id: this.generateEventId(),
        type: 'mouse_drag',
        timestamp: new Date(),
        position: endPoint,
        duration: actualDuration,
        confidence: this.calculateHumanLikeness('mouse_drag', actualDuration),
        metadata: { startPoint, endPoint, button }
      });

      this.session.operationCount++;

      logger.debug(`拖拽操作完成: (${startPoint.x},${startPoint.y}) -> (${endPoint.x},${endPoint.y})`, {
        duration: actualDuration
      });

    } catch (error) {
      this.session.errorCount++;
      throw new GameAgentError(
        `拖拽操作失败: ${error}`,
        'DRAG_DROP_ERROR',
        'input',
        { startPoint, endPoint, error }
      );
    }
  }

  /**
   * 获取输入统计
   */
  getStatistics(): IInputStatistics {
    // 更新统计信息
    this.updateStatistics();

    return { ...this.statistics };
  }

  /**
   * 获取会话信息
   */
  getSession(): IInputSession {
    return { ...this.session };
  }

  /**
   * 更新会话特征
   */
  updateSessionCharacteristics(characteristics: Partial<IHumanBehaviorProfile>): void {
    Object.assign(this.session.characteristics, characteristics);
    logger.debug('会话特征已更新', { characteristics });
  }

  /**
   * 执行鼠标移动路径
   */
  private async executeMouseMovement(path: IPoint[], duration: number): Promise<void> {
    if (path.length < 2) return;

    const steps = path.length - 1;
    const stepDuration = duration / steps;

    for (let i = 1; i < path.length; i++) {
      const point = path[i];

      // 添加微抖动
      if (this.config.enableMicroTremors) {
        const tremorPoint = this.bezierGenerator.generateMicroTremor(point, 0.3);
        robot.moveMouse(tremorPoint.x, tremorPoint.y);
      } else {
        robot.moveMouse(point.x, point.y);
      }

      await this.sleep(stepDuration);
    }
  }

  /**
   * 生成点击持续时间
   */
  private generateClickDuration(): number {
    const baseDuration = 50;
    const variation = 30;
    return baseDuration + (Math.random() - 0.5) * 2 * variation;
  }

  /**
   * 计算人类相似度置信度
   */
  private calculateHumanLikeness(
    operationType: string,
    actualDuration: number,
    expectedDuration?: number
  ): number {
    let confidence = this.config.humanAccuracyLevel;

    // 基于持续时间调整置信度
    if (expectedDuration) {
      const deviation = Math.abs(actualDuration - expectedDuration) / expectedDuration;
      confidence -= deviation * 0.5; // 偏差越大，置信度越低
    }

    // 基于操作类型调整
    const typeMultipliers: Record<string, number> = {
      'mouse_move': 1.0,
      'mouse_click': 0.95,
      'key_press': 0.9,
      'mouse_drag': 0.85
    };

    confidence *= typeMultipliers[operationType] || 0.9;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 记录输入事件
   */
  private recordEvent(event: IInputEvent): void {
    this.eventHistory.push(event);
    this.statistics.totalEvents++;
    this.statistics.lastUpdate = new Date();

    // 保持历史记录在合理范围内
    if (this.eventHistory.length > 1000) {
      this.eventHistory.splice(0, 500);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(): void {
    if (this.eventHistory.length === 0) return;

    // 计算平均反应时间
    const totalReactionTime = this.eventHistory.reduce((sum, event) => sum + event.duration, 0);
    this.statistics.averageReactionTime = totalReactionTime / this.eventHistory.length;

    // 计算错误率
    this.statistics.errorRate = this.session.operationCount > 0
      ? this.session.errorCount / this.session.operationCount
      : 0;

    // 计算人类相似度平均分
    const totalConfidence = this.eventHistory.reduce((sum, event) => sum + event.confidence, 0);
    this.statistics.humanLikenessScore = totalConfidence / this.eventHistory.length;

    // 更新疲劳分数
    this.statistics.fatigueScore = this.session.fatigueLevel;
  }

  /**
   * 配置 RobotJS
   */
  private configureRobotJS(): void {
    // 设置鼠标速度 (robotjs 内部参数)
    robot.setMouseDelay(2); // 2ms 延迟，确保平滑移动
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 休眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
  }
}