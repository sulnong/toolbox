/**
 * AI OCR解析器
 * 使用OpenAI Vision API实现智能OCR功能
 */

import { PDFToImageConverter } from '../converters/pdf-to-image';
import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {
  PDFDocument,
  PDFPage,
  PDFMetadata,
  FileInfo,
  PDFContent
} from '../types/pdf';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export interface AIROptions {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  language?: string;
  extractStructure?: boolean;
  customPrompt?: string;
  includeConfidence?: boolean;
}

export interface AIResult {
  success: boolean;
  document?: PDFDocument;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processingTime: number;
  apiUsage?: {
    tokensUsed: number;
    cost: number;
  };
}

interface VisionAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIOCRParser {
  private pdfToImageConverter: PDFToImageConverter;
  private defaultOptions: AIROptions = {
    model: process.env.MODEL_NAME || 'qwen-vl-ocr',
    endpoint: process.env.API_ENDPOINT || 'https://aiproxy.hzh.sealos.run',
    apiKey: process.env.API_KEY || process.env.OPENAI_API_KEY,
    maxTokens: 4096,
    temperature: 0.1,
    language: 'zh-CN',
    extractStructure: true,
    includeConfidence: false
  };

  constructor() {
    this.pdfToImageConverter = new PDFToImageConverter();
  }

  /**
   * 使用AI OCR解析PDF
   * @param inputPath PDF文件路径
   * @param options AI解析选项
   * @returns 解析结果
   */
  async parse(inputPath: string, options: AIROptions = {}): Promise<AIResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      // 验证输入文件
      await this.validateInputFile(inputPath);

      // 获取API配置
      const apiKey = mergedOptions.apiKey;
      const endpoint = mergedOptions.endpoint;
      const model = mergedOptions.model;

      if (!apiKey) {
        throw new Error('未提供API密钥，请检查.env文件中的API_KEY配置');
      }

      if (!endpoint) {
        throw new Error('未提供API端点，请检查.env文件中的API_ENDPOINT配置');
      }

      // 获取文件信息
      const fileBuffer = await readFile(inputPath);
      const fileInfo = await this.extractFileInfo(inputPath, fileBuffer);

      // 转换PDF为图像
      console.log('正在将PDF转换为图像...');
      const imageResult = await this.pdfToImageConverter.convert(inputPath, {
        format: 'png',
        dpi: 300,
        quality: 90,
        singleFile: false
      });

      if (!imageResult.success || imageResult.outputFiles.length === 0) {
        throw new Error('PDF转图像失败');
      }

      console.log(`转换完成，共 ${imageResult.outputFiles.length} 页图像`);

      // 使用Vision API处理图像
      const pages: PDFPage[] = [];
      let totalTokensUsed = 0;
      let totalCost = 0;

      for (let i = 0; i < imageResult.outputFiles.length; i++) {
        const imagePath = imageResult.outputFiles[i];
        console.log(`正在处理第 ${i + 1} 页...`);

        const pageResult = await this.processImageWithVision(
          imagePath,
          mergedOptions,
          endpoint,
          i + 1
        );

        if (pageResult.success) {
          pages.push(pageResult.page!);
          totalTokensUsed += pageResult.tokensUsed || 0;
          totalCost += pageResult.cost || 0;
        } else {
          console.warn(`第 ${i + 1} 页处理失败:`, pageResult.error?.message);
          // 添加空页面以保持页码连续性
          pages.push({
            pageNumber: i + 1,
            size: { width: 595, height: 842 },
            rotation: 0,
            text: undefined,
            content: undefined
          });
        }
      }

      // 创建PDF文档
      const document: PDFDocument = {
        pages,
        metadata: this.createBasicMetadata(fileInfo),
        fileInfo
      };

      const endTime = Date.now();

