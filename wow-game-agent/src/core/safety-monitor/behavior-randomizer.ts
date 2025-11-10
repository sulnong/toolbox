/**
 * 行为随机化系统
 * 为输入操作添加自然的变化，避免机械化的可检测模式
 */

import { IPoint, IInputEvent } from '@/types';
import { IHumanBehaviorProfile, IInputSession } from '@/types/input';
import { logger } from '@/utils/logger';
import { GameAgentError } from '@/types';

/**
 * 随机化策略类型
 */
export enum RandomizationStrategy {
  SUBTLE = 'subtle',      // 轻微随机化，保持精确性
  MODERATE = 'moderate',  // 适度随机化，平衡自然度和精确性
  NATURAL = 'natural',    // 自然随机化，优先考虑人类行为特征
  CHAOTIC = 'chaotic'     // 高度随机化，用于避免严格检测
}

/**
 * 行为模式配置
 */
interface IBehaviorPatternConfig {
  strategy: RandomizationStrategy;
  rhythmicVariation: number;    // 节奏变化 0-1
  errorSimulation: number;      // 错误模拟 0-1
  attentionDrift: number;       // 注意力漂移 0-1
  fatigueProgression: number;   // 疲劳进展 0-1
  microAdjustments: number;     // 微调程度 0-1
}

/**
 * 行为变异类型
 */
enum BehaviorVariationType {
  TIMING_OFFSET = 'timing_offset',        // 时间偏移
  SPATIAL_DEVIATION = 'spatial_deviation', // 空间偏差
  SEQUENCE_REVERSAL = 'sequence_reversal', // 序列反转
  EXTRA_PAUSE = 'extra_pause',            // 额外暂停
  DOUBLE_TAP = 'double_tap',              // 双击
  MISCLICK = 'misclick',                  // 误点
  CORRECTION_MOVE = 'correction_move'     // 纠正移动
}

/**
 * 行为变异记录
 */
interface IBehaviorVariation {
  type: BehaviorVariationType;
  timestamp: Date;
  originalAction: string;
  modifiedAction: string;
  severity: number; // 0-1，对行为的影响程度
  description: string;
}

/**
 * 注意力状态
 */
interface IAttentionState {
  level: number;           // 0-1，注意力水平
  focusPoint?: IPoint;     // 当前注意力焦点
  driftVector: IPoint;     // 注意力漂移向量
  lastFocusChange: Date;   // 上次焦点变化时间
}

/**
 * 行为随机化器
 */
export class BehaviorRandomizer {
  private readonly config: IBehaviorPatternConfig;
  private readonly session: IInputSession;
  private readonly variations: IBehaviorVariation[];
  private readonly attentionState: IAttentionState;
  private readonly random: () => number;

  // 行为统计
  private operationHistory: Array<{
    timestamp: Date;
    operation: string;
    baseTiming: number;
    actualTiming: number;
    variation: IBehaviorVariation[];
  }> = [];

  constructor(
    session: IInputSession,
    config: Partial<IBehaviorPatternConfig> = {}
  ) {
    this.session = session;
    this.variations = [];

    // 默认配置
    this.config = {
      strategy: RandomizationStrategy.MODERATE,
      rhythmicVariation: 0.3,
      errorSimulation: 0.02,
      attentionDrift: 0.2,
      fatigueProgression: 0.1,
      microAdjustments: 0.15,
      ...config
    };

    // 初始化注意力状态
    this.attentionState = {
      level: 0.8, // 初始注意力水平
      driftVector: { x: 0, y: 0 },
      lastFocusChange: new Date()
    };

    this.random = Math.random;

    logger.info('行为随机化器已初始化', {
      config: this.config,
      sessionId: session.id
    });
  }

