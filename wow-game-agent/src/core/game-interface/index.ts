/**
 * 游戏界面模块
 * 提供游戏窗口检测、屏幕捕获和图像分析功能
 */

export { GameWindowDetector } from './window-detector';
export { ScreenCapture } from './screen-capture';

// 重新导出相关类型
export type {
  IGameWindow,
  IRectangle,
  IPoint,
  GameElement
} from '@/types';

export type {
  IScreenAnalysis,
  IImageBuffer
} from '@/types/input';

/**
 * 创建游戏窗口检测器工厂函数
 */
export function createGameWindowDetector(config?: {
  gameWindowTitlePatterns?: string[];
  gameProcessNames?: string[];
  detectionInterval?: number;
  autoFocus?: boolean;
  validateWindow?: boolean;
}) {
  const detectorConfig = {
    gameWindowTitlePatterns: [
      'World of Warcraft',
      'WoW',
      '魔兽世界'
    ],
    gameProcessNames: [
      'Wow.exe',
      'WoW.exe',
      'Wow-64.exe'
    ],
    detectionInterval: 1000, // 1秒
    autoFocus: false,
    validateWindow: true,
    ...config
  };

  return new GameWindowDetector(detectorConfig);
}

/**
 * 创建屏幕捕获器工厂函数
 */
export function createScreenCapture(
  config?: {
    captureQuality?: number;
    captureFormat?: 'png' | 'jpeg' | 'bmp';
    enableRegionCapture?: boolean;
    enableCompression?: boolean;
    cacheScreenshots?: boolean;
    maxCacheSize?: number;
  },
  colorConfig?: {
    tolerance?: number;
    enableHSV?: boolean;
    sampleSize?: number;
    enableAdaptiveThreshold?: boolean;
  },
  templateConfig?: {
    threshold?: number;
    enableMultiScale?: boolean;
    scaleFactor?: number;
    enableRotation?: boolean;
    rotationSteps?: number;
  }
) {
  const captureConfig = {
    captureQuality: 90,
    captureFormat: 'png' as const,
    enableRegionCapture: true,
    enableCompression: true,
    cacheScreenshots: true,
    maxCacheSize: 10,
    ...config
  };

  const colorMatchingConfig = {
    tolerance: 30,
    enableHSV: true,
    sampleSize: 5,
    enableAdaptiveThreshold: true,
    ...colorConfig
  };

  const templateMatchingConfig = {
    threshold: 0.8,
    enableMultiScale: true,
    scaleFactor: 0.9,
    enableRotation: false,
    rotationSteps: 8,
    ...templateConfig
  };

  return new ScreenCapture(captureConfig, colorMatchingConfig, templateMatchingConfig);
}

/**
 * 预设的游戏窗口检测配置
 */
export const GameWindowPresets = {
  /**
   * 严格模式 (精确匹配)
   */
  strict: {
    gameWindowTitlePatterns: ['World of Warcraft'],
    gameProcessNames: ['Wow.exe', 'Wow-64.exe'],
    detectionInterval: 500, // 0.5秒
    autoFocus: false,
    validateWindow: true
  },

  /**
   * 标准模式 (平衡性能和准确性)
   */
  standard: {
    gameWindowTitlePatterns: ['World of Warcraft', 'WoW'],
    gameProcessNames: ['Wow.exe', 'WoW.exe', 'Wow-64.exe'],
    detectionInterval: 1000, // 1秒
    autoFocus: false,
    validateWindow: true
  },

  /**
   * 宽松模式 (支持更多变体)
   */
  relaxed: {
    gameWindowTitlePatterns: ['World of Warcraft', 'WoW', '魔兽世界'],
    gameProcessNames: ['Wow.exe', 'WoW.exe', 'Wow-64.exe'],
    detectionInterval: 2000, // 2秒
    autoFocus: true,
    validateWindow: false
  }
};

/**
 * 预设的屏幕捕获配置
 */
