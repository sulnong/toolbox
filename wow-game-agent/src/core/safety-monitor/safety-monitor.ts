/**
 * 安全监控系统
 * 实时监控系统行为，检测异常模式，确保操作安全合规
 */

import { IInputEvent, ISafetyStatus, IUsageStats } from '@/types';
import { IInputSession, IInputStatistics } from '@/types/input';
import { logger, SecurityLogger } from '@/utils/logger';
import { GameAgentError } from '@/types';

/**
 * 安全警报级别
 */
export enum SafetyAlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * 安全警报类型
 */
export enum SafetyAlertType {
  EXCESSIVE_USAGE = 'excessive_usage',
  REPETITIVE_PATTERN = 'repetitive_pattern',
  UNNATURAL_TIMING = 'unnatural_timing',
  FATIGUE_DETECTED = 'fatigue_detected',
  SUSPICIOUS_BEHAVIOR = 'suspicious_behavior',
  CONFIGURATION_ERROR = 'configuration_error',
  SYSTEM_ANOMALY = 'system_anomaly',
  GAME_WINDOW_LOST = 'game_window_lost'
}

/**
 * 安全警报
 */
interface ISafetyAlert {
  id: string;
  level: SafetyAlertLevel;
  type: SafetyAlertType;
  timestamp: Date;
  message: string;
  details: Record<string, unknown>;
  autoResolve?: boolean;
  resolveCondition?: string;
}

/**
 * 安全规则配置
 */
interface ISafetyRuleConfig {
  // 使用限制
  maxSessionDuration: number; // 最大会话时长 (分钟)
  maxContinuousOperations: number; // 最大连续操作数
  requiredRestInterval: number; // 强制休息间隔 (分钟)

  // 行为检测
  maxRepetitivePatternLength: number; // 最大重复模式长度
  maxTimingVariance: number; // 最大时间方差
  minHumanLikenessScore: number; // 最小人类相似度分数

  // 疲劳检测
  fatigueThreshold: number; // 疲劳阈值
  fatigueDecayRate: number; // 疲劳衰减率
  maxErrorRate: number; // 最大错误率

  // 安全检查
  safetyCheckInterval: number; // 安全检查间隔 (秒)
  enableEmergencyStop: boolean; // 启用紧急停止
  requireUserConfirmation: boolean; // 需要用户确认
}

/**
 * 行为模式分析结果
 */
interface IBehaviorPatternAnalysis {
  isRepetitive: boolean;
  patternLength: number;
  patternStrength: number; // 0-1，模式强度
  variability: number; // 0-1，变化程度
  naturalness: number; // 0-1，自然程度
}

/**
 * 使用统计扩展
 */
interface IExtendedUsageStats extends IUsageStats {
  sessionDurations: number[]; // 各会话持续时间
  operationIntervals: number[]; // 操作间隔时间
  errorPatterns: Record<string, number>; // 错误模式统计
  alertHistory: ISafetyAlert[]; // 警报历史
  lastSafetyCheck: Date; // 上次安全检查时间
}

/**
 * 安全监控器
 */
export class SafetyMonitor {
  private readonly config: ISafetyRuleConfig;
  private readonly securityLogger: SecurityLogger;
  private readonly alerts: ISafetyAlert[];
  private readonly usageStats: IExtendedUsageStats;
  private readonly inputHistory: IInputEvent[];
  private readonly sessionHistory: IInputSession[];

  private isActive: boolean = false;
  private safetyCheckTimer?: NodeJS.Timeout;
  private emergencyStopCallback?: () => void;

