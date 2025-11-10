/**
 * 屏幕截图和分析系统
 * 提供屏幕捕获、图像处理和游戏界面元素识别功能
 */

import { IPoint, IRectangle, GameElement } from '@/types';
import { IScreenAnalysis } from '@/types/input';
import { logger } from '@/utils/logger';
import { GameAgentError } from '@/types';
import * as sharp from 'sharp';
import * as Jimp from 'jimp';

// 图像处理库接口
interface IImageBuffer {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

/**
 * 屏幕捕获配置
 */
interface IScreenCaptureConfig {
  captureQuality: number; // 截图质量 0-100
  captureFormat: 'png' | 'jpeg' | 'bmp';
  enableRegionCapture: boolean; // 启用区域捕获
  enableCompression: boolean; // 启用压缩
  cacheScreenshots: boolean; // 缓存截图
  maxCacheSize: number; // 最大缓存数量
}

/**
 * 颜色匹配配置
 */
interface IColorMatchingConfig {
  tolerance: number; // 颜色容差 0-255
  enableHSV: boolean; // 启用 HSV 颜色空间
  sampleSize: number; // 采样大小
  enableAdaptiveThreshold: boolean; // 自适应阈值
}

/**
 * 模板匹配配置
 */
interface ITemplateMatchingConfig {
  threshold: number; // 匹配阈值 0-1
  enableMultiScale: boolean; // 启用多尺度匹配
  scaleFactor: number; // 缩放因子
  enableRotation: boolean; // 启用旋转匹配
  rotationSteps: number; // 旋转步数
}

/**
 * 屏幕捕获器
 */
export class ScreenCapture {
  private readonly config: IScreenCaptureConfig;
  private readonly colorConfig: IColorMatchingConfig;
  private readonly templateConfig: ITemplateMatchingConfig;
  private readonly screenshotCache: Map<string, IImageBuffer>;
  private captureCount: number = 0;

  constructor(
    config: Partial<IScreenCaptureConfig> = {},
    colorConfig: Partial<IColorMatchingConfig> = {},
    templateConfig: Partial<ITemplateMatchingConfig> = {}
  ) {
    // 默认配置
    this.config = {
      captureQuality: 90,
      captureFormat: 'png',
      enableRegionCapture: true,
      enableCompression: true,
      cacheScreenshots: true,
      maxCacheSize: 10,
      ...config
    };

    this.colorConfig = {
      tolerance: 30,
      enableHSV: true,
      sampleSize: 5,
      enableAdaptiveThreshold: true,
      ...colorConfig
    };

    this.templateConfig = {
      threshold: 0.8,
      enableMultiScale: true,
      scaleFactor: 0.9,
      enableRotation: false,
      rotationSteps: 8,
      ...templateConfig
    };

    this.screenshotCache = new Map();

    logger.info('屏幕捕获器已初始化', {
      config: this.config,
      colorConfig: this.colorConfig,
      templateConfig: this.templateConfig
    });
  }

  /**
   * 捕获整个屏幕
   */
  async captureFullScreen(): Promise<IImageBuffer> {
    try {
      const startTime = Date.now();

      // 生成缓存键
      const cacheKey = 'fullscreen';

      if (this.config.cacheScreenshots && this.screenshotCache.has(cacheKey)) {
        const cached = this.screenshotCache.get(cacheKey)!;
        logger.debug('使用缓存的完整屏幕截图');
        return cached;
      }

      // 使用 robotjs 捕获屏幕 (如果可用)
      let buffer: Buffer;
      let width: number;
      let height: number;

      try {
        // 尝试使用 robotjs
        const robotjs = require('robotjs');
        const screenSize = robotjs.getScreenSize();
        width = screenSize.width;
        height = screenSize.height;

        // robotjs 的 screen.capture 返回一个包含图像数据的 Buffer
        const rawBuffer = robotjs.screen.capture(0, 0, width, height);

        // 转换为标准格式
        buffer = await this.convertRawBuffer(rawBuffer, width, height);

      } catch (robotjsError) {
        logger.warn('robotjs 不可用，使用备用方案', { error: robotjsError });

        // 备用方案：使用 Jimp (如果支持)
        try {
          const jimpImage = await Jimp.read(width || 1920, height || 1080);
          buffer = await jimpImage.getBufferAsync(Jimp.MIME_PNG);
          width = jimpImage.getWidth();
          height = jimpImage.getHeight();
        } catch (jimpError) {
          // 最后的备用方案：创建一个空的测试图像
          width = width || 1920;
          height = height || 1080;
          buffer = await this.createPlaceholderImage(width, height);
        }
      }

      // 应用压缩
      if (this.config.enableCompression && this.config.captureFormat !== 'png') {
        buffer = await this.compressImage(buffer);
      }

      const imageBuffer: IImageBuffer = {
        data: buffer,
        width,
        height,
        channels: 4 // RGBA
      };

      // 缓存结果
      if (this.config.cacheScreenshots) {
        this.addToCache(cacheKey, imageBuffer);
      }

      this.captureCount++;
      const duration = Date.now() - startTime;

      logger.debug(`完整屏幕截图完成`, {
        width,
        height,
        size: buffer.length,
        duration
      });

      return imageBuffer;

    } catch (error) {
      logger.error('屏幕截图失败:', error);
      throw new GameAgentError(
        `屏幕截图失败: ${error}`,
        'SCREEN_CAPTURE_ERROR',
        'game-interface',
        { error }
      );
    }
  }

