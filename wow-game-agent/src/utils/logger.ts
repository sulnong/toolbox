/**
 * 日志工具模块
 * 提供统一的日志记录功能，支持多种输出格式和级别
 */

import winston from 'winston';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

// 日志级别
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// 日志接口
export interface ILogger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/**
 * 自定义格式化器
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${chalk.gray(`[${timestamp}]`)} ${getLevelColor(level)} ${message}`;

    // 添加堆栈信息
    if (stack) {
      logMessage += `\n${chalk.gray(stack)}`;
    }

    // 添加元数据
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${chalk.gray(JSON.stringify(meta, null, 2))}`;
    }

    return logMessage;
  })
);

/**
 * 文件格式化器
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * 获取级别颜色
 */
function getLevelColor(level: string): string {
  switch (level) {
    case 'error':
      return chalk.red('[ERROR]');
    case 'warn':
      return chalk.yellow('[WARN]');
    case 'info':
      return chalk.blue('[INFO]');
    case 'debug':
      return chalk.gray('[DEBUG]');
    default:
      return chalk.white(`[${level.toUpperCase()}]`);
  }
}

/**
 * 创建日志目录
 */
function ensureLogDirectory(logPath: string): void {
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * 初始化 Winston 日志器
 */
function createWinstonLogger(): winston.Logger {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const logFile = process.env.LOG_FILE_PATH || './logs/wow-agent.log';
  const enableConsole = process.env.NODE_ENV !== 'production';

  // 确保日志目录存在
  ensureLogDirectory(logFile);

  const transports: winston.transport[] = [];

  // 控制台输出
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: customFormat
      })
    );
  }

  // 文件输出
  transports.push(
    // 所有日志
    new winston.transports.File({
      filename: logFile,
      level: logLevel,
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    // 错误日志单独文件
    new winston.transports.File({
      filename: logFile.replace('.log', '-error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3
    })
  );

  return winston.createLogger({
    level: logLevel,
    transports,
    // 处理未捕获的异常
    exceptionHandlers: [
      new winston.transports.File({
        filename: logFile.replace('.log', '-exceptions.log'),
        format: fileFormat
      })
    ],
    // 处理未处理的 Promise 拒绝
    rejectionHandlers: [
      new winston.transports.File({
        filename: logFile.replace('.log', '-rejections.log'),
        format: fileFormat
      })
    ]
  });
}

/**
 * 日志器实例
 */
const winstonLogger = createWinstonLogger();

/**
 * 日志类实现
 */
export class Logger implements ILogger {
  private readonly context: string;

  constructor(context: string = 'WoWAgent') {
    this.context = context;
  }

  error(message: string, ...args: unknown[]): void {
    winstonLogger.error(message, { context: this.context, args });
  }

  warn(message: string, ...args: unknown[]): void {
    winstonLogger.warn(message, { context: this.context, args });
  }

  info(message: string, ...args: unknown[]): void {
    winstonLogger.info(message, { context: this.context, args });
  }

  debug(message: string, ...args: unknown[]): void {
    winstonLogger.debug(message, { context: this.context, args });
  }

  /**
   * 创建子日志器
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    winstonLogger.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): string {
    return winstonLogger.level;
  }

  /**
   * 添加日志传输
   */
  addTransport(transport: winston.transport): void {
    winstonLogger.add(transport);
  }

  /**
   * 移除日志传输
   */
  removeTransport(transport: winston.transport): void {
    winstonLogger.remove(transport);
  }

  /**
   * 清空所有传输
   */
  clearTransports(): void {
    winstonLogger.clear();
  }

  /**
   * 获取日志统计
   */
  getStats(): {
    error: number;
    warn: number;
    info: number;
    debug: number;
  } {
    // 注意：winston 不直接提供统计，这里是一个简化的实现
    return {
      error: 0,
      warn: 0,
      info: 0,
      debug: 0
    };
  }
}

/**
 * 默认日志器实例
 */
export const logger = new Logger();

/**
 * 创建日志器工厂函数
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * 性能日志装饰器
 */
export function logExecutionTime(target: any, propertyName: string, descriptor: PropertyDescriptor): void {
  const method = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    const startTime = Date.now();
    const className = target.constructor.name;
    const contextLogger = logger.child(`${className}.${propertyName}`);

    contextLogger.debug(`开始执行，参数:`, args);

    try {
      const result = await method.apply(this, args);
      const duration = Date.now() - startTime;
      contextLogger.debug(`执行完成，耗时: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      contextLogger.error(`执行失败，耗时: ${duration}ms，错误:`, error);
      throw error;
    }
  };
}

/**
 * 日志中间件
 */
export function logMiddleware(req: any, res: any, next: any): void {
  const start = Date.now();
  const requestLogger = logger.child('HTTP');

  requestLogger.info(`${req.method} ${req.url}`, {
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    requestLogger.info(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}

/**
 * 安全日志记录器 (记录敏感操作)
 */
export class SecurityLogger {
  private static instance: SecurityLogger;
  private logger: Logger;

  private constructor() {
    this.logger = logger.child('SECURITY');
  }

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  logAccess(operation: string, user?: string, details?: Record<string, unknown>): void {
    this.logger.info(`访问操作: ${operation}`, {
      user,
      details,
      timestamp: new Date().toISOString()
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', details?: Record<string, unknown>): void {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    this.logger[level](`安全事件: ${event}`, {
      severity,
      details,
      timestamp: new Date().toISOString()
    });
  }

  logSuspiciousActivity(activity: string, details: Record<string, unknown>): void {
    this.logger.warn(`可疑活动: ${activity}`, {
      details,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 审计日志记录器
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private logger: Logger;

  private constructor() {
    this.logger = logger.child('AUDIT');
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  logAction(action: string, actor: string, target?: string, result?: 'success' | 'failure'): void {
    this.logger.info(`审计: ${action}`, {
      actor,
      target,
      result,
      timestamp: new Date().toISOString()
    });
  }

  logConfigChange(config: string, oldValue: unknown, newValue: unknown, actor: string): void {
    this.logger.info(`配置变更: ${config}`, {
      oldValue,
      newValue,
      actor,
      timestamp: new Date().toISOString()
    });
  }
}

export default logger;