  constructor(config: Partial<ISafetyRuleConfig> = {}) {
    // 默认安全配置
    this.config = {
      maxSessionDuration: 240, // 4小时
      maxContinuousOperations: 1000,
      requiredRestInterval: 30, // 30分钟

      maxRepetitivePatternLength: 5,
      maxTimingVariance: 0.3,
      minHumanLikenessScore: 0.7,

      fatigueThreshold: 0.8,
      fatigueDecayRate: 0.1,
      maxErrorRate: 0.1,

      safetyCheckInterval: 60, // 1分钟
      enableEmergencyStop: true,
      requireUserConfirmation: true,
      ...config
    };

    this.securityLogger = SecurityLogger.getInstance();
    this.alerts = [];
    this.inputHistory = [];
    this.sessionHistory = [];

    // 初始化使用统计
    this.usageStats = {
      sessionStartTime: new Date(),
      totalUsageTime: 0,
      operationCount: 0,
      restPeriods: 0,
      sessionDurations: [],
      operationIntervals: [],
      errorPatterns: {},
      alertHistory: [],
      lastSafetyCheck: new Date()
    };

    logger.info('安全监控器已初始化', { config: this.config });
  }

  /**
   * 启动安全监控
   */
  startMonitoring(emergencyStopCallback?: () => void): void {
    if (this.isActive) {
      logger.warn('安全监控已在运行中');
      return;
    }

    this.isActive = true;
    this.emergencyStopCallback = emergencyStopCallback;

    // 启动定期安全检查
    this.safetyCheckTimer = setInterval(() => {
      this.performSafetyCheck();
    }, this.config.safetyCheckInterval * 1000);

    this.securityLogger.logSecurityEvent(
      '安全监控启动',
      'low',
      {
        config: this.config,
        emergencyStopEnabled: !!emergencyStopCallback
      }
    );

    logger.info('安全监控已启动');
  }

  /**
   * 停止安全监控
   */
  stopMonitoring(): void {
    if (!this.isActive) {
      logger.warn('安全监控未在运行');
      return;
    }

    this.isActive = false;

    if (this.safetyCheckTimer) {
      clearInterval(this.safetyCheckTimer);
      this.safetyCheckTimer = undefined;
    }

    this.securityLogger.logSecurityEvent(
      '安全监控停止',
      'low',
      {
        totalOperations: this.usageStats.operationCount,
        totalAlerts: this.alerts.length,
        sessionDuration: Date.now() - this.usageStats.sessionStartTime.getTime()
      }
    );

    logger.info('安全监控已停止');
  }

  /**
   * 记录输入事件
   */
  recordInputEvent(event: IInputEvent): void {
    if (!this.isActive) {
      return;
    }

    this.inputHistory.push(event);
    this.usageStats.operationCount++;

    // 保持历史记录在合理范围内
    if (this.inputHistory.length > 10000) {
      this.inputHistory.splice(0, 5000);
    }

    // 实时安全检查
    this.performRealTimeSafetyCheck(event);
  }

  /**
   * 记录会话信息
   */
  recordSession(session: IInputSession): void {
    this.sessionHistory.push(session);

    // 更新使用统计
    const sessionDuration = session.endTime
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime();

    this.usageStats.sessionDurations.push(sessionDuration);
    this.usageStats.totalUsageTime += sessionDuration;

    if (session.errorCount > 0) {
      this.usageStats.errorPatterns[session.id] = session.errorCount;
    }

    // 保持历史记录在合理范围内
    if (this.sessionHistory.length > 100) {
      this.sessionHistory.splice(0, 50);
    }

    logger.debug('会话信息已记录', {
      sessionId: session.id,
      duration: sessionDuration,
      operationCount: session.operationCount,
      errorCount: session.errorCount
    });
  }

  /**
   * 获取当前安全状态
   */
  getSafetyStatus(): ISafetyStatus {
    const score = this.calculateSafetyScore();
    const level = this.determineSafetyLevel(score);
    const recentAlerts = this.alerts.filter(alert =>
      Date.now() - alert.timestamp.getTime() < 300000 // 最近5分钟的警报
    );

    return {
      level,
      score,
      lastCheck: this.usageStats.lastSafetyCheck,
      alerts: recentAlerts.map(alert => alert.message)
    };
  }

  /**
   * 获取使用统计
   */
  getUsageStatistics(): IExtendedUsageStats {
    return { ...this.usageStats };
  }

  /**
   * 获取警报历史
   */
  getAlertHistory(limit?: number): ISafetyAlert[] {
    const sortedAlerts = [...this.alerts].sort((a, b) =>
      b.timestamp.getTime() - a.timestamp.getTime()
    );

    return limit ? sortedAlerts.slice(0, limit) : sortedAlerts;
  }