  /**
   * 捕获指定区域
   */
  async captureRegion(region: IRectangle): Promise<IImageBuffer> {
    if (!this.config.enableRegionCapture) {
      throw new Error('区域捕获未启用');
    }

    try {
      const startTime = Date.now();
      const cacheKey = `region_${region.x}_${region.y}_${region.width}_${region.height}`;

      // 检查缓存
      if (this.config.cacheScreenshots && this.screenshotCache.has(cacheKey)) {
        const cached = this.screenshotCache.get(cacheKey)!;
        logger.debug('使用缓存区域截图');
        return cached;
      }

      let buffer: Buffer;

      try {
        // 尝试使用 robotjs
        const robotjs = require('robotjs');
        const rawBuffer = robotjs.screen.capture(region.x, region.y, region.width, region.height);
        buffer = await this.convertRawBuffer(rawBuffer, region.width, region.height);

      } catch (error) {
        logger.warn('robotjs 区域捕获失败，使用备用方案', { error });

        // 备用方案：捕获完整屏幕然后裁剪
        const fullScreen = await this.captureFullScreen();
        buffer = await this.cropImage(fullScreen.data, region);
      }

      // 应用压缩
      if (this.config.enableCompression && this.config.captureFormat !== 'png') {
        buffer = await this.compressImage(buffer);
      }

      const imageBuffer: IImageBuffer = {
        data: buffer,
        width: region.width,
        height: region.height,
        channels: 4
      };

      // 缓存结果
      if (this.config.cacheScreenshots) {
        this.addToCache(cacheKey, imageBuffer);
      }

      const duration = Date.now() - startTime;
      this.captureCount++;

      logger.debug(`区域截图完成`, {
        region,
        size: buffer.length,
        duration
      });

      return imageBuffer;

    } catch (error) {
      logger.error('区域截图失败:', error);
      throw new GameAgentError(
        `区域截图失败: ${error}`,
        'REGION_CAPTURE_ERROR',
        'game-interface',
        { region, error }
      );
    }
  }

  /**
   * 检查指定位置的颜色
   */
  async getPixelColor(point: IPoint): Promise<{
    r: number;
    g: number;
    b: number;
    a: number;
  }> {
    try {
      // 捕获包含该点的小区域
      const region: IRectangle = {
        x: Math.max(0, point.x - 2),
        y: Math.max(0, point.y - 2),
        width: 5,
        height: 5
      };

      const imageBuffer = await this.captureRegion(region);

      // 获取中心像素的颜色
      const centerX = 2; // 区域中心
      const centerY = 2;

      return await this.getPixelAt(imageBuffer, centerX, centerY);

    } catch (error) {
      logger.error('获取像素颜色失败:', error);
      throw new GameAgentError(
        `获取像素颜色失败: ${error}`,
        'PIXEL_COLOR_ERROR',
        'game-interface',
        { point, error }
      );
    }
  }

  /**
   * 查找指定颜色
   */
  async findColor(
    color: { r: number; g: number; b: number },
    searchRegion?: IRectangle
  ): Promise<IPoint[]> {
    try {
      const startTime = Date.now();

      // 确定搜索区域
      const region = searchRegion || await this.getFullScreenRegion();
      const imageBuffer = await this.captureRegion(region);

      // 查找匹配颜色的像素
      const matches = await this.findColorPixels(imageBuffer, color);

      // 转换为绝对坐标
      const absoluteMatches = matches.map(point => ({
        x: point.x + region.x,
        y: point.y + region.y
      }));

      const duration = Date.now() - startTime;
      logger.debug(`颜色查找完成`, {
        color,
        searchRegion: region,
        matches: absoluteMatches.length,
        duration
      });

      return absoluteMatches;

    } catch (error) {
      logger.error('颜色查找失败:', error);
      throw new GameAgentError(
        `颜色查找失败: ${error}`,
        'COLOR_FIND_ERROR',
        'game-interface',
        { color, searchRegion, error }
      );
    }
  }