  /**
   * 随机化操作延迟
   */
  randomizeDelay(baseDelay: number, context: {
    operationType?: string;
    complexity?: number;
    importance?: number;
  } = {}): { delay: number; variations: IBehaviorVariation[] } {
    const variations: IBehaviorVariation[] = [];
    let adjustedDelay = baseDelay;

    try {
      // 节奏变化
      const rhythmicVariation = this.applyRhythmicVariation(baseDelay);
      if (rhythmicVariation.offset !== 0) {
        adjustedDelay += rhythmicVariation.offset;
        variations.push(rhythmicVariation.variation);
      }

      // 注意力漂移影响
      const attentionImpact = this.applyAttentionImpact(baseDelay);
      if (attentionImpact.offset !== 0) {
        adjustedDelay += attentionImpact.offset;
        variations.push(attentionImpact.variation);
      }

      // 疲劳影响
      const fatigueImpact = this.applyFatigueImpact(baseDelay);
      if (fatigueImpact.offset !== 0) {
        adjustedDelay += fatigueImpact.offset;
        variations.push(fatigueImpact.variation);
      }

      // 策略性随机化
      const strategicVariation = this.applyStrategicRandomization(baseDelay, context);
      if (strategicVariation.offset !== 0) {
        adjustedDelay += strategicVariation.offset;
        variations.push(strategicVariation.variation);
      }

      // 确保延迟在合理范围内
      const minDelay = baseDelay * 0.3;
      const maxDelay = baseDelay * 3.0;
      adjustedDelay = Math.max(minDelay, Math.min(maxDelay, adjustedDelay));

      // 记录操作历史
      this.operationHistory.push({
        timestamp: new Date(),
        operation: context.operationType || 'unknown',
        baseTiming: baseDelay,
        actualTiming: adjustedDelay,
        variations
      });

      // 保持历史记录在合理范围内
      if (this.operationHistory.length > 1000) {
        this.operationHistory.splice(0, 500);
      }

      logger.debug(`延迟随机化: ${baseDelay}ms -> ${adjustedDelay}ms`, {
        variations: variations.length,
        context
      });

      return { delay: adjustedDelay, variations };

    } catch (error) {
      throw new GameAgentError(
        `延迟随机化失败: ${error}`,
        'DELAY_RANDOMIZATION_ERROR',
        'input',
        { baseDelay, context, error }
      );
    }
  }

  /**
   * 随机化鼠标位置
   */
  randomizeMousePosition(targetPosition: IPoint, context: {
    operationType?: string;
    targetSize?: number;
    precision?: number;
  } = {}): { position: IPoint; variations: IBehaviorVariation[] } {
    const variations: IBehaviorVariation[] = [];
    let adjustedPosition = { ...targetPosition };

    try {
      // 精度偏差
      const precisionDeviation = this.applyPrecisionDeviation(targetPosition, context.targetSize, context.precision);
      if (precisionDeviation.offset.x !== 0 || precisionDeviation.offset.y !== 0) {
        adjustedPosition.x += precisionDeviation.offset.x;
        adjustedPosition.y += precisionDeviation.offset.y;
        variations.push(precisionDeviation.variation);
      }

      // 注意力漂移影响
      const attentionDrift = this.applyAttentionDrift(targetPosition);
      if (attentionDrift.offset.x !== 0 || attentionDrift.offset.y !== 0) {
        adjustedPosition.x += attentionDrift.offset.x;
        adjustedPosition.y += attentionDrift.offset.y;
        variations.push(attentionDrift.variation);
      }

      // 微调
      const microAdjustment = this.applyMicroAdjustment(targetPosition);
      if (microAdjustment.offset.x !== 0 || microAdjustment.offset.y !== 0) {
        adjustedPosition.x += microAdjustment.offset.x;
        adjustedPosition.y += microAdjustment.offset.y;
        variations.push(microAdjustment.variation);
      }

      // 模拟误点
      if (this.shouldSimulateError(context.operationType)) {
        const misclick = this.simulateMisclick(targetPosition, context.targetSize);
        adjustedPosition = misclick.position;
        variations.push(misclick.variation);
      }

      logger.debug(`鼠标位置随机化: (${targetPosition.x},${targetPosition.y}) -> (${adjustedPosition.x},${adjustedPosition.y})`, {
        variations: variations.length,
        context
      });

      return { position: adjustedPosition, variations };

    } catch (error) {
      throw new GameAgentError(
        `鼠标位置随机化失败: ${error}`,
        'POSITION_RANDOMIZATION_ERROR',
        'input',
        { targetPosition, context, error }
      );
    }
  }

