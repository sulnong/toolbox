/**
 * Jest 测试环境设置文件
 * 配置全局测试环境、mock 和工具函数
 */

import { config } from 'dotenv';

// 加载测试环境变量
config({ path: '.env.test' });

// 设置测试超时
jest.setTimeout(30000);

// 全局测试配置
global.console = {
  ...console,
  // 在测试中禁用某些 console 方法以减少噪音
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error // 保留错误输出
};

// Mock Node.js 原生模块
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  // 可以在这里添加 fs 的 mock
}));

// Mock 外部依赖
jest.mock('robotjs', () => ({
  moveMouse: jest.fn(),
  mouseClick: jest.fn(),
  keyTap: jest.fn(),
  keyToggle: jest.fn(),
  screen: {
    capture: jest.fn(() => Buffer.from('fake-screenshot'))
  }
}));

jest.mock('win32-api', () => ({
  User32: {
    FindWindow: jest.fn(),
    GetWindowRect: jest.fn(),
    SetForegroundWindow: jest.fn(),
    GetWindowThreadProcessId: jest.fn()
  }
}));

// 全局测试工具函数
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidPoint(): R;
      toBeValidRectangle(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}

// 自定义匹配器
expect.extend({
  toBeValidPoint(received: { x: number; y: number }) {
    const isValid = typeof received.x === 'number' && typeof received.y === 'number' &&
                   received.x >= 0 && received.y >= 0;

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid point`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid point with non-negative x, y coordinates`,
        pass: false
      };
    }
  },

  toBeValidRectangle(received: { x: number; y: number; width: number; height: number }) {
    const isValid = typeof received.x === 'number' && typeof received.y === 'number' &&
                   typeof received.width === 'number' && typeof received.height === 'number' &&
                   received.width > 0 && received.height > 0;

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid rectangle`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid rectangle with positive width and height`,
        pass: false
      };
    }
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const isInRange = received >= min && received <= max;

    if (isInRange) {
      return {
        message: () => `expected ${received} not to be within range ${min} - ${max}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${min} - ${max}`,
        pass: false
      };
    }
  }
});

// 测试数据生成器
export const TestDataGenerator = {
  /**
   * 生成随机点
   */
  randomPoint(x = 0, y = 0): { x: number; y: number } {
    return {
      x: Math.floor(Math.random() * 1000) + x,
      y: Math.floor(Math.random() * 1000) + y
    };
  },

  /**
   * 生成随机矩形
   */
  randomRectangle(): { x: number; y: number; width: number; height: number } {
    return {
      x: Math.floor(Math.random() * 500),
      y: Math.floor(Math.random() * 500),
      width: Math.floor(Math.random() * 200) + 50,
      height: Math.floor(Math.random() * 200) + 50
    };
  },

  /**
   * 生成随机字符串
   */
  randomString(length = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * 生成随机颜色
   */
  randomColor(): { r: number; g: number; b: number } {
    return {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256)
    };
  },

  /**
   * 生成测试配置
   */
  testConfig(): Record<string, unknown> {
    return {
      ai: {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4'
      },
      game: {
        clientPath: 'C:\\test\\wow.exe',
        windowTitle: 'World of Warcraft',
        screenResolution: { width: 1920, height: 1080 }
      },
      safety: {
        maxSessionHours: 4,
        restIntervalMinutes: 30,
        safetyCheckIntervalSeconds: 60
      },
      input: {
        mouseSpeedFactor: 1.0,
        minInputDelay: 100,
        maxInputDelay: 500
      }
    };
  }
};

// Mock 工厂
export const MockFactory = {
  /**
   * 创建 Mock 游戏窗口
   */
  createMockGameWindow() {
    return {
      handle: 12345,
      title: 'World of Warcraft',
      bounds: TestDataGenerator.randomRectangle(),
      processId: 9999,
      isActive: true
    };
  },

  /**
   * 创建 Mock 游戏状态
   */
  createMockGameState() {
    return {
      isRunning: true,
      isLoggedIn: true,
      currentCharacter: 'TestCharacter',
      location: 'Stormwind',
      lastUpdate: new Date()
    };
  },

  /**
   * 创建 Mock 安全状态
   */
  createMockSafetyStatus() {
    return {
      level: 'safe' as const,
      score: 95,
      lastCheck: new Date(),
      alerts: []
    };
  }
};

// 测试环境清理
afterEach(() => {
  // 清理所有 mock
  jest.clearAllMocks();

  // 清理定时器
  jest.clearAllTimers();

  // 重置模块注册表
  jest.resetModules();
});

// 在所有测试完成后
afterAll(() => {
  // 等待所有异步操作完成
  setTimeout(() => {
    process.exit(0);
  }, 100);
});

// 导出测试环境变量供测试使用
export const TEST_ENV = {
  OPENAI_API_KEY: 'test-api-key',
  WOW_CLIENT_PATH: 'C:\\test\\wow.exe',
  SCREEN_WIDTH: '1920',
  SCREEN_HEIGHT: '1080',
  LOG_LEVEL: 'debug',
  NODE_ENV: 'test',
  DEBUG_MODE: 'true'
};