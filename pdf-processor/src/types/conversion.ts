/**
 * 通用转换结果
 */
export interface ConversionResult {
  success: boolean;
  outputPath: string;
  outputFiles: string[];
  metadata: ConversionMetadata;
  error?: ConversionError;
}

/**
 * 转换元数据
 */
export interface ConversionMetadata {
  inputFormat: string;
  outputFormat: string;
  processingTime: number;
  fileSize: {
    input: number;
    output: number;
  };
  pageCount?: number;
  options?: any;
}

/**
 * 转换错误
 */
export interface ConversionError {
  code: string;
  message: string;
  details?: any;
}

/**
 * PDF转图像选项
 */
export interface PDFToImageOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0-100
  dpi?: number; // 默认300
  width?: number;
  height?: number;
  pages?: number[]; // 指定页码
  singleFile?: boolean; // 是否合并到单个文件
  outputDir?: string;
  prefix?: string; // 输出文件名前缀
}

/**
 * 图像转PDF选项
 */
export interface ImageToPDFOptions {
  pageSize?: 'a4' | 'letter' | 'legal' | 'auto';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  quality?: number; // 0-100
  compression?: 'none' | 'low' | 'medium' | 'high';
  title?: string;
  author?: string;
  creator?: string;
  subject?: string;
  keywords?: string;
}

/**
 * 批量转换选项
 */
export interface BatchConversionOptions {
  inputDir: string;
  outputDir: string;
  inputPattern: string; // glob pattern
  conversionOptions: PDFToImageOptions | ImageToPDFOptions;
  concurrency?: number; // 并发处理数量
  continueOnError?: boolean; // 遇到错误是否继续
  progressCallback?: (progress: BatchProgress) => void;
}

/**
 * 批量转换进度
 */
export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
  percentage: number;
  estimatedTime?: number; // 剩余时间（秒）
}

/**
 * 支持的图像格式
 */
export type SupportedImageFormat = 'png' | 'jpeg' | 'jpg' | 'webp' | 'tiff' | 'bmp';

/**
 * 支持的PDF格式
 */
export type SupportedPDFFormat = 'pdf' | 'pdfa' | 'pdfx';

/**
 * 转换状态
 */
export enum ConversionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 转换任务
 */
export interface ConversionTask {
  id: string;
  inputPath: string;
  outputPath: string;
  status: ConversionStatus;
  options: any;
  startTime?: Date;
  endTime?: Date;
  progress?: number;
  error?: ConversionError;
}
