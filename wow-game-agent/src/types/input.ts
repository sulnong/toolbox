/**
 * 输入模拟相关的类型定义
 */

import { IPoint, IRectangle } from './index';

// 贝塞尔曲线控制点
export interface IBezierControlPoint extends IPoint {
  handleIn?: IPoint;
  handleOut?: IPoint;
}

// 鼠标路径配置
export interface IMousePathConfig {
  startPoint: IPoint;
  endPoint: IPoint;
  curvature: number; // 曲率 0-1
  speed: number; // 速度系数 0.1-2.0
  deviation: number; // 随机偏差 0-50
  noise: number; // 噪声强度 0-1
}

// 键盘输入配置
export interface IKeyboardInputConfig {
  key: string;
  modifiers?: string[]; // ['ctrl', 'alt', 'shift']
  duration: number; // 按键持续时间 (ms)
  pressure?: number; // 按键压力模拟 0-1
  delay?: number; // 按键后延迟 (ms)
}

// 输入延迟配置
export interface IInputDelayConfig {
  baseDelay: number; // 基础延迟
  variance: number; // 变化范围
  distribution: 'gaussian' | 'uniform' | 'exponential'; // 分布类型
  fatigueMultiplier: number; // 疲劳倍数
}

// 人类行为特征
export interface IHumanBehaviorProfile {
  reactionTime: {
    mean: number; // 平均反应时间
    stdDev: number; // 标准差
  };
  mouseSpeed: {
    min: number;
    max: number;
    preferred: number; // 偏好速度
  };
  accuracy: {
    precision: number; // 精度 0-1
    tremor: number; // 手抖程度 0-1
  };
  patterns: {
    rhythmicTendency: number; // 节奏倾向性 0-1
    errorRate: number; // 错误率 0-1
    correctionSpeed: number; // 纠正速度
  };
}

// 输入会话
export interface IInputSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  operationCount: number;
  errorCount: number;
  fatigueLevel: number; // 疲劳程度 0-1
  characteristics: Partial<IHumanBehaviorProfile>;
}

// 输入事件
export interface IInputEvent {
  id: string;
  type: 'mouse_move' | 'mouse_click' | 'key_press' | 'key_release';
  timestamp: Date;
  position?: IPoint;
  key?: string;
  duration: number;
  confidence: number; // 人类相似度置信度 0-1
  metadata: Record<string, unknown>;
}

// 输入统计
export interface IInputStatistics {
  totalEvents: number;
  averageReactionTime: number;
  mousePathAccuracy: number;
  errorRate: number;
  fatigueScore: number;
  humanLikenessScore: number;
  lastUpdate: Date;
}