  /**
   * 手动执行安全检查
   */
  performManualSafetyCheck(): {
    isSafe: boolean;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
    safetyScore: number;
  } {
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }> = [];

    // 检查会话时长
    const currentSessionDuration = Date.now() - this.usageStats.sessionStartTime.getTime();
    if (currentSessionDuration > this.config.maxSessionDuration * 60 * 1000) {
      issues.push({
        type: 'excessive_duration',
        severity: 'high',
        description: `会话时长超过限制 (${Math.round(currentSessionDuration / 60000)}分钟)`,
        recommendation: '建议立即休息并结束当前会话'
      });
    }

    // 检查操作频率
    if (this.usageStats.operationCount > this.config.maxContinuousOperations) {
      issues.push({
        type: 'excessive_operations',
        severity: 'medium',
        description: `连续操作数过多 (${this.usageStats.operationCount})`,
        recommendation: '减少操作频率或增加休息时间'
      });
    }

    // 检查行为模式
    const patternAnalysis = this.analyzeBehaviorPatterns();
    if (patternAnalysis.isRepetitive) {
      issues.push({
        type: 'repetitive_behavior',
        severity: 'medium',
        description: `检测到重复行为模式 (长度: ${patternAnalysis.patternLength})`,
        recommendation: '增加操作变化，避免机械重复'
      });
    }

    // 检查自然度
    if (patternAnalysis.naturalness < 0.7) {
      issues.push({
        type: 'unnatural_behavior',
        severity: 'high',
        description: `操作自然度过低 (${(patternAnalysis.naturalness * 100).toFixed(1)}%)`,
        recommendation: '调整输入参数，增加人性化变化'
      });
    }

    // 检查疲劳状态
    const fatigueLevel = this.calculateFatigueLevel();
    if (fatigueLevel > this.config.fatigueThreshold) {
      issues.push({
        type: 'fatigue_detected',
        severity: 'medium',
        description: `检测到高疲劳水平 (${(fatigueLevel * 100).toFixed(1)}%)`,
        recommendation: '立即休息，避免疲劳操作'
      });
    }

    const safetyScore = this.calculateSafetyScore();
    const isSafe = safetyScore >= 70 && issues.filter(i => i.severity === 'high').length === 0;

