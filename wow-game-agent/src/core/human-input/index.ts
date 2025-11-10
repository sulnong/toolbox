/**
 * 人性化输入模拟模块
 * 提供符合人类行为特征的鼠标和键盘输入模拟
 */

export { HumanLikeBezierGenerator } from './bezier-generator';
export { IntelligentDelayCalculator, HumanReactionModel } from './delay-calculator';
export { HumanInputSimulator } from './input-simulator';

// 重新导出相关类型
export type {
  IPoint,
  IInputSession,
  IHumanBehaviorProfile,
  IInputEvent,
  IInputStatistics
} from '@/types';

export type {
  IMousePathConfig,
  IKeyboardInputConfig,
  IInputDelayConfig,
  IBezierControlPoint
} from '@/types/input';

/**
 * 创建人性化输入模拟器工厂函数
 */
export function createHumanInputSimulator(
  sessionId?: string,
  config?: {
    enableRealTimeMode?: boolean;
    enableMicroTremors?: boolean;
    enableErrorSimulation?: boolean;
    humanAccuracyLevel?: number;
    speedVariationLevel?: number;
    errorRate?: number;
  }
) {
  const session: IInputSession = {
    id: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date(),
    operationCount: 0,
    errorCount: 0,
    fatigueLevel: 0,
    characteristics: {
      reactionTime: {
        mean: 250,
        stdDev: 50
      },
      mouseSpeed: {
        min: 0.5,
        max: 2.0,
        preferred: 1.0
      },
      accuracy: {
        precision: 0.85,
        tremor: 0.1
      },
      patterns: {
        rhythmicTendency: 0.3,
        errorRate: 0.02,
        correctionSpeed: 0.8
      }
    }
  };

  return new HumanInputSimulator(session, config);
}

/**
 * 预设的人类行为配置文件
 */
export const HumanBehaviorPresets = {
  /**
   * 精确型玩家 (适合需要精确操作的场景)
   */
  precise: {
    reactionTime: { mean: 200, stdDev: 30 },
    mouseSpeed: { min: 0.3, max: 1.5, preferred: 0.7 },
    accuracy: { precision: 0.95, tremor: 0.05 },
    patterns: { rhythmicTendency: 0.2, errorRate: 0.01, correctionSpeed: 0.9 }
  },

  /**
   * 普通型玩家 (一般游戏玩家)
   */
  normal: {
    reactionTime: { mean: 250, stdDev: 50 },
    mouseSpeed: { min: 0.5, max: 2.0, preferred: 1.0 },
    accuracy: { precision: 0.85, tremor: 0.1 },
    patterns: { rhythmicTendency: 0.3, errorRate: 0.02, correctionSpeed: 0.8 }
  },

  /**
   * 休闲型玩家 (更随意的操作风格)
   */
  casual: {
    reactionTime: { mean: 350, stdDev: 80 },
    mouseSpeed: { min: 0.8, max: 2.5, preferred: 1.5 },
    accuracy: { precision: 0.75, tremor: 0.15 },
    patterns: { rhythmicTendency: 0.5, errorRate: 0.05, correctionSpeed: 0.6 }
  },

  /**
   * 疲劳状态 (模拟长时间游戏后的状态)
   */
  fatigued: {
    reactionTime: { mean: 400, stdDev: 100 },
    mouseSpeed: { min: 0.3, max: 1.5, preferred: 0.6 },
    accuracy: { precision: 0.65, tremor: 0.25 },
    patterns: { rhythmicTendency: 0.1, errorRate: 0.08, correctionSpeed: 0.4 }
  }
};

/**
 * 创建具有特定行为特征的输入模拟器
 */
export function createHumanInputSimulatorWithProfile(
  profileName: keyof typeof HumanBehaviorPresets,
  sessionId?: string
) {
  const profile = HumanBehaviorPresets[profileName];
  if (!profile) {
    throw new Error(`未知的预设配置文件: ${profileName}`);
  }

  const session: IInputSession = {
    id: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date(),
    operationCount: 0,
    errorCount: 0,
    fatigueLevel: profileName === 'fatigued' ? 0.8 : 0.2,
    characteristics: profile
  };

  // 根据配置文件调整模拟器参数
  const config = {
    humanAccuracyLevel: profile.accuracy.precision,
    speedVariationLevel: profile.mouseSpeed.preferred,
    errorRate: profile.patterns.errorRate,
    enableMicroTremors: profile.accuracy.tremor > 0.1,
    enableErrorSimulation: profile.patterns.errorRate > 0.02
  };

  return new HumanInputSimulator(session, config);
}