      return {
        success: true,
        document,
        processingTime: endTime - startTime,
        apiUsage: {
          tokensUsed: totalTokensUsed,
          cost: totalCost
        }
      };

    } catch (error) {
      const endTime = Date.now();

      return {
        success: false,
        error: {
          code: 'AI_OCR_ERROR',
          message: error instanceof Error ? error.message : 'AI OCR解析失败',
          details: error
        },
        processingTime: endTime - startTime
      };
    } finally {
      // 清理临时图像文件
      await this.cleanupTempFiles(inputPath);
    }
  }

  /**
   * 使用AI提取结构化数据
   * @param inputPath PDF文件路径
   * @param schema 数据结构模式
   * @param options AI解析选项
   * @returns 结构化数据
   */
  async extractStructuredData<T = any>(
    inputPath: string,
    schema?: DataSchema<T>,
    options: AIROptions = {}
  ): Promise<T> {
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      extractStructure: true
    };

    const result = await this.parse(inputPath, mergedOptions);

    if (!result.success || !result.document) {
      throw new Error(result.error?.message || 'AI OCR解析失败');
    }

    // 合并所有页面的文本
    const allText = result.document.pages
      .filter(page => page.text)
      .map(page => page.text!)
      .join('\n\n');

    if (schema) {
      return this.applySchema(allText, schema);
    }

    // 如果没有提供schema，尝试从test-data.json的结构推断
    return this.inferStructure(allText) as T;
  }

  /**
   * 使用Vision API处理单个图像
   */
  private async processImageWithVision(
    imagePath: string,
    options: AIROptions,
    endpoint: string,
    pageNumber: number
  ): Promise<{
    success: boolean;
    page?: PDFPage;
    error?: any;
    tokensUsed?: number;
    cost?: number;
  }> {
    try {
      // 读取图像文件
      const imageBuffer = await readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // 构建提示词
      const prompt = this.buildPrompt(options);

      // 调用Vision API
      const response = await this.callVisionAPI({
        model: options.model || 'qwen-vl-ocr',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.1
      }, options.apiKey!, endpoint);

      // 解析响应
      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokensUsed, options.model || 'qwen-vl-ocr');

      // 提取结构化内容
      const extractedContent = this.extractContentFromResponse(content, options);

      return {
        success: true,
        page: {
          pageNumber,
          size: { width: 595, height: 842 }, // 默认A4尺寸
          rotation: 0,
          text: extractedContent.text,
          content: extractedContent.structuredContent
        },
        tokensUsed,
        cost
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VISION_API_ERROR',
          message: error instanceof Error ? error.message : 'Vision API调用失败',
          details: error
        }
      };
    }
  }

  /**
   * 调用Vision API
   */
  private async callVisionAPI(
    request: any,
    apiKey: string,
    endpoint: string
  ): Promise<VisionAPIResponse> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${endpoint}/v1/chat/completions`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: request,
      timeout: 120000 // 2分钟超时
    };

    const response = await axios(config);
    return response.data;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(options: AIROptions): string {
    if (options.customPrompt) {
      return options.customPrompt;
    }

    const basePrompt = `请分析这个PDF页面图像并提取其中的所有文本内容。

要求：
1. 准确识别所有可见文本
2. 保持原有的布局和格式
3. 如果有表格，请保持表格结构
4. 语言：${options.language || '中文'}
5. 输出格式：纯文本`;

    if (options.extractStructure) {
      return `${basePrompt}

