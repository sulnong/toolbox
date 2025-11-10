import { config } from 'dotenv';

// 加载环境变量
config();

export * from './types';
export * from './converters';
export * from './parsers';
export * from './transformers';
export * from './utils';

/**
 * PDF处理器主类
 */
export class PDFProcessor {
  /**
   * 创建PDF处理器实例
   */
  static create() {
    return new PDFProcessor();
  }

  /**
   * 获取版本信息
   */
  getVersion(): string {
    return '1.0.0';
  }

  /**
   * 获取支持的功能列表
   */
  getSupportedFeatures(): string[] {
    return [
      'pdf-to-image',
      'image-to-pdf',
      'traditional-parsing',
      'ai-ocr',
      'structured-data-extraction',
      'pdf-modification',
      'pdf-generation',
      'batch-processing',
    ];
  }
}

// 默认导出
export default PDFProcessor;