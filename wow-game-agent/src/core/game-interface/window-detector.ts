/**
 * 游戏窗口检测器
 * 检测和管理魔兽世界游戏窗口，提供窗口状态监控
 */

import { IGameWindow, IRectangle } from '@/types';
import { logger } from '@/utils/logger';
import { GameAgentError } from '@/types';

// Windows API 相关接口定义
interface IWindowHandle {
  handle: number;
}

interface IProcessId {
  processId: number;
}

interface IWindowRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// 这里使用 robotjs 作为跨平台解决方案
// 在实际 Windows 环境中，可以使用 node-ffi 调用 Windows API
let robotjs: any;
try {
  robotjs = require('robotjs');
} catch (error) {
  logger.warn('robotjs 未安装，某些功能可能不可用');
}

/**
 * 窗口检测配置
 */
interface IWindowDetectorConfig {
  gameWindowTitlePatterns: string[]; // 游戏窗口标题模式
  gameProcessNames: string[]; // 游戏进程名称
  detectionInterval: number; // 检测间隔 (毫秒)
  autoFocus: boolean; // 自动聚焦游戏窗口
  validateWindow: boolean; // 验证窗口有效性
}

/**
 * 窗口状态信息
 */
interface IWindowState {
  isVisible: boolean;
  isActive: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  bounds: IRectangle;
  zOrder: number; // Z 轴顺序
}

/**
 * 游戏窗口检测器
 */
export class GameWindowDetector {
  private readonly config: IWindowDetectorConfig;
  private detectedWindows: Map<string, IGameWindow> = new Map();
  private currentActiveWindow: IGameWindow | null = null;
  private detectionTimer?: NodeJS.Timeout;
  private isMonitoring: boolean = false;