  /**
   * 随机化操作序列
   */
  randomizeOperationSequence<T>(sequence: T[], context: {
    operationType?: string;
    allowReordering?: boolean;
    allowOmission?: boolean;
    allowDuplication?: boolean;
  } = {}): { sequence: T[]; variations: IBehaviorVariation[] } {
    const variations: IBehaviorVariation[] = [];
    let adjustedSequence = [...sequence];

    try {
      // 序列重排序
      if (context.allowReordering && this.shouldReorderSequence()) {
        const reorderVariation = this.reorderSequence(adjustedSequence);
        adjustedSequence = reorderVariation.sequence;
        variations.push(reorderVariation.variation);
      }

      // 模拟遗漏操作
      if (context.allowOmission && this.shouldOmitOperation()) {
        const omissionVariation = this.omitOperation(adjustedSequence);
        adjustedSequence = omissionVariation.sequence;
        variations.push(omissionVariation.variation);
      }

      // 模拟重复操作
      if (context.allowDuplication && this.shouldDuplicateOperation()) {
        const duplicationVariation = this.duplicateOperation(adjustedSequence);
        adjustedSequence = duplicationVariation.sequence;
        variations.push(duplicationVariation.variation);
      }

      logger.debug(`操作序列随机化: ${sequence.length} -> ${adjustedSequence.length} 操作`, {
        variations: variations.length,
        context
      });

      return { sequence: adjustedSequence, variations };

    } catch (error) {
      throw new GameAgentError(
        `操作序列随机化失败: ${error}`,
        'SEQUENCE_RANDOMIZATION_ERROR',
        'input',
        { sequenceLength: sequence.length, context, error }
      );
    }
  }

  /**
   * 更新注意力状态
   */
  updateAttentionState(stimulus?: {
    intensity?: number;
    novelty?: number;
    complexity?: number;
  }): void {
    const { intensity = 0.5, novelty = 0.5, complexity = 0.5 } = stimulus || {};

    // 计算注意力变化
    let attentionDelta = 0;

    // 强烈刺激提高注意力
    attentionDelta += (intensity - 0.5) * 0.2;

    // 新颖刺激提高注意力
    attentionDelta += novelty * 0.3;

    // 复杂刺激可能降低注意力
    attentionDelta -= (complexity - 0.5) * 0.1;

    // 自然衰减
    attentionDelta -= 0.02; // 每2%的注意力自然衰减

    // 更新注意力水平
    this.attentionState.level = Math.max(0.1, Math.min(1.0,
      this.attentionState.level + attentionDelta
    ));

    // 更新注意力漂移
    this.updateAttentionDrift();

    // 随机改变焦点
    if (this.random() < 0.05) { // 5% 概率改变焦点
      this.attentionState.focusPoint = {
        x: this.random() * 1920, // 假设 1920x1080 屏幕
        y: this.random() * 1080
      };
      this.attentionState.lastFocusChange = new Date();
    }

    logger.debug(`注意力状态更新: ${this.attentionState.level.toFixed(2)}`, {
      delta: attentionDelta,
      stimulus
    });
  }

  /**
   * 获取随机化统计信息
   */
  getStatistics(): {
    totalVariations: number;
    variationRate: number;
    averageVariationSeverity: number;
    attentionLevel: number;
    commonVariationTypes: Record<string, number>;
  } {
    const totalVariations = this.variations.length;
    const totalOperations = this.operationHistory.length;
    const variationRate = totalOperations > 0 ? totalVariations / totalOperations : 0;

    const averageSeverity = totalVariations > 0
      ? this.variations.reduce((sum, v) => sum + v.severity, 0) / totalVariations
      : 0;

    const commonTypes: Record<string, number> = {};
    this.variations.forEach(v => {
      commonTypes[v.type] = (commonTypes[v.type] || 0) + 1;
    });

    return {
      totalVariations,
      variationRate,
      averageVariationSeverity: averageSeverity,
      attentionLevel: this.attentionState.level,
      commonVariationTypes: commonTypes
    };
  }

