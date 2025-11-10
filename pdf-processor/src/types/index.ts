// 导出所有类型定义
export * from './ai';
export * from './pdf';
export * from './conversion';

// 通用工具类型
export interface Config {
  tempDir: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  ai: {
    defaultProvider: string;
    providers: Record<string, any>;
  };
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}

export interface ProcessorOptions {
  config?: Partial<Config>;
  logger?: Logger;
}