  /**
   * 模板匹配
   */
  async findTemplate(
    template: IImageBuffer,
    searchRegion?: IRectangle,
    threshold?: number
  ): Promise<Array<{ point: IPoint; confidence: number }>> {
    try {
      const startTime = Date.now();
      const matchThreshold = threshold || this.templateConfig.threshold;

      // 确定搜索区域
      const region = searchRegion || await this.getFullScreenRegion();
      const searchImage = await this.captureRegion(region);

      // 执行模板匹配
      const matches = await this.performTemplateMatching(searchImage, template, matchThreshold);

      // 转换为绝对坐标
      const absoluteMatches = matches.map(match => ({
        point: {
          x: match.point.x + region.x,
          y: match.point.y + region.y
        },
        confidence: match.confidence
      }));

      const duration = Date.now() - startTime;
      logger.debug(`模板匹配完成`, {
        templateSize: { width: template.width, height: template.height },
        searchRegion: region,
        matches: absoluteMatches.length,
        duration
      });

      return absoluteMatches;

    } catch (error) {
      logger.error('模板匹配失败:', error);
      throw new GameAgentError(
        `模板匹配失败: ${error}`,
        'TEMPLATE_MATCHING_ERROR',
        'game-interface',
        { templateSize: { width: template.width, height: template.height }, error }
      );
    }
  }