额外要求：
- 如果是结构化数据（如表格、表单），请尝试识别其结构
- 提取关键数据点并标注其类型
- 识别任何数字、日期、金额等结构化信息`;
    }

    return basePrompt;
  }

  /**
   * 从响应中提取内容
   */
  private extractContentFromResponse(content: string, options: AIROptions): {
    text: string;
    structuredContent?: PDFContent[];
  } {
    const text = content.trim();

    if (!options.extractStructure) {
      return { text };
    }

    // 尝试提取结构化内容
    const structuredContent: PDFContent[] = [
      {
        type: 'text',
        position: { x: 0, y: 0, width: 595, height: 842 },
        content: text
      }
    ];

    return {
      text,
      structuredContent
    };
  }

  /**
   * 计算API成本
   */
  private calculateCost(tokens: number, model: string): number {
    // 简化的成本计算（实际价格可能变化）
    const rates = {
      'gpt-4-vision-preview': 0.01, // 每1K tokens的价格
      'gpt-4o': 0.005
    };

    const rate = rates[model as keyof typeof rates] || 0.01;
    return (tokens / 1000) * rate;
  }

  /**
   * 验证输入文件
   */
  private async validateInputFile(inputPath: string): Promise<void> {
    try {
      await access(inputPath, fs.constants.R_OK);
      const stats = await fs.promises.stat(inputPath);
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
   * 提取文件信息
   */
  private async extractFileInfo(inputPath: string, fileBuffer: Buffer): Promise<FileInfo> {
    const stats = await fs.promises.stat(inputPath);

    return {
      name: path.basename(inputPath),
      path: path.resolve(inputPath),
      size: stats.size,
      format: 'pdf',
      encoding: 'binary'
    };
  }

  /**
   * 创建基本元数据
   */
  private createBasicMetadata(fileInfo: FileInfo): PDFMetadata {
    return {
      version: '1.4',
      isEncrypted: false,
      hasPassword: false,
      creator: 'AI OCR Parser',
      producer: 'OpenAI Vision API'
    };
  }

  /**
   * 清理临时文件
   */
  private async cleanupTempFiles(inputPath: string): Promise<void> {
    try {
      const outputDir = path.join(path.dirname(inputPath), 'output');
      const imagesDir = path.join(outputDir, 'images');

      // 删除临时图像文件
      if (fs.existsSync(imagesDir)) {
        const files = await fs.promises.readdir(imagesDir);
        for (const file of files) {
          if (file.endsWith('.png')) {
            await fs.promises.unlink(path.join(imagesDir, file));
          }
        }
      }
    } catch (error) {
      console.warn('清理临时文件失败:', error);
    }
  }

  /**
   * 应用数据模式
   */
  private applySchema<T>(text: string, schema: DataSchema<T>): T {
    // 与TraditionalPDFParser中相同的实现
    const result: any = {};

    Object.entries(schema.fields).forEach(([key, field]) => {
      if (field.pattern) {
        const regex = new RegExp(field.pattern, field.flags);
        const match = text.match(regex);
        if (match) {
          result[key] = match[field.captureGroup || 0];
        }
      } else if (field.extractor) {
        result[key] = field.extractor(text);
      }
    });

    return result as T;
  }

  /**
   * 推断数据结构
   */
  private inferStructure(text: string): any {
    // 与TraditionalPDFParser中相同的实现
    const structuredData: any = {
      code: 0,
      message: null,
      msg: null,
      data: {}
    };

    // 尝试提取总体评估
    const overallMatch = text.match(/总体评估[：:]?\s*([^\n]+)/);
    if (overallMatch) {
      structuredData.data.总体评估 = {
        评估结果: overallMatch[1].trim()
      };
    }

    // 尝试提取各种指标
    const indicators = [
      '攻击性', '压力程度', '焦虑程度', '消沉程度', '自卑程度',
      '抑郁倾向', '社交恐惧度', '活力', '抑制', '脑活力',
      '平衡', '自信', '神经质', '注意力', '满意度', '调节水平'
    ];

    const mentalIndicators: any[] = [];
    const physicalIndicators: any[] = [];
    const behavioralIndicators: any[] = [];

    indicators.forEach(indicator => {
      const match = text.match(new RegExp(`${indicator}[：:]?\\s*([\\d.]+)`));
      if (match) {
        const value = parseFloat(match[1]);
        const indicatorData = {
          code: this.generateIndicatorCode(indicator),
          name: indicator,
          value: value
        };

        // 根据指标类型分类
        if (['攻击性', '压力程度', '焦虑程度', '消沉程度', '自卑程度', '抑郁倾向', '社交恐惧度'].includes(indicator)) {
          mentalIndicators.push(indicatorData);
        } else if (['活力', '抑制', '脑活力'].includes(indicator)) {
          physicalIndicators.push(indicatorData);
        } else {
          behavioralIndicators.push(indicatorData);
        }
      }
    });

    if (mentalIndicators.length > 0) {
      structuredData.data.心理指标 = mentalIndicators;
    }
    if (physicalIndicators.length > 0) {
      structuredData.data.生理指标 = physicalIndicators;
    }
    if (behavioralIndicators.length > 0) {
      structuredData.data.行为指标 = behavioralIndicators;
    }

    return structuredData;
  }

  /**
   * 生成指标代码
   */
  private generateIndicatorCode(indicatorName: string): string {
    const codeMap: Record<string, string> = {
      '攻击性': 'Q1',
      '压力程度': 'Q2',
      '焦虑程度': 'Q3',
      '消沉程度': 'Q10',
      '自卑程度': 'Q24',
      '抑郁倾向': 'Q26',
      '社交恐惧度': 'Q27',
      '活力': 'Q6',
      '抑制': 'Q8',
      '脑活力': 'Q16',
      '平衡': 'Q4',
      '自信': 'Q5',
      '神经质': 'Q9',
      '注意力': 'Q15',
      '满意度': 'Q14',
      '调节水平': 'Q7'
    };

    return codeMap[indicatorName] || `CODE_${indicatorName}`;
  }
}

/**
 * 数据模式定义（复用）
 */
export interface DataSchema<T> {
  fields: {
    [K in keyof T]: SchemaField;
  };
}

export interface SchemaField {
  pattern?: string;
  flags?: string;
  captureGroup?: number;
  extractor?: (text: string) => any;
  required?: boolean;
}