  /**
   * 应用节奏变化
   */
  private applyRhythmicVariation(baseDelay: number): {
    offset: number;
    variation: IBehaviorVariation;
  } {
    if (this.config.rhythmicVariation === 0) {
      return { offset: 0, variation: null as any };
    }

    // 检测历史节奏
    const recentDelays = this.operationHistory
      .slice(-10)
      .map(op => op.actualTiming);

    let rhythmicOffset = 0;

    if (recentDelays.length >= 3) {
      // 计算节奏模式
      const avgDelay = recentDelays.reduce((sum, delay) => sum + delay, 0) / recentDelays.length;
      const variance = this.calculateVariance(recentDelays);

      // 如果方差小，说明有节奏，添加变化
      if (variance < avgDelay * 0.3) {
        rhythmicOffset = (this.random() - 0.5) * baseDelay * this.config.rhythmicVariation * 0.5;
      }
    } else {
      // 没有足够历史，随机变化
      rhythmicOffset = (this.random() - 0.5) * baseDelay * this.config.rhythmicVariation;
    }

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.TIMING_OFFSET,
      timestamp: new Date(),
      originalAction: `delay: ${baseDelay}ms`,
      modifiedAction: `delay: ${baseDelay + rhythmicOffset}ms`,
      severity: Math.abs(rhythmicOffset / baseDelay),
      description: '节奏变化调整'
    };

    this.variations.push(variation);

