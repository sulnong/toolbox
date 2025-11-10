/**
 * 图像转PDF转换器
 * 使用pdf-lib库实现图像到PDF的转换
 */

import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as sharp from 'sharp';
import { ImageToPDFOptions, ConversionResult, ConversionMetadata, ConversionError } from '../types';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const access = promisify(fs.access);

export class ImageToPDFConverter {
  private defaultOptions: Partial<ImageToPDFOptions> = {
    pageSize: 'a4',
    orientation: 'portrait',
    margin: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    quality: 90,
    compression: 'medium'
  };

  /**
   * 将图像转换为PDF
   * @param inputPaths 图像文件路径数组
   * @param outputPath 输出PDF文件路径
   * @param options 转换选项
   * @returns 转换结果
   */
  async convert(
    inputPaths: string[],
    outputPath: string,
    options?: Partial<ImageToPDFOptions>
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options } as ImageToPDFOptions;

    try {
      // 验证输入文件
      await this.validateInputFiles(inputPaths);

      // 确保输出目录存在
      await this.ensureOutputDirectory(path.dirname(outputPath));

      // 计算输入文件总大小
      let totalInputSize = 0;
      for (const inputPath of inputPaths) {
        const stats = await stat(inputPath);
        totalInputSize += stats.size;
      }

      // 创建PDF文档
      const pdfDoc = await PDFDocument.create();

      // 设置元数据
      if (mergedOptions.title) pdfDoc.setTitle(mergedOptions.title);
      if (mergedOptions.author) pdfDoc.setAuthor(mergedOptions.author);
      if (mergedOptions.creator) pdfDoc.setCreator(mergedOptions.creator);
      if (mergedOptions.subject) pdfDoc.setSubject(mergedOptions.subject);
      if (mergedOptions.keywords) pdfDoc.setKeywords(mergedOptions.keywords.split(',').map(k => k.trim()));

      // 获取页面尺寸
      const { width: pageWidth, height: pageHeight } = this.getPageSize(mergedOptions);
      const { width: effectiveWidth, height: effectiveHeight } = this.getEffectivePageSize(
        pageWidth,
        pageHeight,
        mergedOptions.margin!
      );

      // 处理每个图像
      for (let i = 0; i < inputPaths.length; i++) {
        const inputPath = inputPaths[i];
        console.log(`处理图像 ${i + 1}/${inputPaths.length}: ${path.basename(inputPath)}`);

        try {
          // 读取并处理图像
          const imageBuffer = await this.processImage(inputPath, effectiveWidth, effectiveHeight);

          // 嵌入图像
          let image;
          if (inputPath.toLowerCase().endsWith('.png')) {
            image = await pdfDoc.embedPng(imageBuffer);
          } else if (inputPath.toLowerCase().match(/\.(jpg|jpeg)$/)) {
            image = await pdfDoc.embedJpg(imageBuffer);
          } else {
            // 尝试将其他格式转换为JPEG
            const jpegBuffer = await sharp(inputPath)
              .jpeg({ quality: mergedOptions.quality })
              .toBuffer();
            image = await pdfDoc.embedJpg(jpegBuffer);
          }

          // 添加页面
          const page = pdfDoc.addPage([pageWidth, pageHeight]);

          // 计算图像位置和尺寸（居中）
          const { x, y, width, height } = this.calculateImagePosition(
            image.width,
            image.height,
            effectiveWidth,
            effectiveHeight,
            mergedOptions.margin!
          );

          // 绘制图像
          page.drawImage(image, {
            x,
            y,
            width,
            height
          });

        } catch (error) {
          console.warn(`处理图像失败: ${inputPath}`, error);
          throw new Error(`图像处理失败: ${inputPath} - ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      // 设置压缩级别
      if (mergedOptions.compression !== 'none') {
        // pdf-lib 默认使用压缩，这里我们可以根据需要调整
        pdfDoc.setCreator('PDF-Processor');
      }

      // 保存PDF
      const pdfBytes = await pdfDoc.save();
      await writeFile(outputPath, pdfBytes);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 获取输出文件大小
      const outputStats = await stat(outputPath);

      const metadata: ConversionMetadata = {
        inputFormat: 'image',
        outputFormat: 'pdf',
        processingTime,
        fileSize: {
          input: totalInputSize,
          output: outputStats.size
        },
        pageCount: inputPaths.length,
        options: mergedOptions
      };

      return {
        success: true,
        outputPath: path.dirname(outputPath),
        outputFiles: [outputPath],
        metadata
      };

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      const conversionError: ConversionError = {
        code: 'IMAGE_TO_PDF_CONVERSION_ERROR',
        message: error instanceof Error ? error.message : '图像转PDF转换失败',
        details: error
      };

      const metadata: ConversionMetadata = {
        inputFormat: 'image',
        outputFormat: 'pdf',
        processingTime,
        fileSize: {
          input: 0,
          output: 0
        },
        pageCount: 0,
        options: mergedOptions
      };

      return {
        success: false,
        outputPath: path.dirname(outputPath),
        outputFiles: [],
        metadata,
        error: conversionError
      };
    }
  }

  /**
   * 从图像目录创建PDF
   * @param imageDir 图像目录路径
   * @param outputPath 输出PDF文件路径
   * @param pattern 文件匹配模式
   * @param options 转换选项
   * @returns 转换结果
   */
  async convertFromDirectory(
    imageDir: string,
    outputPath: string,
    pattern: string = '*.{png,jpg,jpeg,webp,bmp,tiff}',
    options?: Partial<ImageToPDFOptions>
  ): Promise<ConversionResult> {
    const glob = require('glob');

    return new Promise((resolve, reject) => {
      glob(pattern, { cwd: imageDir }, async (err: any, files: string[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (files.length === 0) {
          resolve({
            success: false,
            outputPath: path.dirname(outputPath),
            outputFiles: [],
            metadata: {
              inputFormat: 'image',
              outputFormat: 'pdf',
              processingTime: 0,
              fileSize: { input: 0, output: 0 },
              pageCount: 0,
              options: { ...this.defaultOptions, ...options }
            },
            error: {
              code: 'NO_IMAGES_FOUND',
              message: '在指定目录中未找到图像文件'
            }
          });
          return;
        }

        // 排序文件以确保一致的顺序
        files.sort();

        const inputPaths = files.map(file => path.join(imageDir, file));
        const result = await this.convert(inputPaths, outputPath, options);
        resolve(result);
      });
    });
  }

  /**
   * 验证输入文件
   */
  private async validateInputFiles(inputPaths: string[]): Promise<void> {
    if (!inputPaths || inputPaths.length === 0) {
      throw new Error('没有提供输入文件');
    }

    for (const inputPath of inputPaths) {
      try {
        await access(inputPath, fs.constants.R_OK);
        const stats = await stat(inputPath);
        if (!stats.isFile()) {
          throw new Error(`路径不是文件: ${inputPath}`);
        }

        // 检查是否为支持的图像格式
        const ext = path.extname(inputPath).toLowerCase();
        const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];
        if (!supportedFormats.includes(ext)) {
          throw new Error(`不支持的图像格式: ${ext}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('ENOENT')) {
          throw new Error(`输入文件不存在: ${inputPath}`);
        }
        throw error;
      }
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
   * 获取页面尺寸
   */
  private getPageSize(options: ImageToPDFOptions): { width: number; height: number } {
    const sizes = {
      a4: { width: 595.28, height: 841.89 }, // A4 in points
      letter: { width: 612, height: 792 },   // Letter in points
      legal: { width: 612, height: 1008 }    // Legal in points
    };

    const size = sizes[options.pageSize || 'a4'];

    if (options.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }

    return size;
  }

  /**
   * 获取有效页面尺寸（减去边距）
   */
  private getEffectivePageSize(
    pageWidth: number,
    pageHeight: number,
    margin: { top?: number; right?: number; bottom?: number; left?: number }
  ): { width: number; height: number } {
    return {
      width: pageWidth - (margin.left! + margin.right!),
      height: pageHeight - (margin.top! + margin.bottom!)
    };
  }

  /**
   * 计算图像位置和尺寸
   */
  private calculateImagePosition(
    imageWidth: number,
    imageHeight: number,
    availableWidth: number,
    availableHeight: number,
    margin: { top?: number; right?: number; bottom?: number; left?: number }
  ): { x: number; y: number; width: number; height: number } {
    // 计算缩放比例以适应可用空间
    const scaleX = availableWidth / imageWidth;
    const scaleY = availableHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY, 1); // 不放大图像

    const finalWidth = imageWidth * scale;
    const finalHeight = imageHeight * scale;

    // 居中定位
    const x = margin.left! + (availableWidth - finalWidth) / 2;
    const y = margin.top! + (availableHeight - finalHeight) / 2;

    return { x, y, width: finalWidth, height: finalHeight };
  }

  /**
   * 处理图像（调整大小和质量）
   */
  private async processImage(
    inputPath: string,
    maxWidth: number,
    maxHeight: number
  ): Promise<Buffer> {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // 如果图像太大，调整大小
    if (metadata.width! > maxWidth || metadata.height! > maxHeight) {
      return image
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
    }

    return image.toBuffer();
  }
}