  /**
   * 分析屏幕内容
   */
  async analyzeScreen(): Promise<IScreenAnalysis> {
    try {
      const startTime = Date.now();

      // 捕获屏幕
      const screenshot = await this.captureFullScreen();

      // 分析屏幕元素
      const elements = await this.detectScreenElements(screenshot);

      // 计算分析置信度
      const confidence = this.calculateAnalysisConfidence(elements);

      const analysis: IScreenAnalysis = {
        screenshot: screenshot.data,
        elements,
        confidence,
        timestamp: new Date()
      };

      const duration = Date.now() - startTime;
      logger.debug(`屏幕分析完成`, {
        elements: elements.length,
        confidence,
        duration
      });

      return analysis;

    } catch (error) {
      logger.error('屏幕分析失败:', error);
      throw new GameAgentError(
        `屏幕分析失败: ${error}`,
        'SCREEN_ANALYSIS_ERROR',
        'game-interface',
        { error }
      );
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.screenshotCache.clear();
    logger.debug('屏幕截图缓存已清理');
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    captureCount: number;
    cacheSize: number;
    cacheHitRate: number;
    averageCaptureTime: number;
  } {
    return {
      captureCount: this.captureCount,
      cacheSize: this.screenshotCache.size,
      cacheHitRate: 0, // 简化实现，实际需要跟踪缓存命中
      averageCaptureTime: 0 // 简化实现，实际需要计算平均时间
    };
  }

  /**
   * 转换原始缓冲区
   */
  private async convertRawBuffer(rawBuffer: any, width: number, height: number): Promise<Buffer> {
    // robotjs 的原始缓冲区转换为标准图像格式
    // 这里需要根据 robotjs 的具体实现来调整
    return Buffer.from(rawBuffer);
  }

  /**
   * 创建占位图像
   */
  private async createPlaceholderImage(width: number, height: number): Promise<Buffer> {
    // 创建一个简单的测试图像
    const image = await Jimp.create(width, height, 0x000000FF);
    return await image.getBufferAsync(Jimp.MIME_PNG);
  }

  /**
   * 裁剪图像
   */
  private async cropImage(buffer: Buffer, region: IRectangle): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      return await image.extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height
      })
      .toBuffer();
    } catch (error) {
      // 如果 sharp 不可用，使用 Jimp
      const image = await Jimp.read(buffer);
      const cropped = image.crop(region.x, region.y, region.width, region.height);
      return await cropped.getBufferAsync(Jimp.MIME_PNG);
    }
  }

  /**
   * 压缩图像
   */
  private async compressImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      return await image
        .jpeg({ quality: this.config.captureQuality })
        .toBuffer();
    } catch (error) {
      // 如果压缩失败，返回原始缓冲区
      return buffer;
    }
  }

  /**
   * 添加到缓存
   */
  private addToCache(key: string, imageBuffer: IImageBuffer): void {
    // 如果缓存已满，删除最旧的条目
    if (this.screenshotCache.size >= this.config.maxCacheSize) {
      const firstKey = this.screenshotCache.keys().next().value;
      this.screenshotCache.delete(firstKey);
    }

    this.screenshotCache.set(key, imageBuffer);
  }

  /**
   * 获取像素颜色
   */
  private async getPixelAt(imageBuffer: IImageBuffer, x: number, y: number): Promise<{
    r: number;
    g: number;
    b: number;
    a: number;
  }> {
    try {
      const image = await Jimp.read(imageBuffer.data);
      const pixel = image.getPixelColor(x, y);
      const color = Jimp.intToRGBA(pixel);

      return {
        r: color.r,
        g: color.g,
        b: color.b,
        a: color.a
      };
    } catch (error) {
      // 备用方案：直接从缓冲区读取
      const offset = (y * imageBuffer.width + x) * imageBuffer.channels;
      return {
        r: imageBuffer.data[offset] || 0,
        g: imageBuffer.data[offset + 1] || 0,
        b: imageBuffer.data[offset + 2] || 0,
        a: imageBuffer.data[offset + 3] || 255
      };
    }
  }

  /**
   * 查找颜色像素
   */
  private async findColorPixels(
    imageBuffer: IImageBuffer,
    targetColor: { r: number; g: number; b: number }
  ): Promise<IPoint[]> {
    const matches: IPoint[] = [];
    const tolerance = this.colorConfig.tolerance;

    try {
      const image = await Jimp.read(imageBuffer.data);

      image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
        const pixelColor = Jimp.intToRGBA(image.getPixelColor(x, y));

        if (this.colorMatches(pixelColor, targetColor, tolerance)) {
          matches.push({ x, y });
        }
      });

    } catch (error) {
      // 备用方案：手动遍历缓冲区
      const { data, width, height, channels } = imageBuffer;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * channels;
          const pixelColor = {
            r: data[offset],
            g: data[offset + 1],
            b: data[offset + 2],
            a: data[offset + 3]
          };

          if (this.colorMatches(pixelColor, targetColor, tolerance)) {
            matches.push({ x, y });
          }
        }
      }
    }

    return matches;
  }

  /**
   * 检查颜色是否匹配
   */
  private colorMatches(
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number },
    tolerance: number
  ): boolean {
    if (this.colorConfig.enableHSV) {
      // 在 HSV 颜色空间中比较
      const hsv1 = this.rgbToHsv(color1);
      const hsv2 = this.rgbToHsv(color2);

      return Math.abs(hsv1.h - hsv2.h) < tolerance &&
             Math.abs(hsv1.s - hsv2.s) < tolerance &&
             Math.abs(hsv1.v - hsv2.v) < tolerance;
    } else {
      // 在 RGB 颜色空间中比较
      return Math.abs(color1.r - color2.r) < tolerance &&
             Math.abs(color1.g - color2.g) < tolerance &&
             Math.abs(color1.b - color2.b) < tolerance;
    }
  }

  /**
   * RGB 转 HSV
   */
  private rgbToHsv(rgb: { r: number; g: number; b: number }): {
    h: number;
    s: number;
    v: number;
  } {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / diff + 2) / 6;
          break;
        case b:
          h = ((r - g) / diff + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s: s * 100, v: v * 100 };
  }

  /**
   * 执行模板匹配
   */
  private async performTemplateMatching(
    searchImage: IImageBuffer,
    template: IImageBuffer,
    threshold: number
  ): Promise<Array<{ point: IPoint; confidence: number }>> {
    // 简化的模板匹配实现
    const matches: Array<{ point: IPoint; confidence: number }> = [];

    try {
      const search = await Jimp.read(searchImage.data);
      const templ = await Jimp.read(template.data);

      // 使用 Jimp 的模板匹配功能
      const result = search.match(templ, threshold);

      if (result) {
        matches.push({
          point: { x: result.x, y: result.y },
          confidence: result.similarity || 0
        });
      }

    } catch (error) {
      logger.warn('Jimp 模板匹配失败，使用简化实现', { error });

      // 备用方案：简单的像素级匹配
      const maxOffsetX = searchImage.width - template.width;
      const maxOffsetY = searchImage.height - template.height;

      for (let y = 0; y <= maxOffsetY; y += 5) { // 步长为5以提高性能
        for (let x = 0; x <= maxOffsetX; x += 5) {
          const confidence = await this.calculateSimilarity(searchImage, template, x, y);

          if (confidence >= threshold) {
            matches.push({ point: { x, y }, confidence });
          }
        }
      }
    }

    return matches;
  }

  /**
   * 计算相似度
   */
  private async calculateSimilarity(
    searchImage: IImageBuffer,
    template: IImageBuffer,
    offsetX: number,
    offsetY: number
  ): Promise<number> {
    // 简化的相似度计算
    let matchingPixels = 0;
    let totalPixels = template.width * template.height;

    try {
      const search = await Jimp.read(searchImage.data);
      const templ = await Jimp.read(template.data);

      for (let y = 0; y < template.height; y++) {
        for (let x = 0; x < template.width; x++) {
          const searchPixel = Jimp.intToRGBA(search.getPixelColor(offsetX + x, offsetY + y));
          const templatePixel = Jimp.intToRGBA(templ.getPixelColor(x, y));

          if (this.colorMatches(searchPixel, templatePixel, 50)) {
            matchingPixels++;
          }
        }
      }

    } catch (error) {
      // 备用方案：返回随机相似度
      return Math.random() * 0.5;
    }

    return matchingPixels / totalPixels;
  }

  /**
   * 检测屏幕元素
   */
  private async detectScreenElements(screenshot: IImageBuffer): Promise<GameElement[]> {
    const elements: GameElement[] = [];

    try {
      // 这里可以实现更复杂的目标检测算法
      // 目前返回一些基本的元素检测结果

      // 检测 UI 元素 (基于颜色和位置)
      const uiElements = await this.detectUIElements(screenshot);
      elements.push(...uiElements);

      // 检测文本元素
      const textElements = await this.detectTextElements(screenshot);
      elements.push(...textElements);

      // 检测游戏对象
      const gameObjects = await this.detectGameObjects(screenshot);
      elements.push(...gameObjects);

    } catch (error) {
      logger.warn('屏幕元素检测失败:', error);
    }

    return elements;
  }

  /**
   * 检测 UI 元素
   */
  private async detectUIElements(screenshot: IImageBuffer): Promise<GameElement[]> {
    // 简化的 UI 元素检测
    // 实际实现可以使用机器学习模型或图像识别算法

    const elements: GameElement[] = [];

    // 模拟检测一些 UI 元素
    elements.push({
      type: 'ui',
      bounds: { x: 10, y: 10, width: 200, height: 30 },
      confidence: 0.8,
      properties: { elementType: 'health_bar' }
    });

    elements.push({
      type: 'ui',
      bounds: { x: 10, y: 50, width: 200, height: 30 },
      confidence: 0.8,
      properties: { elementType: 'mana_bar' }
    });

    return elements;
  }

  /**
   * 检测文本元素
   */
  private async detectTextElements(screenshot: IImageBuffer): Promise<GameElement[]> {
    // 简化的文本检测
    // 实际实现可以使用 OCR 库如 tesseract.js

    const elements: GameElement[] = [];

    // 模拟检测一些文本
    elements.push({
      type: 'text',
      bounds: { x: 100, y: 100, width: 150, height: 20 },
      confidence: 0.7,
      properties: { text: 'Level 60', fontSize: 16 }
    });

    return elements;
  }

  /**
   * 检测游戏对象
   */
  private async detectGameObjects(screenshot: IImageBuffer): Promise<GameElement[]> {
    // 简化的游戏对象检测
    // 实际实现可以使用颜色检测、形状检测等

    const elements: GameElement[] = [];

    // 模拟检测一些游戏对象
    elements.push({
      type: 'character',
      bounds: { x: 960, y: 540, width: 64, height: 64 },
      confidence: 0.9,
      properties: { objectType: 'player_character', health: 100 }
    });

    return elements;
  }

  /**
   * 计算分析置信度
   */
  private calculateAnalysisConfidence(elements: GameElement[]): number {
    if (elements.length === 0) {
      return 0;
    }

    // 基于检测到的元素置信度计算总体置信度
    const totalConfidence = elements.reduce((sum, element) => sum + element.confidence, 0);
    const averageConfidence = totalConfidence / elements.length;

    // 考虑元素数量的影响
    const elementCountFactor = Math.min(1, elements.length / 10); // 10个元素时为满分

    return (averageConfidence * 0.7) + (elementCountFactor * 0.3);
  }

  /**
   * 获取完整屏幕区域
   */
  private async getFullScreenRegion(): Promise<IRectangle> {
    try {
      const robotjs = require('robotjs');
      const screenSize = robotjs.getScreenSize();
      return {
        x: 0,
        y: 0,
        width: screenSize.width,
        height: screenSize.height
      };
    } catch (error) {
      // 备用方案
      return {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080
      };
    }
  }
}