/**
 * 延迟计算器
 * 模拟人类真实的反应时间和操作延迟
 */

import { IInputDelayConfig, IHumanBehaviorProfile, IInputSession } from '@/types/input';

/**
 * 延迟分布类型
 */
export enum DelayDistribution {
  GAUSSIAN = 'gaussian',
  UNIFORM = 'uniform',
  EXPONENTIAL = 'exponential',
  LOG_NORMAL = 'log-normal'
}

/**
 * 人类反应时间模型
 */
export class HumanReactionModel {
  private readonly baseReactionTime: number;
  private readonly variability: number;
  private readonly fatigueFactor: number;
  private readonly contextFactors: Map<string, number>;

  constructor(profile: IHumanBehaviorProfile['reactionTime']) {
    this.baseReactionTime = profile.mean;
    this.variability = profile.stdDev;
    this.fatigueFactor = 0.2; // 疲劳增加 20% 的反应时间
    this.contextFactors = new Map();
  }

  /**
   * 计算基础反应时间
   */
  calculateBaseReaction(): number {
    return this.gaussianRandom(this.baseReactionTime, this.variability);
  }

  /**
   * 计算考虑疲劳的反应时间
   */
  calculateFatigueAdjustedReaction(fatigueLevel: number): number {
    const baseTime = this.calculateBaseReaction();
    const fatigueMultiplier = 1 + (this.fatigueFactor * fatigueLevel);
    return baseTime * fatigueMultiplier;
  }

  /**
   * 计算任务复杂度影响
   */
  calculateComplexityAdjustment(complexity: number): number {
    // 复杂度 0-1，复杂任务增加反应时间
    const complexityFactor = 1 + (complexity * 0.5); // 最复杂时增加 50%
    return complexityFactor;
  }

  /**
   * 计算注意力分散影响
   */
  calculateAttentionAdjustment(attentionLevel: number): number {
    // 注意力水平 0-1，注意力不集中增加反应时间
    const attentionFactor = 2 - attentionLevel; // 注意力最差时反应时间翻倍
    return attentionFactor;
  }

  /**
   * 计算完整反应时间
   */
  calculateFullReactionTime(params: {
    fatigueLevel?: number;
    complexity?: number;
    attentionLevel?: number;
    context?: string;
  }): number {
    let reactionTime = this.calculateBaseReaction();

    // 应用疲劳因子
    if (params.fatigueLevel !== undefined) {
      reactionTime *= (1 + (this.fatigueFactor * params.fatigueLevel));
    }

    // 应用复杂度因子
    if (params.complexity !== undefined) {
      reactionTime *= this.calculateComplexityAdjustment(params.complexity);
    }

    // 应用注意力因子
    if (params.attentionLevel !== undefined) {
      reactionTime *= this.calculateAttentionAdjustment(params.attentionLevel);
    }

    // 应用上下文因子
    if (params.context) {
      const contextFactor = this.contextFactors.get(params.context) || 1;
      reactionTime *= contextFactor;
    }

    return Math.max(50, reactionTime); // 最小 50ms
  }

  /**
   * 设置上下文因子
   */
  setContextFactor(context: string, factor: number): void {
    this.contextFactors.set(context, factor);
  }

  /**
   * 高斯分布随机数
   */
  private gaussianRandom(mean: number, stdDev: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
  }
}

/**
 * 智能延迟计算器
 */
export class IntelligentDelayCalculator {
  private readonly reactionModel: HumanReactionModel;
  private readonly inputSession: IInputSession;
  private readonly random: () => number;

  constructor(session: IInputSession, randomGenerator?: () => number) {
    this.inputSession = session;
    this.random = randomGenerator || Math.random;
    this.reactionModel = new HumanReactionModel({
      mean: 250, // 250ms 平均反应时间
      stdDev: 50  // 50ms 标准差
    });

    // 初始化上下文因子
    this.initializeContextFactors();
  }

  /**
   * 计算操作间延迟
   */
  calculateDelay(config: IInputDelayConfig, context?: {
    operationType?: string;
    complexity?: number;
    importance?: number;
    expected?: boolean;
  }): number {
    let baseDelay = config.baseDelay;

    // 应用分布变换
    baseDelay = this.applyDistribution(baseDelay, config.variance, config.distribution);

    // 应用疲劳因子
    const fatigueMultiplier = 1 + (config.fatigueMultiplier * this.inputSession.fatigueLevel);
    baseDelay *= fatigueMultiplier;

    // 应用上下文调整
    if (context) {
      baseDelay = this.applyContextAdjustments(baseDelay, context);
    }

    // 添加微小的随机噪声
    const noise = this.gaussianRandom(0, baseDelay * 0.05);
    baseDelay += noise;

    return Math.max(config.baseDelay * 0.1, baseDelay); // 最小延迟为基数的 10%
  }

  /**
   * 计算鼠标移动延迟
   */
  calculateMouseMoveDelay(distance: number, targetSize: number = 10): number {
    // Fitts 法则简化版本：MT = a + b * log2(D/W + 1)
    const a = 50; // 基础时间
    const b = 100; // 难度系数
    const difficulty = Math.log2(distance / targetSize + 1);

    let movementTime = a + b * difficulty;

    // 应用个人习惯调整
    movementTime *= this.getPersonalSpeedFactor();

    // 应用疲劳影响
    movementTime *= (1 + this.inputSession.fatigueLevel * 0.3);

    return movementTime;
  }