    return { offset: rhythmicOffset, variation };
  }

  /**
   * 应用注意力影响
   */
  private applyAttentionImpact(baseDelay: number): {
    offset: number;
    variation: IBehaviorVariation;
  } {
    const attentionImpact = (1 - this.attentionState.level) * this.config.attentionDrift;
    const offset = baseDelay * attentionImpact * (this.random() - 0.5) * 0.4;

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.EXTRA_PAUSE,
      timestamp: new Date(),
      originalAction: `focused operation: ${baseDelay}ms`,
      modifiedAction: `distracted operation: ${baseDelay + offset}ms`,
      severity: Math.abs(offset / baseDelay),
      description: `注意力水平 ${this.attentionState.level.toFixed(2)} 的影响`
    };

    this.variations.push(variation);

    return { offset, variation };
  }

  /**
   * 应用疲劳影响
   */
  private applyFatigueImpact(baseDelay: number): {
    offset: number;
    variation: IBehaviorVariation;
  } {
    const fatigueFactor = this.session.fatigueLevel * this.config.fatigueProgression;
    const offset = baseDelay * fatigueFactor * (0.5 + this.random() * 0.5);

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.EXTRA_PAUSE,
      timestamp: new Date(),
      originalAction: `fresh operation: ${baseDelay}ms`,
      modifiedAction: `fatigued operation: ${baseDelay + offset}ms`,
      severity: offset / baseDelay,
      description: `疲劳水平 ${this.session.fatigueLevel.toFixed(2)} 的影响`
    };

    this.variations.push(variation);

    return { offset, variation };
  }

  /**
   * 应用策略性随机化
   */
  private applyStrategicRandomization(baseDelay: number, context: any): {
    offset: number;
    variation: IBehaviorVariation;
  } {
    let offset = 0;

    switch (this.config.strategy) {
      case RandomizationStrategy.SUBTLE:
        offset = this.gaussianRandom(0, baseDelay * 0.05);
        break;

      case RandomizationStrategy.MODERATE:
        offset = this.gaussianRandom(0, baseDelay * 0.15);
        break;

      case RandomizationStrategy.NATURAL:
        offset = this.gaussianRandom(0, baseDelay * 0.25);
        break;

      case RandomizationStrategy.CHAOTIC:
        offset = this.gaussianRandom(0, baseDelay * 0.4);
        break;
    }

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.TIMING_OFFSET,
      timestamp: new Date(),
      originalAction: `original delay: ${baseDelay}ms`,
      modifiedAction: `randomized delay: ${baseDelay + offset}ms`,
      severity: Math.abs(offset / baseDelay),
      description: `${this.config.strategy} 策略随机化`
    };

    this.variations.push(variation);

    return { offset, variation };
  }

  /**
   * 应用精度偏差
   */
  private applyPrecisionDeviation(
    targetPosition: IPoint,
    targetSize: number = 10,
    precision: number = 0.85
  ): {
    offset: IPoint;
    variation: IBehaviorVariation;
  } {
    const precisionError = 1 - precision;
    const maxDeviation = targetSize * precisionError;

    const offsetX = this.gaussianRandom(0, maxDeviation);
    const offsetY = this.gaussianRandom(0, maxDeviation);

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.SPATIAL_DEVIATION,
      timestamp: new Date(),
      originalAction: `precise position: (${targetPosition.x},${targetPosition.y})`,
      modifiedAction: `deviated position: (${targetPosition.x + offsetX},${targetPosition.y + offsetY})`,
      severity: Math.sqrt(offsetX * offsetX + offsetY * offsetY) / maxDeviation,
      description: `精度 ${precision} 导致的偏差`
    };

    this.variations.push(variation);

    return { offset: { x: offsetX, y: offsetY }, variation };
  }

  /**
   * 应用注意力漂移
   */
  private applyAttentionDrift(targetPosition: IPoint): {
    offset: IPoint;
    variation: IBehaviorVariation;
  } {
    const driftStrength = (1 - this.attentionState.level) * this.config.attentionDrift;
    const offsetX = this.attentionState.driftVector.x * driftStrength * 10;
    const offsetY = this.attentionState.driftVector.y * driftStrength * 10;

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.SPATIAL_DEVIATION,
      timestamp: new Date(),
      originalAction: `focused position: (${targetPosition.x},${targetPosition.y})`,
      modifiedAction: `drifted position: (${targetPosition.x + offsetX},${targetPosition.y + offsetY})`,
      severity: Math.sqrt(offsetX * offsetX + offsetY * offsetY) / 50,
      description: '注意力漂移导致的位置偏差'
    };

    this.variations.push(variation);

    return { offset: { x: offsetX, y: offsetY }, variation };
  }

  /**
   * 应用微调
   */
  private applyMicroAdjustment(targetPosition: IPoint): {
    offset: IPoint;
    variation: IBehaviorVariation;
  } {
    const adjustmentStrength = this.config.microAdjustments;
    const offsetX = this.gaussianRandom(0, adjustmentStrength * 2);
    const offsetY = this.gaussianRandom(0, adjustmentStrength * 2);

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.SPATIAL_DEVIATION,
      timestamp: new Date(),
      originalAction: `target position: (${targetPosition.x},${targetPosition.y})`,
      modifiedAction: `adjusted position: (${targetPosition.x + offsetX},${targetPosition.y + offsetY})`,
      severity: Math.sqrt(offsetX * offsetX + offsetY * offsetY) / adjustmentStrength,
      description: '操作微调'
    };

    this.variations.push(variation);

    return { offset: { x: offsetX, y: offsetY }, variation };
  }

  /**
   * 模拟误点
   */
  private simulateMisclick(targetPosition: IPoint, targetSize: number = 10): {
    position: IPoint;
    variation: IBehaviorVariation;
  } {
    const misclickDistance = targetSize * (2 + this.random() * 3); // 2-5倍目标大小
    const angle = this.random() * 2 * Math.PI;

    const misclickX = targetPosition.x + Math.cos(angle) * misclickDistance;
    const misclickY = targetPosition.y + Math.sin(angle) * misclickDistance;

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.MISCLICK,
      timestamp: new Date(),
      originalAction: `correct target: (${targetPosition.x},${targetPosition.y})`,
      modifiedAction: `misclick: (${misclickX},${misclickY})`,
      severity: 1.0,
      description: '模拟误点操作'
    };

    this.variations.push(variation);

    return {
      position: { x: misclickX, y: misclickY },
      variation
    };
  }

  /**
   * 更新注意力漂移
   */
  private updateAttentionDrift(): void {
    // 漂移向量的随机变化
    this.attentionState.driftVector.x += this.gaussianRandom(0, 0.1);
    this.attentionState.driftVector.y += this.gaussianRandom(0, 0.1);

    // 限制漂移向量的大小
    const maxDrift = 1.0;
    const driftMagnitude = Math.sqrt(
      this.attentionState.driftVector.x ** 2 +
      this.attentionState.driftVector.y ** 2
    );

    if (driftMagnitude > maxDrift) {
      this.attentionState.driftVector.x *= maxDrift / driftMagnitude;
      this.attentionState.driftVector.y *= maxDrift / driftMagnitude;
    }
  }

  /**
   * 决定是否应该模拟错误
   */
  private shouldSimulateError(operationType?: string): boolean {
    return this.random() < this.config.errorSimulation;
  }

  /**
   * 决定是否应该重排序序列
   */
  private shouldReorderSequence(): boolean {
    return this.random() < 0.05; // 5% 概率
  }

  /**
   * 决定是否应该遗漏操作
   */
  private shouldOmitOperation(): boolean {
    return this.random() < 0.02; // 2% 概率
  }

  /**
   * 决定是否应该重复操作
   */
  private shouldDuplicateOperation(): boolean {
    return this.random() < 0.01; // 1% 概率
  }

  /**
   * 重排序操作序列
   */
  private reorderSequence<T>(sequence: T[]): {
    sequence: T[];
    variation: IBehaviorVariation;
  } {
    if (sequence.length < 2) {
      return { sequence, variation: null as any };
    }

    const index1 = Math.floor(this.random() * sequence.length);
    let index2 = Math.floor(this.random() * sequence.length);
    while (index2 === index1) {
      index2 = Math.floor(this.random() * sequence.length);
    }

    const newSequence = [...sequence];
    [newSequence[index1], newSequence[index2]] = [newSequence[index2], newSequence[index1]];

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.SEQUENCE_REVERSAL,
      timestamp: new Date(),
      originalAction: `original order: ${sequence.join(' -> ')}`,
      modifiedAction: `reordered: ${newSequence.join(' -> ')}`,
      severity: 0.3,
      description: `交换位置 ${index1} 和 ${index2}`
    };

    this.variations.push(variation);

    return { sequence: newSequence, variation };
  }

  /**
   * 遗漏操作
   */
  private omitOperation<T>(sequence: T[]): {
    sequence: T[];
    variation: IBehaviorVariation;
  } {
    if (sequence.length === 0) {
      return { sequence, variation: null as any };
    }

    const omitIndex = Math.floor(this.random() * sequence.length);
    const newSequence = sequence.filter((_, index) => index !== omitIndex);

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.SEQUENCE_REVERSAL,
      timestamp: new Date(),
      originalAction: `complete sequence: ${sequence.join(' -> ')}`,
      modifiedAction: `omitted: ${newSequence.join(' -> ')}`,
      severity: 0.5,
      description: `遗漏位置 ${omitIndex} 的操作`
    };

    this.variations.push(variation);

    return { sequence: newSequence, variation };
  }

  /**
   * 重复操作
   */
  private duplicateOperation<T>(sequence: T[]): {
    sequence: T[];
    variation: IBehaviorVariation;
  } {
    if (sequence.length === 0) {
      return { sequence, variation: null as any };
    }

    const duplicateIndex = Math.floor(this.random() * sequence.length);
    const newSequence = [...sequence];
    newSequence.splice(duplicateIndex, 0, sequence[duplicateIndex]);

    const variation: IBehaviorVariation = {
      type: BehaviorVariationType.DOUBLE_TAP,
      timestamp: new Date(),
      originalAction: `single: ${sequence.join(' -> ')}`,
      modifiedAction: `duplicate: ${newSequence.join(' -> ')}`,
      severity: 0.4,
      description: `重复位置 ${duplicateIndex} 的操作`
    };

    this.variations.push(variation);

    return { sequence: newSequence, variation };
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDifferences = values.map(value => (value - mean) ** 2);
    return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * 高斯分布随机数
   */
  private gaussianRandom(mean: number, stdDev: number): number {
    let u = 0, v = 0;
    while (u === 0) u = this.random();
    while (v === 0) v = this.random();

    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
  }
}