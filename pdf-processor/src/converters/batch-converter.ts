/**
 * 批量转换器
 * 支持批量处理多个文件和目录
 */

import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { PDFToImageConverter } from './pdf-to-image';
import { ImageToPDFConverter } from './image-to-pdf';
import {
  BatchConversionOptions,
  BatchProgress,
  ConversionTask,
  ConversionResult,
  ConversionStatus
} from '../types';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export class BatchConverter {
  private pdfToImageConverter: PDFToImageConverter;
  private imageToPDFConverter: ImageToPDFConverter;
  private tasks: Map<string, ConversionTask> = new Map();

  constructor() {
    this.pdfToImageConverter = new PDFToImageConverter();
    this.imageToPDFConverter = new ImageToPDFConverter();
  }

  /**
   * 批量转换文件
   * @param options 批量转换选项
   * @returns 转换结果
   */
  async convert(options: BatchConversionOptions): Promise<ConversionResult> {
    const startTime = Date.now();
    const taskId = this.generateTaskId();

    try {
      // 验证输入目录
      await this.validateInputDirectory(options.inputDir);

      // 确保输出目录存在
      await this.ensureOutputDirectory(options.outputDir);

      // 获取匹配的文件列表
      const inputFiles = await this.getInputFiles(options.inputDir, options.inputPattern);

      if (inputFiles.length === 0) {
        throw new Error('未找到匹配的输入文件');
      }

      console.log(`找到 ${inputFiles.length} 个文件进行批量转换`);

      // 创建批量转换任务
      const task: ConversionTask = {
        id: taskId,
        inputPath: options.inputDir,
        outputPath: options.outputDir,
        status: ConversionStatus.PROCESSING,
        options,
        startTime: new Date()
      };

      this.tasks.set(taskId, task);

      // 执行批量转换
      const results = await this.processBatch(inputFiles, options);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 统计成功和失败的转换
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      // 计算文件大小统计
      let totalInputSize = 0;
      let totalOutputSize = 0;
      let totalPages = 0;

      successfulResults.forEach(result => {
        if (result.metadata) {
          totalInputSize += result.metadata.fileSize.input;
          totalOutputSize += result.metadata.fileSize.output;
          totalPages += result.metadata.pageCount || 0;
        }
      });

      // 更新任务状态
      task.endTime = new Date();
      task.status = failedResults.length === 0 ? ConversionStatus.COMPLETED : ConversionStatus.FAILED;

      return {
        success: successfulResults.length > 0,
        outputPath: options.outputDir,
        outputFiles: successfulResults.flatMap(r => r.outputFiles),
        metadata: {
          inputFormat: this.detectInputFormat(inputFiles),
          outputFormat: this.detectOutputFormat(options.conversionOptions),
          processingTime,
          fileSize: {
            input: totalInputSize,
            output: totalOutputSize
          },
          pageCount: totalPages,
          options
        },
        error: failedResults.length > 0 ? {
          code: 'BATCH_PARTIAL_FAILURE',
          message: `${failedResults.length} 个文件转换失败`,
          details: failedResults.map(f => f.error).filter(Boolean)
        } : undefined
      };

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 更新任务状态为失败
      const task = this.tasks.get(taskId);
      if (task) {
        task.endTime = new Date();
        task.status = ConversionStatus.FAILED;
        task.error = {
          code: 'BATCH_ERROR',
          message: error instanceof Error ? error.message : '批量转换失败',
          details: error
        };
      }

      return {
        success: false,
        outputPath: options.outputDir,
        outputFiles: [],
        metadata: {
          inputFormat: 'unknown',
          outputFormat: 'unknown',
          processingTime,
          fileSize: { input: 0, output: 0 },
          options
        },
        error: {
          code: 'BATCH_ERROR',
          message: error instanceof Error ? error.message : '批量转换失败',
          details: error
        }
      };
    }
  }

  /**
   * 获取批量转换进度
   * @param taskId 任务ID
   * @returns 转换进度
   */
  getProgress(taskId: string): BatchProgress | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    // 这里应该根据实际的转换进度来计算
    // 简化实现，返回基本进度信息
    return {
      total: 100, // 应该从实际转换中获取
      completed: task.status === ConversionStatus.COMPLETED ? 100 : 0,
      failed: task.status === ConversionStatus.FAILED ? 100 : 0,
      current: task.inputPath,
      percentage: task.status === ConversionStatus.COMPLETED ? 100 :
                   task.status === ConversionStatus.FAILED ? 0 : 50
    };
  }

  /**
   * 获取所有任务
   * @returns 任务列表
   */
  getAllTasks(): ConversionTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 取消任务
   * @param taskId 任务ID
   * @returns 是否成功取消
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === ConversionStatus.PROCESSING) {
      task.status = ConversionStatus.CANCELLED;
      task.endTime = new Date();
      return true;
    }
    return false;
  }

  /**
   * 处理批量转换
   */
  private async processBatch(
    inputFiles: string[],
    options: BatchConversionOptions
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];
    const concurrency = options.concurrency || 1;

    console.log(`并发数: ${concurrency}`);

    // 分批处理文件
    for (let i = 0; i < inputFiles.length; i += concurrency) {
      const batch = inputFiles.slice(i, i + concurrency);

      const batchPromises = batch.map(async (inputFile) => {
        try {
          const relativePath = path.relative(options.inputDir, inputFile);
          const outputFile = this.generateOutputPath(inputFile, options);

          console.log(`处理文件 (${i + batch.indexOf(inputFile) + 1}/${inputFiles.length}): ${relativePath}`);

          const result = await this.processFile(inputFile, outputFile, options);

          // 报告进度
          if (options.progressCallback) {
            const progress: BatchProgress = {
              total: inputFiles.length,
              completed: results.filter(r => r.success).length + (result.success ? 1 : 0),
              failed: results.filter(r => !r.success).length + (result.success ? 0 : 1),
              current: relativePath,
              percentage: Math.round(((i + batch.indexOf(inputFile) + 1) / inputFiles.length) * 100)
            };
            options.progressCallback(progress);
          }

          return result;
        } catch (error) {
          console.error(`处理文件失败: ${inputFile}`, error);

          if (options.continueOnError) {
            return {
              success: false,
              outputPath: options.outputDir,
              outputFiles: [],
              metadata: {
                inputFormat: 'unknown',
                outputFormat: 'unknown',
                processingTime: 0,
                fileSize: { input: 0, output: 0 },
                options: options.conversionOptions
              },
              error: {
                code: 'FILE_PROCESSING_ERROR',
                message: error instanceof Error ? error.message : '文件处理失败',
                details: error
              }
            };
          } else {
            throw error;
          }
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 处理单个文件
   */
  private async processFile(
    inputFile: string,
    outputFile: string,
    options: BatchConversionOptions
  ): Promise<ConversionResult> {
    const ext = path.extname(inputFile).toLowerCase();

    if (ext === '.pdf') {
      // PDF转图像
      const pdfOptions = options.conversionOptions as any;
      const outputDir = path.dirname(outputFile);
      const prefix = path.basename(outputFile, path.extname(outputFile));

      return this.pdfToImageConverter.convert(inputFile, {
        ...pdfOptions,
        outputDir,
        prefix
      });
    } else if (this.isImageFile(ext)) {
      // 图像转PDF
      const imageOptions = options.conversionOptions as any;
      return this.imageToPDFConverter.convert([inputFile], outputFile, imageOptions);
    } else {
      throw new Error(`不支持的文件格式: ${ext}`);
    }
  }

  /**
   * 获取输入文件列表
   */
  private async getInputFiles(inputDir: string, pattern: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      glob(pattern, { cwd: inputDir }, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        const fullPaths = files.map(file => path.join(inputDir, file));
        resolve(fullPaths);
      });
    });
  }

  /**
   * 生成输出路径
   */
  private generateOutputPath(inputFile: string, options: BatchConversionOptions): string {
    const relativePath = path.relative(options.inputDir, inputFile);
    const outputFileName = this.changeExtension(relativePath, options.conversionOptions);
    return path.join(options.outputDir, outputFileName);
  }

  /**
   * 更改文件扩展名
   */
  private changeExtension(filePath: string, conversionOptions: any): string {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);

    if (ext === '.pdf' && conversionOptions.format) {
      return `${baseName}.${conversionOptions.format}`;
    } else if (this.isImageFile(ext)) {
      return `${baseName}.pdf`;
    }

    return filePath;
  }

  /**
   * 检查是否为图像文件
   */
  private isImageFile(ext: string): boolean {
    const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];
    return imageExts.includes(ext);
  }

  /**
   * 验证输入目录
   */
  private async validateInputDirectory(inputDir: string): Promise<void> {
    try {
      await access(inputDir, fs.constants.R_OK);
      const stats = await fs.promises.stat(inputDir);
      if (!stats.isDirectory()) {
        throw new Error('输入路径不是目录');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error('输入目录不存在');
      }
      throw error;
    }
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDirectory(outputDir: string): Promise<void> {
    try {
      await access(outputDir, fs.constants.W_OK);
    } catch (error) {
      await mkdir(outputDir, { recursive: true });
    }
  }

  /**
   * 检测输入格式
   */
  private detectInputFormat(inputFiles: string[]): string {
    const exts = inputFiles.map(file => path.extname(file).toLowerCase());
    const uniqueExts = [...new Set(exts)];

    if (uniqueExts.length === 1) {
      return uniqueExts[0].replace('.', '');
    }

    return 'mixed';
  }

  /**
   * 检测输出格式
   */
  private detectOutputFormat(conversionOptions: any): string {
    if (conversionOptions.format) {
      return conversionOptions.format;
    }
    return 'pdf';
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}