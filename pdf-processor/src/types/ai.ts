/**
 * AI服务提供商接口
 */
export interface AIProvider {
  name: string;
  performOCR(imageData: Buffer, options?: OCROptions): Promise<OCRResult>;
  isAvailable(): Promise<boolean>;
  getCostEstimate(options: OCROptions): number;
  getCapabilities(): AICapabilities;
}

/**
 * OCR选项配置
 */
export interface OCROptions {
  languages?: string[];
  outputFormat?: 'text' | 'structured' | 'json';
  confidence?: boolean;
  detectHandwriting?: boolean;
  enableTableDetection?: boolean;
  enableFormDetection?: boolean;
}

/**
 * AI服务能力描述
 */
export interface AICapabilities {
  supportedLanguages: string[];
  maxImageSize: number; // 最大图像尺寸（字节）
  supportedFormats: string[];
  features: {
    handwriting: boolean;
    tableDetection: boolean;
    formDetection: boolean;
    multiLanguage: boolean;
    confidenceScores: boolean;
  };
  pricing: {
    costPerPage: number;
    currency: string;
  };
}

/**
 * OCR识别结果
 */
export interface OCRResult {
  text: string;
  confidence: number;
  blocks?: TextBlock[];
  metadata?: OCRMetadata;
  error?: OCR;
}

/**
 * 文本块信息
 */
export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  type: 'text' | 'table' | 'form' | 'image';
  subBlocks?: TextBlock[];
}

/**
 * 边界框坐标
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * OCR元数据
 */
export interface OCRMetadata {
  provider: string;
  processingTime: number;
  detectedLanguages: string[];
  pageCount: number;
  cost: number;
  currency: string;
  timestamp: Date;
}

/**
 * OCR错误信息
 */
export interface OCR {
  code: string;
  message: string;
  provider?: string;
  retryable: boolean;
}

/**
 * AI服务配置
 */
export interface AIServiceConfig {
  provider: string;
  apiKey: string;
  baseURL?: string;
  maxRetries: number;
  timeout: number;
  fallbackProviders?: string[];
}

/**
 * AI服务管理器接口
 */
export interface AIServiceManager {
  registerProvider(provider: AIProvider): void;
  getProvider(name?: string): AIProvider | null;
  setDefaultProvider(name: string): void;
  getAllProviders(): AIProvider[];
  performOCR(imageData: Buffer, options?: OCROptions): Promise<OCRResult>;
}