/**
 * PDF转图像转换器
 * 使用pdf2pic库实现PDF到图像的转换
 */

import { fromPath } from 'pdf2pic';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PDFToImageOptions, ConversionResult, ConversionMetadata, ConversionError } from '../types';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const access = promisify(fs.access);

export class PDFToImageConverter {
  private defaultOptions: Partial<PDFToImageOptions> = {
    format: 'png',
    quality: 90,
    dpi: 300,
    width: 1000,
    height: 1414, // A4比例
    singleFile: false,
    outputDir: './output',
    prefix: 'page'
  };

  /**
   * 将PDF转换为图像
   * @param inputPath PDF文件路径
   * @param options 转换选项
   * @returns 转换结果
   */
  async convert(inputPath: string, options?: Partial<PDFToImageOptions>): Promise<ConversionResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options } as PDFToImageOptions;

    try {
      // 验证输入文件
      await this.validateInputFile(inputPath);

      // 确保输出目录存在
      await this.ensureOutputDirectory(mergedOptions.outputDir!);

      // 获取文件信息
      const fileStats = await stat(inputPath);
      const inputFileSize = fileStats.size;

      // 配置pdf2pic
      const convert = fromPath(inputPath, {
        density: mergedOptions.dpi,
        saveFilename: mergedOptions.prefix,
        savePath: mergedOptions.outputDir,
        format: mergedOptions.format,
        width: mergedOptions.width,
        height: mergedOptions.height,
        quality: mergedOptions.quality
      });

      // 执行转换
      const result = await this.performConversion(convert, mergedOptions);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 获取输出文件大小
      const outputFiles = result.map(item => item.path);
      let totalOutputSize = 0;
      for (const filePath of outputFiles) {
        try {
          const stats = await stat(filePath);
          totalOutputSize += stats.size;
        } catch (error) {
          console.warn(`无法获取输出文件大小: ${filePath}`, error);
        }
      }

      const metadata: ConversionMetadata = {
        inputFormat: 'pdf',
        outputFormat: mergedOptions.format,
        processingTime,
        fileSize: {
          input: inputFileSize,
          output: totalOutputSize
        },
        pageCount: result.length,
        options: mergedOptions
      };

      return {
        success: true,
        outputPath: mergedOptions.outputDir!,
        outputFiles,
        metadata
      };

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      const conversionError: ConversionError = {
        code: 'CONVERSION_ERROR',
        message: error instanceof Error ? error.message : '未知转换错误',
        details: error
      };

      const metadata: ConversionMetadata = {
        inputFormat: 'pdf',
        outputFormat: mergedOptions.format,
        processingTime,
        fileSize: {
          input: 0,
          output: 0
        },
        options: mergedOptions
      };

      return {
        success: false,
        outputPath: mergedOptions.outputDir || '',
        outputFiles: [],
        metadata,
        error: conversionError
      };
    }
  }

  /**
   * 转换PDF的指定页面
   * @param inputPath PDF文件路径
   * @param outputPath 输出文件路径（不包含扩展名）
   * @param pageNumber 页码
   * @param options 转换选项
   * @returns 转换结果
   */
  async convertSinglePage(
    inputPath: string,
    outputPath: string,
    pageNumber: number,
    options?: Partial<PDFToImageOptions>
  ): Promise<ConversionResult> {
    const mergedOptions = { ...this.defaultOptions, ...options } as PDFToImageOptions;

    try {
      await this.validateInputFile(inputPath);
      await this.ensureOutputDirectory(path.dirname(outputPath));

      const convert = fromPath(inputPath, {
        density: mergedOptions.dpi,
        saveFilename: path.basename(outputPath),
        savePath: path.dirname(outputPath),
        format: mergedOptions.format,
        width: mergedOptions.width,
        height: mergedOptions.height,
        quality: mergedOptions.quality
      });

      const result = await convert(pageNumber, { responseType: 'imagebuffer' });

      const outputFilePath = `${outputPath}.${mergedOptions.format}`;
      await writeFile(outputFilePath, result.buffer);

      const fileStats = await stat(outputFilePath);

      const metadata: ConversionMetadata = {
        inputFormat: 'pdf',
        outputFormat: mergedOptions.format,
        processingTime: 0, // 单页转换时间较短
        fileSize: {
          input: (await stat(inputPath)).size,
          output: fileStats.size
        },
        pageCount: 1,
        options: mergedOptions
      };

      return {
        success: true,
        outputPath,
        outputFiles: [outputFilePath],
        metadata
      };

    } catch (error) {
      const conversionError: ConversionError = {
        code: 'SINGLE_PAGE_CONVERSION_ERROR',
        message: error instanceof Error ? error.message : '单页转换失败',
        details: error
      };

      return {
        success: false,
        outputPath,
        outputFiles: [],
        metadata: {
          inputFormat: 'pdf',
          outputFormat: mergedOptions.format,
          processingTime: 0,
          fileSize: { input: 0, output: 0 },
          options: mergedOptions
        },
        error: conversionError
      };
    }
  }

  /**
   * 验证输入文件
   */
  private async validateInputFile(inputPath: string): Promise<void> {
    try {
      await access(inputPath, fs.constants.R_OK);
      const stats = await stat(inputPath);
      if (!stats.isFile()) {
        throw new Error('输入路径不是文件');
      }
      if (path.extname(inputPath).toLowerCase() !== '.pdf') {
        throw new Error('输入文件不是PDF格式');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error('输入文件不存在');
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
   * 执行转换
   */
  private async performConversion(
    convert: any,
    options: PDFToImageOptions
  ): Promise<Array<{ page: number; path: string; name: string }>> {
    const results: Array<{ page: number; path: string; name: string }> = [];

    try {
      if (options.pages && options.pages.length > 0) {
        // 转换指定页面
        for (const pageNum of options.pages) {
          const result = await convert(pageNum);
          results.push({
            page: pageNum,
            path: result.path,
            name: result.name
          });
        }
      } else {
        // 转换所有页面
        const allPagesResult = await convert.bulk();
        if (Array.isArray(allPagesResult)) {
          for (let i = 0; i < allPagesResult.length; i++) {
            const pageResult = allPagesResult[i];
            results.push({
              page: i + 1,
              path: pageResult.path,
              name: pageResult.name
            });
          }
        }
      }
    } catch (error) {
      throw new Error(`PDF转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return results;
  }
}