export const ScreenCapturePresets = {
  /**
   * 高质量模式 (最佳图像质量)
   */
  highQuality: {
    captureQuality: 100,
    captureFormat: 'png' as const,
    enableRegionCapture: true,
    enableCompression: false,
    cacheScreenshots: true,
    maxCacheSize: 5
  },

  /**
   * 平衡模式 (质量和性能平衡)
   */
  balanced: {
    captureQuality: 90,
    captureFormat: 'png' as const,
    enableRegionCapture: true,
    enableCompression: true,
    cacheScreenshots: true,
    maxCacheSize: 10
  },

  /**
   * 高性能模式 (优化速度)
   */
  highPerformance: {
    captureQuality: 75,
    captureFormat: 'jpeg' as const,
    enableRegionCapture: true,
    enableCompression: true,
    cacheScreenshots: true,
    maxCacheSize: 20
  }
};

/**
 * 使用预设创建游戏窗口检测器
 */
export function createGameWindowDetectorWithPreset(
  presetName: keyof typeof GameWindowPresets,
  overrides?: Partial<typeof GameWindowPresets[keyof typeof GameWindowPresets]>
) {
  const preset = GameWindowPresets[presetName];
  if (!preset) {
    throw new Error(`未知的预设配置: ${presetName}`);
  }

  const config = { ...preset, ...overrides };
  return new GameWindowDetector(config);
}

/**
 * 使用预设创建屏幕捕获器
 */
export function createScreenCaptureWithPreset(
  presetName: keyof typeof ScreenCapturePresets,
  overrides?: Partial<typeof ScreenCapturePresets[keyof typeof ScreenCapturePresets]>,
  colorConfig?: any,
  templateConfig?: any
) {
  const preset = ScreenCapturePresets[presetName];
  if (!preset) {
    throw new Error(`未知的预设配置: ${presetName}`);
  }

  const config = { ...preset, ...overrides };
  return new ScreenCapture(config, colorConfig, templateConfig);
}

/**
 * 游戏界面管理器 (组合窗口检测和屏幕捕获)
 */
export class GameInterfaceManager {
  private readonly windowDetector: GameWindowDetector;
  private readonly screenCapture: ScreenCapture;

  constructor(
    windowDetector: GameWindowDetector,
    screenCapture: ScreenCapture
  ) {
    this.windowDetector = windowDetector;
    this.screenCapture = screenCapture;
  }

  /**
   * 初始化游戏界面管理
   */
  async initialize(): Promise<void> {
    // 启动窗口监控
    this.windowDetector.startMonitoring();

    // 等待检测到游戏窗口
    await this.waitForGameWindow();

    logger.info('游戏界面管理器初始化完成');
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.windowDetector.stopMonitoring();
    this.screenCapture.clearCache();
    logger.info('游戏界面管理器已清理');
  }

  /**
   * 获取当前活动游戏窗口
   */
  getActiveWindow() {
    return this.windowDetector.getActiveGameWindow();
  }

  /**
   * 捕获游戏窗口截图
   */
  async captureGameWindow() {
    const activeWindow = this.getActiveWindow();
    if (!activeWindow) {
      throw new Error('没有活动的游戏窗口');
    }

    return await this.screenCapture.captureRegion(activeWindow.bounds);
  }

  /**
   * 分析游戏界面
   */
  async analyzeGameInterface() {
    const screenshot = await this.captureGameWindow();
    return await this.screenCapture.analyzeScreen();
  }

  /**
   * 等待游戏窗口出现
   */
  private async waitForGameWindow(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const activeWindow = this.windowDetector.getActiveGameWindow();

        if (activeWindow) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('等待游戏窗口超时'));
        }
      }, 1000);
    });
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      window: this.windowDetector.getStatistics(),
      screenCapture: this.screenCapture.getStatistics()
    };
  }
}

/**
 * 创建游戏界面管理器工厂函数
 */
export function createGameInterfaceManager(
  windowConfig?: Partial<GameWindowDetector['config']>,
  screenConfig?: Partial<ScreenCapture['config']>
) {
  const windowDetector = createGameWindowDetector(windowConfig);
  const screenCapture = createScreenCapture(screenConfig);

  return new GameInterfaceManager(windowDetector, screenCapture);
}