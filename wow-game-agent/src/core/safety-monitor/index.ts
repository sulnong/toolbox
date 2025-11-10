/**
 * 安全监控模块
 * 提供实时安全监控、行为分析和防检测功能
 */

export { SafetyMonitor } from './safety-monitor';
export { BehaviorRandomizer, RandomizationStrategy } from './behavior-randomizer';

// 重新导出相关类型
export type {
  ISafetyStatus,
  IUsageStats,
  IInputEvent
} from '@/types';

export type {
  IInputSession,
  IHumanBehaviorProfile,
  IInputStatistics
} from '@/types/input';

/**
 * 创建安全监控器工厂函数
 */
export function createSafetyMonitor(config?: {
  maxSessionDuration?: number; // 最大会话时长 (分钟)
  maxContinuousOperations?: number; // 最大连续操作数
  requiredRestInterval?: number; // 强制休息间隔 (分钟)
  safetyCheckInterval?: number; // 安全检查间隔 (秒)
  enableEmergencyStop?: boolean; // 启用紧急停止
  requireUserConfirmation?: boolean; // 需要用户确认
  minHumanLikenessScore?: number; // 最小人类相似度分数
}) {
  const monitorConfig = {
    maxSessionDuration: 240, // 4小时
    maxContinuousOperations: 1000,
    requiredRestInterval: 30, // 30分钟
    safetyCheckInterval: 60, // 1分钟
    enableEmergencyStop: true,
    requireUserConfirmation: true,
    minHumanLikenessScore: 0.7,
    ...config
  };

  return new SafetyMonitor(monitorConfig);
}

/**
 * 创建行为随机化器工厂函数
 */
export function createBehaviorRandomizer(
  session: IInputSession,
  config?: {
    strategy?: RandomizationStrategy;
    rhythmicVariation?: number; // 节奏变化 0-1
    errorSimulation?: number; // 错误模拟 0-1
    attentionDrift?: number; // 注意力漂移 0-1
    fatigueProgression?: number; // 疲劳进展 0-1
    microAdjustments?: number; // 微调程度 0-1
  }
) {
  const randomizerConfig = {
    strategy: RandomizationStrategy.MODERATE,
    rhythmicVariation: 0.3,
    errorSimulation: 0.02,
    attentionDrift: 0.2,
    fatigueProgression: 0.1,
    microAdjustments: 0.15,
    ...config
  };

  return new BehaviorRandomizer(session, randomizerConfig);
}

/**
 * 预设的安全配置
 */
export const SafetyPresets = {
  /**
   * 严格安全模式 (最高安全性)
   */
  strict: {
    maxSessionDuration: 120, // 2小时
    maxContinuousOperations: 500,
    requiredRestInterval: 20, // 20分钟
    safetyCheckInterval: 30, // 30秒
    enableEmergencyStop: true,
    requireUserConfirmation: true,
    minHumanLikenessScore: 0.85
  },

  /**
   * 平衡模式 (安全性与便利性平衡)
   */
  balanced: {
    maxSessionDuration: 240, // 4小时
    maxContinuousOperations: 1000,
    requiredRestInterval: 30, // 30分钟
    safetyCheckInterval: 60, // 1分钟
    enableEmergencyStop: true,
    requireUserConfirmation: true,
    minHumanLikenessScore: 0.7
  },

  /**
   * 宽松模式 (更便利，安全性稍低)
   */
  relaxed: {
    maxSessionDuration: 360, // 6小时
    maxContinuousOperations: 2000,
    requiredRestInterval: 60, // 1小时
    safetyCheckInterval: 120, // 2分钟
    enableEmergencyStop: false,
    requireUserConfirmation: false,
    minHumanLikenessScore: 0.6
  }
};

/**
 * 预设的行为随机化配置
 */
export const RandomizationPresets = {
  /**
   * 精确型 (最小随机化，保持精确性)
   */
  precise: {
    strategy: RandomizationStrategy.SUBTLE,
    rhythmicVariation: 0.1,
    errorSimulation: 0.005,
    attentionDrift: 0.05,
    fatigueProgression: 0.05,
    microAdjustments: 0.05
  },

  /**
   * 自然型 (模拟真实人类行为)
   */
  natural: {
    strategy: RandomizationStrategy.NATURAL,
    rhythmicVariation: 0.3,
    errorSimulation: 0.02,
    attentionDrift: 0.2,
    fatigueProgression: 0.1,
    microAdjustments: 0.15
  },

  /**
   * 混乱型 (高度随机化，避免严格检测)
   */
  chaotic: {
    strategy: RandomizationStrategy.CHAOTIC,
    rhythmicVariation: 0.5,
    errorSimulation: 0.05,
    attentionDrift: 0.3,
    fatigueProgression: 0.2,
    microAdjustments: 0.25
  }
};

/**
 * 使用预设创建安全监控器
 */
export function createSafetyMonitorWithPreset(
  presetName: keyof typeof SafetyPresets,
  overrides?: Partial<typeof SafetyPresets[keyof typeof SafetyPresets]>
) {
  const preset = SafetyPresets[presetName];
  if (!preset) {
    throw new Error(`未知的预设配置: ${presetName}`);
  }

  const config = { ...preset, ...overrides };
  return new SafetyMonitor(config);
}

/**
 * 使用预设创建行为随机化器
 */
export function createBehaviorRandomizerWithPreset(
  session: IInputSession,
  presetName: keyof typeof RandomizationPresets,
  overrides?: Partial<typeof RandomizationPresets[keyof typeof RandomizationPresets]>
) {
  const preset = RandomizationPresets[presetName];
  if (!preset) {
    throw new Error(`未知的预设配置: ${presetName}`);
  }

  const config = { ...preset, ...overrides };
  return new BehaviorRandomizer(session, config);
}