    return {
      isSafe,
      issues,
      safetyScore
    };
  }

  /**
   * 执行实时安全检查
   */
  private performRealTimeSafetyCheck(event: IInputEvent): void {
    try {
      // 检查输入事件的自然度
      if (event.confidence < this.config.minHumanLikenessScore) {
        this.createAlert(
          SafetyAlertLevel.WARNING,
          SafetyAlertType.UNNATURAL_TIMING,
          `输入事件自然度过低: ${event.confidence.toFixed(2)}`,
          {
            eventType: event.type,
            confidence: event.confidence,
            threshold: this.config.minHumanLikenessScore
          }
        );
      }

      // 检查是否有异常的时间间隔
      if (this.inputHistory.length >= 2) {
        const previousEvent = this.inputHistory[this.inputHistory.length - 2];
        const interval = event.timestamp.getTime() - previousEvent.timestamp.getTime();

        // 记录操作间隔
        this.usageStats.operationIntervals.push(interval);

        // 检查异常短间隔
        if (interval < 50) { // 少于50ms的间隔可能是异常
          this.createAlert(
            SafetyAlertLevel.INFO,
            SafetyAlertType.SUSPICIOUS_BEHAVIOR,
            `检测到异常短的操作间隔: ${interval}ms`,
            { interval, event }
          );
        }
      }

    } catch (error) {
      logger.error('实时安全检查失败:', error);
    }
  }

  /**
   * 执行定期安全检查
   */
  private performSafetyCheck(): void {
    try {
      this.usageStats.lastSafetyCheck = new Date();

      // 检查会话时长
      this.checkSessionDuration();

      // 检查需要休息
      this.checkRestRequirement();

      // 分析行为模式
      this.checkBehaviorPatterns();

      // 检查疲劳状态
      this.checkFatigueLevel();

      // 检查系统状态
      this.checkSystemHealth();

    } catch (error) {
      logger.error('定期安全检查失败:', error);
      this.createAlert(
        SafetyAlertLevel.WARNING,
        SafetyAlertType.SYSTEM_ANOMALY,
        `安全检查系统异常: ${error}`,
        { error }
      );
    }
  }

  /**
   * 检查会话时长
   */
  private checkSessionDuration(): void {
    const currentDuration = Date.now() - this.usageStats.sessionStartTime.getTime();
    const maxDuration = this.config.maxSessionDuration * 60 * 1000;

    if (currentDuration >= maxDuration) {
      this.createAlert(
        SafetyAlertLevel.CRITICAL,
        SafetyAlertType.EXCESSIVE_USAGE,
        `会话时长超过最大限制 (${Math.round(currentDuration / 60000)}/${this.config.maxSessionDuration} 分钟)`,
        { currentDuration, maxDuration },
        this.config.enableEmergencyStop
      );

      if (this.config.enableEmergencyStop && this.emergencyStopCallback) {
        this.emergencyStopCallback();
      }
    } else if (currentDuration >= maxDuration * 0.8) {
      this.createAlert(
        SafetyAlertLevel.WARNING,
        SafetyAlertType.EXCESSIVE_USAGE,
        `会话时长接近限制 (${Math.round(currentDuration / 60000)}/${this.config.maxSessionDuration} 分钟)`,
        { currentDuration, maxDuration }
      );
    }
  }

  /**
   * 检查休息需求
   */
  private checkRestRequirement(): void {
    const now = Date.now();
    const lastRestTime = this.usageStats.lastRestTime?.getTime() || this.usageStats.sessionStartTime.getTime();
    const timeSinceLastRest = now - lastRestTime;
    const requiredInterval = this.config.requiredRestInterval * 60 * 1000;

    if (timeSinceLastRest >= requiredInterval) {
      this.createAlert(
        SafetyAlertLevel.WARNING,
        SafetyAlertType.FATIGUE_DETECTED,
        `需要休息 (${Math.round(timeSinceLastRest / 60000)}/${this.config.requiredRestInterval} 分钟)`,
        { timeSinceLastRest, requiredInterval }
      );

      // 自动计数休息期
      this.usageStats.restPeriods++;
      this.usageStats.lastRestTime = new Date();
    }
  }

  /**
   * 检查行为模式
   */
  private checkBehaviorPatterns(): void {
    const analysis = this.analyzeBehaviorPatterns();

    if (analysis.isRepetitive && analysis.patternLength > this.config.maxRepetitivePatternLength) {
      this.createAlert(
        SafetyAlertLevel.WARNING,
        SafetyAlertType.REPETITIVE_PATTERN,
        `检测到过长的重复模式 (${analysis.patternLength} 长度, ${analysis.patternStrength} 强度)`,
        { analysis }
      );
    }

    if (analysis.naturalness < 0.5) {
      this.createAlert(
        SafetyAlertLevel.CRITICAL,
        SafetyAlertType.SUSPICIOUS_BEHAVIOR,
        `操作行为自然度过低 (${(analysis.naturalness * 100).toFixed(1)}%)`,
        { analysis },
        this.config.enableEmergencyStop
      );
    }
  }

  /**
   * 检查疲劳水平
   */
  private checkFatigueLevel(): void {
    const fatigueLevel = this.calculateFatigueLevel();

    if (fatigueLevel > this.config.fatigueThreshold) {
      this.createAlert(
        SafetyAlertLevel.WARNING,
        SafetyAlertType.FATIGUE_DETECTED,
        `检测到高疲劳水平 (${(fatigueLevel * 100).toFixed(1)}%)`,
        { fatigueLevel, threshold: this.config.fatigueThreshold }
      );
    }
  }

  /**
   * 检查系统健康状态
   */
  private checkSystemHealth(): void {
    // 检查输入历史大小
    if (this.inputHistory.length > 15000) {
      this.createAlert(
        SafetyAlertLevel.INFO,
        SafetyAlertType.SYSTEM_ANOMALY,
        '输入历史记录过多，可能存在内存泄漏',
        { historySize: this.inputHistory.length }
      );
    }

    // 检查警报频率
    const recentAlerts = this.alerts.filter(alert =>
      Date.now() - alert.timestamp.getTime() < 300000 // 最近5分钟
    );

    if (recentAlerts.length > 10) {
      this.createAlert(
        SafetyAlertLevel.WARNING,
        SafetyAlertType.SYSTEM_ANOMALY,
        '警报频率过高，系统可能存在问题',
        { recentAlertsCount: recentAlerts.length }
      );
    }
  }

  /**
   * 分析行为模式
   */
  private analyzeBehaviorPatterns(): IBehaviorPatternAnalysis {
    if (this.inputHistory.length < 10) {
      return {
        isRepetitive: false,
        patternLength: 0,
        patternStrength: 0,
        variability: 1,
        naturalness: 0.8
      };
    }

    // 分析最近的输入事件
    const recentEvents = this.inputHistory.slice(-50);
    const eventTypes = recentEvents.map(e => e.type);
    const durations = recentEvents.map(e => e.duration);

    // 检测重复模式
    const patternLength = this.detectRepeatingPattern(eventTypes);
    const isRepetitive = patternLength > 2;

    // 计算模式强度
    const patternStrength = isRepetitive
      ? this.calculatePatternStrength(eventTypes, patternLength)
      : 0;

    // 计算变异性
    const variability = this.calculateVariability(durations);

    // 计算自然度
    const naturalness = this.calculateNaturalness(recentEvents);

    return {
      isRepetitive,
      patternLength,
      patternStrength,
      variability,
      naturalness
    };
  }

  /**
   * 检测重复模式
   */
  private detectRepeatingPattern(sequence: string[]): number {
    const maxPatternLength = Math.min(sequence.length / 2, 10);

    for (let length = 2; length <= maxPatternLength; length++) {
      if (this.isPatternRepeating(sequence, length)) {
        return length;
      }
    }

    return 0;
  }

  /**
   * 检查模式是否重复
   */
  private isPatternRepeating(sequence: string[], patternLength: number): boolean {
    if (sequence.length % patternLength !== 0) {
      return false;
    }

    const pattern = sequence.slice(0, patternLength);
    const repetitions = sequence.length / patternLength;

    for (let i = 1; i < repetitions; i++) {
      const start = i * patternLength;
      const end = start + patternLength;
      const currentPattern = sequence.slice(start, end);

      if (!this.patternsEqual(pattern, currentPattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 比较模式是否相等
   */
  private patternsEqual(pattern1: string[], pattern2: string[]): boolean {
    if (pattern1.length !== pattern2.length) {
      return false;
    }

    for (let i = 0; i < pattern1.length; i++) {
      if (pattern1[i] !== pattern2[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 计算模式强度
   */
  private calculatePatternStrength(sequence: string[], patternLength: number): number {
    // 简化的模式强度计算
    return Math.min(1, patternLength / 5);
  }

  /**
   * 计算变异性
   */
  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 1;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 变异性 = 标准差 / 均值
    return mean > 0 ? stdDev / mean : 1;
  }

  /**
   * 计算自然度
   */
  private calculateNaturalness(events: IInputEvent[]): number {
    if (events.length === 0) return 0;

    // 基于多个因素计算自然度
    const avgConfidence = events.reduce((sum, event) => sum + event.confidence, 0) / events.length;
    const timingVariability = this.calculateTimingVariability(events);
    const typeDiversity = this.calculateTypeDiversity(events);

    // 加权平均
    return (avgConfidence * 0.4 + timingVariability * 0.3 + typeDiversity * 0.3);
  }

  /**
   * 计算时间变异性
   */
  private calculateTimingVariability(events: IInputEvent[]): number {
    if (events.length < 2) return 0.5;

    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push(events[i].timestamp.getTime() - events[i - 1].timestamp.getTime());
    }

    const variability = this.calculateVariability(intervals);
    return Math.min(1, variability * 2); // 归一化到 0-1
  }

  /**
   * 计算类型多样性
   */
  private calculateTypeDiversity(events: IInputEvent[]): number {
    const typeCounts = new Map<string, number>();
    events.forEach(event => {
      typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1);
    });

    // 使用香农熵计算多样性
    const totalEvents = events.length;
    let entropy = 0;

    typeCounts.forEach(count => {
      const probability = count / totalEvents;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });

    // 归一化到 0-1
    const maxEntropy = Math.log2(typeCounts.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * 计算疲劳水平
   */
  private calculateFatigueLevel(): number {
    let fatigueLevel = 0;

    // 基于使用时间的疲劳
    const sessionDuration = Date.now() - this.usageStats.sessionStartTime.getTime();
    const timeFatigue = Math.min(1, sessionDuration / (this.config.maxSessionDuration * 60 * 1000));
    fatigueLevel += timeFatigue * 0.4;

    // 基于操作频率的疲劳
    const operationRate = this.usageStats.operationCount / (sessionDuration / 60000); // 每分钟操作数
    const rateFatigue = Math.min(1, operationRate / 20); // 假设20操作/分钟为高频率
    fatigueLevel += rateFatigue * 0.3;

    // 基于错误率的疲劳
    const recentSessions = this.sessionHistory.slice(-10);
    if (recentSessions.length > 0) {
      const totalErrors = recentSessions.reduce((sum, session) => sum + session.errorCount, 0);
      const totalOperations = recentSessions.reduce((sum, session) => sum + session.operationCount, 0);
      const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
      const errorFatigue = Math.min(1, errorRate / this.config.maxErrorRate);
      fatigueLevel += errorFatigue * 0.3;
    }

    return Math.min(1, fatigueLevel);
  }

  /**
   * 计算安全分数
   */
  private calculateSafetyScore(): number {
    let score = 100;

    // 扣除警报分数
    const recentAlerts = this.alerts.filter(alert =>
      Date.now() - alert.timestamp.getTime() < 300000 // 最近5分钟
    );

    recentAlerts.forEach(alert => {
      switch (alert.level) {
        case SafetyAlertLevel.EMERGENCY:
          score -= 30;
          break;
        case SafetyAlertLevel.CRITICAL:
          score -= 20;
          break;
        case SafetyAlertLevel.WARNING:
          score -= 10;
          break;
        case SafetyAlertLevel.INFO:
          score -= 5;
          break;
      }
    });

    // 扣除疲劳分数
    const fatigueLevel = this.calculateFatigueLevel();
    score -= fatigueLevel * 15;

    // 扣除行为模式分数
    const behaviorAnalysis = this.analyzeBehaviorPatterns();
    if (behaviorAnalysis.isRepetitive) {
      score -= behaviorAnalysis.patternStrength * 10;
    }

    if (behaviorAnalysis.naturalness < 0.7) {
      score -= (0.7 - behaviorAnalysis.naturalness) * 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 确定安全级别
   */
  private determineSafetyLevel(score: number): 'safe' | 'warning' | 'danger' {
    if (score >= 80) return 'safe';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  /**
   * 创建安全警报
   */
  private createAlert(
    level: SafetyAlertLevel,
    type: SafetyAlertType,
    message: string,
    details: Record<string, unknown> = {},
    triggerEmergencyStop: boolean = false
  ): void {
    const alert: ISafetyAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      type,
      timestamp: new Date(),
      message,
      details
    };

    this.alerts.push(alert);
    this.usageStats.alertHistory.push(alert);

    // 记录安全日志
    this.securityLogger.logSecurityEvent(message, level, details);

    // 记录到应用日志
    logger.warn(`安全警报 [${level}]: ${message}`, details);

    // 触发紧急停止
    if (triggerEmergencyStop && this.config.enableEmergencyStop && this.emergencyStopCallback) {
      logger.error('触发紧急停止程序');
      this.emergencyStopCallback();
    }

    // 保持警报历史在合理范围内
    if (this.alerts.length > 1000) {
      this.alerts.splice(0, 500);
    }
  }
}