  constructor(config: Partial<IWindowDetectorConfig> = {}) {
    // 默认配置
    this.config = {
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

    logger.info('游戏窗口检测器已初始化', {
      titlePatterns: this.config.gameWindowTitlePatterns,
      processNames: this.config.gameProcessNames
    });
  }

  /**
   * 开始监控游戏窗口
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('窗口监控已在运行中');
      return;
    }

    this.isMonitoring = true;

    // 立即执行一次检测
    this.detectWindows();

    // 启动定期检测
    this.detectionTimer = setInterval(() => {
      this.detectWindows();
    }, this.config.detectionInterval);

    logger.info('游戏窗口监控已启动');
  }

  /**
   * 停止监控游戏窗口
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.warn('窗口监控未在运行');
      return;
    }

    this.isMonitoring = false;

    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = undefined;
    }

    logger.info('游戏窗口监控已停止');
  }

  /**
   * 检测所有游戏窗口
   */
  detectWindows(): Map<string, IGameWindow> {
    try {
      // 清空之前的检测结果
      this.detectedWindows.clear();

      // 获取所有窗口
      const allWindows = this.getAllWindows();

      // 筛选出游戏窗口
      const gameWindows = allWindows.filter(window =>
        this.isGameWindow(window)
      );

      // 处理每个游戏窗口
      gameWindows.forEach(window => {
        const gameWindow = this.createGameWindow(window);
        this.detectedWindows.set(gameWindow.handle.toString(), gameWindow);
      });

      // 更新当前活动窗口
      this.updateActiveWindow();

      logger.debug(`检测到 ${this.detectedWindows.size} 个游戏窗口`);

      return this.detectedWindows;

    } catch (error) {
      logger.error('窗口检测失败:', error);
      throw new GameAgentError(
        `窗口检测失败: ${error}`,
        'WINDOW_DETECTION_ERROR',
        'game-interface',
        { error }
      );
    }
  }

  /**
   * 获取当前活动的游戏窗口
   */
  getActiveGameWindow(): IGameWindow | null {
    return this.currentActiveWindow;
  }

  /**
   * 获取所有检测到的游戏窗口
   */
  getAllGameWindows(): IGameWindow[] {
    return Array.from(this.detectedWindows.values());
  }

  /**
   * 根据句柄获取游戏窗口
   */
  getGameWindowByHandle(handle: number): IGameWindow | null {
    return this.detectedWindows.get(handle.toString()) || null;
  }

  /**
   * 设置活动窗口
   */
  async setActiveWindow(window: IGameWindow): Promise<void> {
    try {
      // 验证窗口仍然有效
      if (!this.isWindowValid(window)) {
        throw new Error('窗口无效或已关闭');
      }

      // 设置为前台窗口
      await this.bringWindowToFront(window);

      this.currentActiveWindow = window;

      logger.info(`已设置活动游戏窗口: ${window.title}`, {
        handle: window.handle,
        bounds: window.bounds
      });

    } catch (error) {
      logger.error('设置活动窗口失败:', error);
      throw new GameAgentError(
        `设置活动窗口失败: ${error}`,
        'WINDOW_ACTIVATION_ERROR',
        'game-interface',
        { window, error }
      );
    }
  }

  /**
   * 检查窗口是否仍然有效
   */
  isWindowValid(window: IGameWindow): boolean {
    try {
      // 这里应该检查窗口句柄是否仍然有效
      // 简化实现，实际需要调用系统 API
      return this.detectedWindows.has(window.handle.toString());
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取窗口状态
   */
  getWindowState(window: IGameWindow): IWindowState {
    try {
      const bounds = this.getWindowBounds(window.handle);

      // 检查窗口状态 (简化实现)
      const isVisible = true; // 实际需要检查 WS_VISIBLE
      const isActive = window.isActive;
      const isMinimized = false; // 实际需要检查 WS_MINIMIZE
      const isMaximized = false; // 实际需要检查 WS_MAXIMIZE

      return {
        isVisible,
        isActive,
        isMinimized,
        isMaximized,
        bounds,
        zOrder: 0 // 实际需要获取 Z 轴顺序
      };

    } catch (error) {
      logger.error('获取窗口状态失败:', error);
      throw new GameAgentError(
        `获取窗口状态失败: ${error}`,
        'WINDOW_STATE_ERROR',
        'game-interface',
        { window, error }
      );
    }
  }

  /**
   * 移动窗口到指定位置
   */
  async moveWindow(window: IGameWindow, x: number, y: number): Promise<void> {
    try {
      if (!this.isWindowValid(window)) {
        throw new Error('窗口无效');
      }

      // 实际实现需要调用 SetWindowPos API
      logger.info(`移动窗口到 (${x}, ${y})`, {
        window: window.title,
        handle: window.handle
      });

      // 更新窗口边界
      const newBounds = {
        ...window.bounds,
        x,
        y
      };

      window.bounds = newBounds;

    } catch (error) {
      logger.error('移动窗口失败:', error);
      throw new GameAgentError(
        `移动窗口失败: ${error}`,
        'WINDOW_MOVE_ERROR',
        'game-interface',
        { window, x, y, error }
      );
    }
  }

  /**
   * 调整窗口大小
   */
  async resizeWindow(window: IGameWindow, width: number, height: number): Promise<void> {
    try {
      if (!this.isWindowValid(window)) {
        throw new Error('窗口无效');
      }

      // 实际实现需要调用 SetWindowPos API
      logger.info(`调整窗口大小到 ${width}x${height}`, {
        window: window.title,
        handle: window.handle
      });

      // 更新窗口边界
      const newBounds = {
        ...window.bounds,
        width,
        height
      };

      window.bounds = newBounds;

    } catch (error) {
      logger.error('调整窗口大小失败:', error);
      throw new GameAgentError(
        `调整窗口大小失败: ${error}`,
        'WINDOW_RESIZE_ERROR',
        'game-interface',
        { window, width, height, error }
      );
    }
  }

  /**
   * 最小化窗口
   */
  async minimizeWindow(window: IGameWindow): Promise<void> {
    try {
      if (!this.isWindowValid(window)) {
        throw new Error('窗口无效');
      }

      // 实际实现需要调用 ShowWindow(handle, SW_MINIMIZE)
      logger.info(`最小化窗口: ${window.title}`, { handle: window.handle });

    } catch (error) {
      logger.error('最小化窗口失败:', error);
      throw new GameAgentError(
        `最小化窗口失败: ${error}`,
        'WINDOW_MINIMIZE_ERROR',
        'game-interface',
        { window, error }
      );
    }
  }

  /**
   * 最大化窗口
   */
  async maximizeWindow(window: IGameWindow): Promise<void> {
    try {
      if (!this.isWindowValid(window)) {
        throw new Error('窗口无效');
      }

      // 实际实现需要调用 ShowWindow(handle, SW_MAXIMIZE)
      logger.info(`最大化窗口: ${window.title}`, { handle: window.handle });

    } catch (error) {
      logger.error('最大化窗口失败:', error);
      throw new GameAgentError(
        `最大化窗口失败: ${error}`,
        'WINDOW_MAXIMIZE_ERROR',
        'game-interface',
        { window, error }
      );
    }
  }

  /**
   * 恢复窗口
   */
  async restoreWindow(window: IGameWindow): Promise<void> {
    try {
      if (!this.isWindowValid(window)) {
        throw new Error('窗口无效');
      }

      // 实际实现需要调用 ShowWindow(handle, SW_RESTORE)
      logger.info(`恢复窗口: ${window.title}`, { handle: window.handle });

    } catch (error) {
      logger.error('恢复窗口失败:', error);
      throw new GameAgentError(
        `恢复窗口失败: ${error}`,
        'WINDOW_RESTORE_ERROR',
        'game-interface',
        { window, error }
      );
    }
  }

  /**
   * 获取窗口统计信息
   */
  getStatistics(): {
    totalWindows: number;
    activeWindows: number;
    monitoringDuration: number;
    detectionCount: number;
    lastDetectionTime: Date | null;
  } {
    const activeWindows = Array.from(this.detectedWindows.values()).filter(w => w.isActive).length;

    return {
      totalWindows: this.detectedWindows.size,
      activeWindows,
      monitoringDuration: this.isMonitoring ? Date.now() - (this.detectionTimer ? 0 : Date.now()) : 0,
      detectionCount: this.detectedWindows.size,
      lastDetectionTime: this.detectedWindows.size > 0 ? new Date() : null
    };
  }

  /**
   * 获取所有窗口 (简化实现)
   */
  private getAllWindows(): IWindowHandle[] {
    // 实际实现需要调用 EnumWindows API
    // 这里返回一个模拟的窗口列表
    return [
      { handle: 12345 },
      { handle: 12346 },
      { handle: 12347 }
    ];
  }

  /**
   * 判断是否为游戏窗口
   */
  private isGameWindow(window: IWindowHandle): boolean {
    try {
      const title = this.getWindowTitle(window.handle);
      const processName = this.getProcessName(window.handle);

      // 检查窗口标题
      const titleMatches = this.config.gameWindowTitlePatterns.some(pattern =>
        title.toLowerCase().includes(pattern.toLowerCase())
      );

      // 检查进程名称
      const processMatches = this.config.gameProcessNames.some(name =>
        processName.toLowerCase() === name.toLowerCase()
      );

      return titleMatches || processMatches;

    } catch (error) {
      logger.debug('检查窗口时出错:', error);
      return false;
    }
  }

  /**
   * 创建游戏窗口对象
   */
  private createGameWindow(window: IWindowHandle): IGameWindow {
    const title = this.getWindowTitle(window.handle);
    const bounds = this.getWindowBounds(window.handle);
    const processInfo = this.getProcessInfo(window.handle);
    const isActive = this.isWindowActive(window.handle);

    return {
      handle: window.handle,
      title,
      bounds,
      processId: processInfo.processId,
      isActive
    };
  }

  /**
   * 更新当前活动窗口
   */
  private updateActiveWindow(): void {
    const activeWindows = Array.from(this.detectedWindows.values()).filter(w => w.isActive);

    if (activeWindows.length === 1) {
      if (!this.currentActiveWindow || this.currentActiveWindow.handle !== activeWindows[0].handle) {
        this.currentActiveWindow = activeWindows[0];
        logger.info(`活动游戏窗口变更: ${this.currentActiveWindow.title}`);
      }
    } else if (activeWindows.length === 0) {
      if (this.currentActiveWindow) {
        logger.info('失去活动游戏窗口');
        this.currentActiveWindow = null;
      }
    } else {
      // 多个活动窗口，选择第一个
      this.currentActiveWindow = activeWindows[0];
      logger.warn(`检测到多个活动游戏窗口，选择: ${this.currentActiveWindow.title}`);
    }
  }

  /**
   * 将窗口置于前台
   */
  private async bringWindowToFront(window: IGameWindow): Promise<void> {
    // 实际实现需要调用 SetForegroundWindow API
    logger.debug(`将窗口置于前台: ${window.title}`);

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * 获取窗口标题
   */
  private getWindowTitle(handle: number): string {
    // 实际实现需要调用 GetWindowText API
    // 这里返回模拟数据
    return 'World of Warcraft';
  }

  /**
   * 获取窗口边界
   */
  private getWindowBounds(handle: number): IRectangle {
    if (robotjs) {
      try {
        const screen = robotjs.getScreenSize();
        return {
          x: 0,
          y: 0,
          width: screen.width,
          height: screen.height
        };
      } catch (error) {
        logger.debug('获取屏幕大小失败:', error);
      }
    }

    // 返回默认值
    return {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    };
  }

  /**
   * 获取进程信息
   */
  private getProcessInfo(handle: number): IProcessId {
    // 实际实现需要调用 GetWindowThreadProcessId API
    return {
      processId: 9999
    };
  }

  /**
   * 获取进程名称
   */
  private getProcessName(handle: number): string {
    // 实际实现需要通过进程ID获取进程名称
    return 'Wow.exe';
  }

  /**
   * 检查窗口是否活动
   */
  private isWindowActive(handle: number): boolean {
    // 实际实现需要调用 GetForegroundWindow API
    return handle === 12345; // 模拟第一个窗口是活动的
  }
}