/**
 * 核心类型定义文件
 * 定义整个项目中使用的基础类型和接口
 */

// 基础几何类型
export interface IPoint {
  x: number;
  y: number;
}

export interface ISize {
  width: number;
  height: number;
}

export interface IRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 游戏相关类型
export interface IGameWindow {
  handle: number;
  title: string;
  bounds: IRectangle;
  processId: number;
  isActive: boolean;
}

export interface IGameState {
  isRunning: boolean;
  isLoggedIn: boolean;
  currentCharacter?: string;
  location?: string;
  lastUpdate: Date;
}

// 输入模拟类型
export interface IInputDelay {
  min: number;
  max: number;
  current: number;
}

export interface IMousePath {
  points: IPoint[];
  duration: number;
  curve: 'bezier' | 'linear' | 'random';
}

export interface IKeyPress {
  key: string;
  modifiers: string[];
  duration: number;
}

// 安全监控类型
export interface ISafetyStatus {
  level: 'safe' | 'warning' | 'danger';
  score: number;
  lastCheck: Date;
  alerts: string[];
}

export interface IUsageStats {
  sessionStartTime: Date;
  totalUsageTime: number;
  operationCount: number;
  restPeriods: number;
  lastRestTime?: Date;
}

// AI 引擎类型
export interface IAISuggestion {
  id: string;
  type: 'mouse' | 'keyboard' | 'wait' | 'analysis';
  confidence: number;
  description: string;
  parameters: Record<string, unknown>;
  timestamp: Date;
}

export interface IScreenAnalysis {
  screenshot: Buffer;
  elements: GameElement[];
  confidence: number;
  timestamp: Date;
}

// 场景插件类型
export interface IScenarioConfig {
  name: string;
  enabled: boolean;
  priority: number;
  settings: Record<string, unknown>;
}

export interface IScenarioStatus {
  name: string;
  status: 'idle' | 'running' | 'paused' | 'error';
  progress: number;
  lastActivity: Date;
  error?: string;
}

// 游戏元素识别
export interface GameElement {
  type: 'character' | 'target' | 'npc' | 'object' | 'ui' | 'text';
  bounds: IRectangle;
  confidence: number;
  properties: Record<string, unknown>;
}

// 配置类型
export interface IAppConfig {
  // AI 配置
  ai: {
    provider: 'openai' | 'anthropic' | 'local';
    apiKey: string;
    model: string;
    baseUrl?: string;
  };

  // 游戏配置
  game: {
    clientPath: string;
    windowTitle: string;
    screenResolution: ISize;
    autoDetectWindow: boolean;
  };

  // 安全配置
  safety: {
    maxSessionHours: number;
    restIntervalMinutes: number;
    safetyCheckIntervalSeconds: number;
    emergencyStopKey: string;
  };

  // 输入配置
  input: {
    mouseSpeedFactor: number;
    minInputDelay: number;
    maxInputDelay: number;
    enableRandomization: boolean;
  };

  // 日志配置
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    filePath: string;
    enableConsole: boolean;
    enableFile: boolean;
  };
}

// 错误类型
export class GameAgentError extends Error {
  public readonly code: string;
  public readonly category: 'config' | 'game' | 'input' | 'safety' | 'ai' | 'plugin';

  constructor(
    message: string,
    code: string,
    category: GameAgentError['category'],
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GameAgentError';
    this.code = code;
    this.category = category;
  }
}

// 事件类型
export interface IGameAgentEvent {
  type: string;
  timestamp: Date;
  data: Record<string, unknown>;
  source: string;
}

// 插件接口
export interface IPlugin {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];

  initialize(): Promise<void>;
  execute(config: IScenarioConfig): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): IScenarioStatus;
  cleanup(): Promise<void>;
}

// 钓鱼场景特定类型
export interface IFishingConfig extends IScenarioConfig {
  skillKey: string;
  hookColor: {
    r: number;
    g: number;
    b: number;
  };
  audioAlerts: boolean;
  visualAlerts: boolean;
  alertVolume: number;
}

export interface IFishingSession {
  startTime: Date;
  endTime?: Date;
  catches: number;
  misses: number;
  locations: string[];
  experience: number;
}

// 环境变量类型
export interface IEnvironmentVariables {
  // AI 配置
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;

  // 游戏配置
  WOW_CLIENT_PATH?: string;
  WOW_WINDOW_TITLE?: string;
  SCREEN_WIDTH?: string;
  SCREEN_HEIGHT?: string;

  // 安全配置
  MAX_SESSION_HOURS?: string;
  REST_INTERVAL_MINUTES?: string;
  SAFETY_CHECK_INTERVAL_SECONDS?: string;

  // 输入配置
  MIN_INPUT_DELAY?: string;
  MAX_INPUT_DELAY?: string;
  MOUSE_SPEED_FACTOR?: string;

  // 日志配置
  LOG_LEVEL?: string;
  LOG_FILE_PATH?: string;
  VERBOSE_LOGGING?: string;

  // 开发配置
  NODE_ENV?: string;
  DEBUG_MODE?: string;
  TEST_MODE?: string;
}

// 导出所有类型的联合类型
export type GameAgentConfig = IAppConfig;
export type GameEvent = IGameAgentEvent;
export type EnvironmentVars = IEnvironmentVariables;