  /**
   * 计算按键延迟
   */
  calculateKeyPressDelay(key: string, isModifier: boolean = false): number {
    let baseDelay = 50; // 基础按键延迟

    // 修饰键通常更快
    if (isModifier) {
      baseDelay = 30;
    }

    // 不常用按键可能需要更长时间
    const commonKeys = ['a', 's', 'd', 'w', '1', '2', '3', 'space', 'enter', 'escape'];
    if (!commonKeys.includes(key.toLowerCase())) {
      baseDelay *= 1.5;
    }

    // 应用个人打字习惯
    baseDelay *= this.getPersonalTypingFactor();

    return baseDelay;
  }

  /**
   * 计算连续操作的延迟衰减
   */
  calculateSequentialDelay(previousDelays: number[], patternLength: number = 3): number {
    if (previousDelays.length < patternLength) {
      return 0; // 没有足够的历史数据
    }

    // 检测节奏模式
    const recentDelays = previousDelays.slice(-patternLength);
    const avgDelay = recentDelays.reduce((sum, delay) => sum + delay, 0) / patternLength;
    const variance = this.calculateVariance(recentDelays);

    // 如果有稳定的节奏，稍微减少延迟 (模拟肌肉记忆)
    if (variance < avgDelay * 0.2) { // 方差小于均值的 20%
      const rhythmFactor = 0.9; // 节奏减少 10% 延迟
      return avgDelay * rhythmFactor;
    }

    return 0;
  }

  /**
   * 计算犹豫时间
   */
  calculateHesitationTime(probability: number = 0.1): number {
    if (this.random() > probability) {
      return 0; // 不犹豫
    }

    // 犹豫时间通常在 200-1000ms 之间
    const baseHesitation = 200;
    const maxHesitation = 1000;
    const hesitationTime = baseHesitation + (this.random() * (maxHesitation - baseHesitation));

    return hesitationTime * (1 + this.inputSession.fatigueLevel);
  }

  /**
   * 应用分布变换
   */
  private applyDistribution(baseValue: number, variance: number, distribution: DelayDistribution): number {
    switch (distribution) {
      case DelayDistribution.GAUSSIAN:
        return this.gaussianRandom(baseValue, variance);

      case DelayDistribution.UNIFORM:
        return baseValue + (this.random() - 0.5) * 2 * variance;

      case DelayDistribution.EXPONENTIAL:
        const lambda = 1 / baseValue;
        return -Math.log(1 - this.random()) / lambda;

      case DelayDistribution.LOG_NORMAL:
        const logMean = Math.log(baseValue);
        const logStdDev = variance / baseValue;
        const logNormal = this.gaussianRandom(logMean, logStdDev);
        return Math.exp(logNormal);

      default:
        return baseValue;
    }
  }

  /**
   * 应用上下文调整
   */
  private applyContextAdjustments(delay: number, context: any): number {
    let adjustedDelay = delay;

    // 操作类型调整
    if (context.operationType) {
      const operationFactor = this.reactionModel.calculateComplexityAdjustment(
        this.getOperationComplexity(context.operationType)
      );
      adjustedDelay *= operationFactor;
    }

    // 复杂度调整
    if (context.complexity !== undefined) {
      adjustedDelay *= this.reactionModel.calculateComplexityAdjustment(context.complexity);
    }

    // 重要性调整（重要操作更谨慎，延迟更长）
    if (context.importance !== undefined) {
      const importanceFactor = 1 + (context.importance * 0.3);
      adjustedDelay *= importanceFactor;
    }

    // 预期性调整（预期操作更快）
    if (context.expected !== undefined && context.expected) {
      adjustedDelay *= 0.8; // 预期操作减少 20% 延迟
    }

    return adjustedDelay;
  }

  /**
   * 获取操作复杂度
   */
  private getOperationComplexity(operationType: string): number {
    const complexityMap: Record<string, number> = {
      'simple_click': 0.1,
      'drag_drop': 0.4,
      'double_click': 0.2,
      'right_click': 0.2,
      'key_combination': 0.3,
      'text_input': 0.6,
      'precision_click': 0.5,
      'complex_sequence': 0.8
    };

    return complexityMap[operationType] || 0.3;
  }

  /**
   * 获取个人速度因子
   */
  private getPersonalSpeedFactor(): number {
    // 基于会话历史分析个人操作速度
    if (this.inputSession.operationCount === 0) {
      return 1.0; // 默认速度
    }

    const avgOperationTime = this.inputSession.characteristics.mouseSpeed?.preferred || 1.0;
    return avgOperationTime;
  }

  /**
   * 获取个人打字因子
   */
  private getPersonalTypingFactor(): number {
    // 模拟个人打字习惯的差异
    return 0.8 + (this.random() * 0.4); // 0.8-1.2 倍速
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
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

  /**
   * 初始化上下文因子
   */
  private initializeContextFactors(): void {
    // 不同上下文对反应时间的影响
    this.reactionModel.setContextFactor('gaming', 0.9); // 游戏时反应更快
    this.reactionModel.setContextFactor('reading', 1.3); // 阅读时反应较慢
    this.reactionModel.setContextFactor('typing', 0.8); // 打字时反应较快
    this.reactionModel.setContextFactor('browsing', 1.0); // 浏览时正常速度
    this.reactionModel.setContextFactor('stress', 1.4); // 压力下反应变慢
    this.reactionModel.setContextFactor('focused', 0.7); // 专注时反应很快
  }
}