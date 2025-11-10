#!/usr/bin/env node

/**
 * PDF处理器CLI工具
 * 提供PDF转换、解析和结构化数据提取的命令行界面
 */

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');

// 导入转换器和解析器
const { PDFToImageConverter } = require('../src/converters/pdf-to-image');
const { ImageToPDFConverter } = require('../src/converters/image-to-pdf');
const { BatchConverter } = require('../src/converters/batch-converter');
const { TraditionalPDFParser } = require('../src/parsers/traditional-pdf-parser');
const { AIOCRParser } = require('../src/parsers/ai-ocr-parser');

const program = new Command();

// 版本信息
program
  .name('pdf-processor')
  .description('PDF处理器 - 提供PDF转换、解析和结构化数据提取功能')
  .version('1.0.0');

// 通用工具函数
function validateFile(filePath, extensions = []) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }

  if (extensions.length > 0) {
    const ext = path.extname(filePath).toLowerCase();
    if (!extensions.includes(ext)) {
      console.error(`❌ 不支持的文件格式: ${ext}，支持的格式: ${extensions.join(', ')}`);
      process.exit(1);
    }
  }
}

function validateDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ 目录不存在: ${dirPath}`);
    process.exit(1);
  }

  if (!fs.statSync(dirPath).isDirectory()) {
    console.error(`❌ 路径不是目录: ${dirPath}`);
    process.exit(1);
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function logSuccess(message, details = '') {
  console.log(`✅ ${message}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function logError(message, details = '') {
  console.error(`❌ ${message}`);
  if (details) {
    console.error(`   ${details}`);
  }
}

function logProgress(message) {
  console.log(`🔄 ${message}`);
}

// PDF转图像命令
program
  .command('convert-pdf-to-image')
  .description('将PDF转换为图像')
  .requiredOption('-i, --input <path>', '输入PDF文件路径')
  .option('-o, --output <path>', '输出目录路径', './output-images')
  .option('-f, --format <format>', '图像格式 (png, jpeg, webp)', 'png')
  .option('-q, --quality <number>', '图像质量 (1-100)', '90')
  .option('-d, --dpi <number>', 'DPI设置', '300')
  .option('-p, --pages <numbers>', '页面范围 (例如: 1,3,5-8)', 'all')
  .action(async (options) => {
    try {
      logProgress('开始PDF转图像转换...');

      // 验证输入文件
      validateFile(options.input, ['.pdf']);

      // 确保输出目录存在
      ensureDir(options.output);

      // 解析参数
      const convertOptions = {
        format: options.format,
        quality: parseInt(options.quality),
        dpi: parseInt(options.dpi),
        pages: options.pages === 'all' ? undefined : options.pages
      };

      // 创建转换器并执行转换
      const converter = new PDFToImageConverter();
      const result = await converter.convert(options.input, convertOptions);

      if (result.success) {
        logSuccess('PDF转图像完成',
          `输出目录: ${result.outputPath}, 处理时间: ${result.processingTime}ms`);
        if (result.files) {
          console.log(`📁 生成的文件:`);
          result.files.forEach(file => {
            console.log(`   - ${path.basename(file)}`);
          });
        }
      } else {
        logError('PDF转图像失败', result.error?.message);
      }
    } catch (error) {
      logError('PDF转图像过程中发生错误', error.message);
    }
  });

// 图像转PDF命令
program
  .command('convert-images-to-pdf')
  .description('将多个图像转换为PDF')
  .requiredOption('-i, --input <paths>', '输入图像文件路径（逗号分隔）或目录')
  .requiredOption('-o, --output <path>', '输出PDF文件路径')
  .option('--input-dir', '输入为目录而非文件列表')
  .option('--pattern <pattern>', '文件匹配模式 (用于目录输入)', '*.{png,jpg,jpeg,webp,bmp,tiff}')
  .option('--page-size <size>', 'PDF页面尺寸 (A4, Letter, Legal)', 'A4')
  .option('--orientation <orientation>', '页面方向 (portrait, landscape)', 'portrait')
  .option('--margin <number>', '页面边距 (mm)', '10')
  .action(async (options) => {
    try {
      logProgress('开始图像转PDF转换...');

      let inputPaths;
      if (options.inputDir) {
        // 目录模式
        validateDir(options.input);
        inputPaths = options.input;
      } else {
        // 文件列表模式
        inputPaths = options.input.split(',').map(p => p.trim());
        inputPaths.forEach(p => validateFile(p, ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']));
      }

      // 确保输出目录存在
      const outputDir = path.dirname(options.output);
      ensureDir(outputDir);

      // 解析参数
      const convertOptions = {
        pageSize: options.pageSize,
        orientation: options.orientation,
        margin: parseInt(options.margin)
      };

      // 创建转换器并执行转换
      const converter = new ImageToPDFConverter();
      let result;

      if (options.inputDir) {
        result = await converter.convertFromDirectory(inputPaths, options.output, options.pattern, convertOptions);
      } else {
        result = await converter.convert(inputPaths, options.output, convertOptions);
      }

      if (result.success) {
        logSuccess('图像转PDF完成',
          `输出文件: ${result.outputPath}, 处理时间: ${result.processingTime}ms`);
      } else {
        logError('图像转PDF失败', result.error?.message);
      }
    } catch (error) {
      logError('图像转PDF过程中发生错误', error.message);
    }
  });

// 批量转换命令
program
  .command('batch-convert')
  .description('批量转换文件')
  .requiredOption('-t, --type <type>', '转换类型 (pdf-to-image, image-to-pdf)')
  .requiredOption('-i, --input <path>', '输入目录路径')
  .requiredOption('-o, --output <path>', '输出目录路径')
  .option('--pattern <pattern>', '输入文件匹配模式', '*')
  .option('--concurrency <number>', '并发数', '3')
  .option('--continue-on-error', '遇到错误时继续处理', false)
  .action(async (options) => {
    try {
      logProgress('开始批量转换...');

      // 验证输入输出目录
      validateDir(options.input);
      ensureDir(options.output);

      // 解析参数
      const batchOptions = {
        type: options.type,
        inputDir: options.input,
        outputDir: options.output,
        pattern: options.pattern,
        concurrency: parseInt(options.concurrency),
        continueOnError: options.continueOnError
      };

      // 创建批量转换器并执行转换
      const converter = new BatchConverter();
      const result = await converter.convert(batchOptions);

      if (result.success) {
        logSuccess('批量转换完成',
          `处理文件数: ${result.processedFiles || 0}, 成功: ${result.successCount || 0}, 失败: ${result.failureCount || 0}`);
        if (result.outputFiles) {
          console.log(`📁 生成的文件:`);
          result.outputFiles.forEach(file => {
            console.log(`   - ${path.basename(file)}`);
          });
        }
      } else {
        logError('批量转换失败', result.error?.message);
      }
    } catch (error) {
      logError('批量转换过程中发生错误', error.message);
    }
  });

// PDF解析命令
program
  .command('parse-pdf')
  .description('解析PDF文件并提取文本和元数据')
  .requiredOption('-i, --input <path>', '输入PDF文件路径')
  .option('-o, --output <path>', '输出JSON文件路径')
  .option('--include-text', '包含文本内容', true)
  .option('--include-metadata', '包含元数据', true)
  .option('--max-pages <number>', '最大页面数')
  .action(async (options) => {
    try {
      logProgress('开始PDF解析...');

      // 验证输入文件
      validateFile(options.input, ['.pdf']);

      // 解析参数
      const parseOptions = {
        includeText: options.includeText,
        includeMetadata: options.includeMetadata,
        maxPages: options.maxPages ? parseInt(options.maxPages) : undefined
      };

      // 创建解析器并执行解析
      const parser = new TraditionalPDFParser();
      const result = await parser.parse(options.input, parseOptions);

      if (result.success) {
        logSuccess('PDF解析完成', `处理时间: ${result.processingTime}ms`);

        // 显示解析结果摘要
        if (result.document) {
          console.log(`📄 解析摘要:`);
          console.log(`   页数: ${result.document.pages.length}`);
          console.log(`   标题: ${result.document.metadata?.title || '未知'}`);
          console.log(`   作者: ${result.document.metadata?.author || '未知'}`);

          let totalTextLength = 0;
          result.document.pages.forEach(page => {
            if (page.text) {
              totalTextLength += page.text.length;
            }
          });
          console.log(`   文本长度: ${totalTextLength} 字符`);
        }

        // 保存结果
        if (options.output) {
          const outputData = {
            success: result.success,
            document: result.document,
            processingTime: result.processingTime
          };
          fs.writeFileSync(options.output, JSON.stringify(outputData, null, 2));
          logSuccess('解析结果已保存', options.output);
        }
      } else {
        logError('PDF解析失败', result.error?.message);
      }
    } catch (error) {
      logError('PDF解析过程中发生错误', error.message);
    }
  });

// AI OCR解析命令
program
  .command('ocr-pdf')
  .description('使用AI OCR解析PDF文件')
  .requiredOption('-i, --input <path>', '输入PDF文件路径')
  .option('-o, --output <path>', '输出JSON文件路径')
  .option('--model <model>', 'AI模型名称')
  .option('--endpoint <endpoint>', 'API端点')
  .option('--api-key <key>', 'API密钥')
  .option('--extract-structure', '提取结构化数据', true)
  .action(async (options) => {
    try {
      logProgress('开始AI OCR解析...');

      // 验证输入文件
      validateFile(options.input, ['.pdf']);

      // 检查AI配置
      if (!options.apiKey && !process.env.API_KEY && !process.env.OPENAI_API_KEY) {
        logError('未配置API密钥', '请设置 --api-key 参数或配置环境变量 API_KEY/OPENAI_API_KEY');
        return;
      }

      // 解析参数
      const ocrOptions = {
        model: options.model || process.env.MODEL_NAME,
        endpoint: options.endpoint || process.env.API_ENDPOINT,
        apiKey: options.apiKey || process.env.API_KEY || process.env.OPENAI_API_KEY,
        extractStructure: options.extractStructure
      };

      // 创建AI OCR解析器并执行解析
      const parser = new AIOCRParser();
      const result = await parser.parse(options.input, ocrOptions);

      if (result.success) {
        logSuccess('AI OCR解析完成', `处理时间: ${result.processingTime}ms`);

        // 显示解析结果摘要
        if (result.document) {
          console.log(`📄 OCR解析摘要:`);
          console.log(`   页数: ${result.document.pages.length}`);
          console.log(`   模型: ${ocrOptions.model}`);
          console.log(`   端点: ${ocrOptions.endpoint}`);
        }

        // 保存结果
        if (options.output) {
          const outputData = {
            success: result.success,
            document: result.document,
            processingTime: result.processingTime
          };
          fs.writeFileSync(options.output, JSON.stringify(outputData, null, 2));
          logSuccess('OCR解析结果已保存', options.output);
        }
      } else {
        logError('AI OCR解析失败', result.error?.message);
      }
    } catch (error) {
      logError('AI OCR解析过程中发生错误', error.message);
    }
  });

// 结构化数据提取命令
program
  .command('extract-structured-data')
  .description('从PDF提取结构化数据')
  .requiredOption('-i, --input <path>', '输入PDF文件路径')
  .requiredOption('-o, --output <path>', '输出JSON文件路径')
  .option('--method <method>', '解析方法 (traditional, ai, combined)', 'traditional')
  .option('--model <model>', 'AI模型名称（AI方法需要）')
  .option('--endpoint <endpoint>', 'API端点（AI方法需要）')
  .option('--api-key <key>', 'API密钥（AI方法需要）')
  .action(async (options) => {
    try {
      logProgress('开始结构化数据提取...');

      // 验证输入文件
      validateFile(options.input, ['.pdf']);

      let result;
      let parser;

      if (options.method === 'traditional') {
        parser = new TraditionalPDFParser();
        result = await parser.extractStructuredData(options.input);
      } else if (options.method === 'ai') {
        if (!options.apiKey && !process.env.API_KEY && !process.env.OPENAI_API_KEY) {
          logError('AI解析需要API密钥', '请设置 --api-key 参数或配置环境变量');
          return;
        }

        const ocrOptions = {
          model: options.model || process.env.MODEL_NAME,
          endpoint: options.endpoint || process.env.API_ENDPOINT,
          apiKey: options.apiKey || process.env.API_KEY || process.env.OPENAI_API_KEY,
          extractStructure: true
        };

        parser = new AIOCRParser();
        const parseResult = await parser.parse(options.input, ocrOptions);

        if (parseResult.success && parseResult.document) {
          result = parseResult.document.structuredData;
        } else {
          throw new Error(parseResult.error?.message || 'AI OCR解析失败');
        }
      } else {
        logError('不支持的解析方法', '支持的方法: traditional, ai');
        return;
      }

      // 保存结构化数据
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
      logSuccess('结构化数据提取完成', `输出文件: ${options.output}`);

      // 显示数据摘要
      if (result && result.data) {
        console.log(`📊 数据摘要:`);
        console.log(`   状态码: ${result.code}`);
        console.log(`   单位: ${result.data?.unit || '未知'}`);
        console.log(`   性别: ${result.data?.gender || '未知'}`);
        console.log(`   报告ID: ${result.data?.reportId || '未知'}`);

        const dataKeys = Object.keys(result.data?.data || {});
        console.log(`   数据字段: ${dataKeys.length} 个`);
        if (dataKeys.length > 0) {
          console.log(`   字段列表: ${dataKeys.slice(0, 5).join(', ')}${dataKeys.length > 5 ? '...' : ''}`);
        }
      }

    } catch (error) {
      logError('结构化数据提取失败', error.message);
    }
  });

// 演示命令 - 使用测试文件展示所有功能
program
  .command('demo')
  .description('使用测试文件演示所有功能')
  .option('--pdf <path>', '测试PDF文件路径', './test-reports.pdf')
  .option('--output-dir <path>', '演示输出目录', './demo-output')
  .action(async (options) => {
    try {
      logProgress('开始PDF处理器功能演示...');

      // 验证测试文件
      validateFile(options.pdf, ['.pdf']);
      ensureDir(options.outputDir);

      console.log(`📋 测试文件: ${options.pdf}`);
      console.log(`📁 输出目录: ${options.outputDir}`);
      console.log('');

      // 1. PDF转图像演示
      console.log('1️⃣ PDF转图像演示');
      console.log('=' .repeat(50));
      const imageConverter = new PDFToImageConverter();
      const imageOutputDir = path.join(options.outputDir, 'images');

      const imageResult = await imageConverter.convert(options.pdf, {
        format: 'png',
        dpi: 150,
        pages: '1' // 只转换第一页作为演示
      });

      if (imageResult.success) {
        logSuccess('PDF转图像完成', `输出目录: ${imageResult.outputPath}`);
      } else {
        logError('PDF转图像失败', imageResult.error?.message);
      }
      console.log('');

      // 2. 传统解析演示
      console.log('2️⃣ 传统PDF解析演示');
      console.log('=' .repeat(50));
      const traditionalParser = new TraditionalPDFParser();

      const traditionalResult = await traditionalParser.parse(options.pdf, {
        includeText: true,
        includeMetadata: true,
        maxPages: 2 // 只解析前两页作为演示
      });

      if (traditionalResult.success) {
        logSuccess('传统PDF解析完成', `页数: ${traditionalResult.document?.pages.length}`);

        // 保存传统解析结果
        const traditionalOutputFile = path.join(options.outputDir, 'traditional-parsed.json');
        fs.writeFileSync(traditionalOutputFile, JSON.stringify(traditionalResult, null, 2));
        logSuccess('传统解析结果已保存', traditionalOutputFile);
      } else {
        logError('传统PDF解析失败', traditionalResult.error?.message);
      }
      console.log('');

      // 3. 结构化数据提取演示
      console.log('3️⃣ 结构化数据提取演示');
      console.log('=' .repeat(50));

      try {
        const structuredData = await traditionalParser.extractStructuredData(options.pdf);
        const structuredOutputFile = path.join(options.outputDir, 'structured-data.json');
        fs.writeFileSync(structuredOutputFile, JSON.stringify(structuredData, null, 2));

        logSuccess('结构化数据提取完成', structuredOutputFile);

        if (structuredData && structuredData.data) {
          const dataKeys = Object.keys(structuredData.data.data || {});
          console.log(`   提取的数据类别: ${dataKeys.join(', ')}`);

          // 统计指标数量
          let indicatorCount = 0;
          dataKeys.forEach(key => {
            const categoryData = structuredData.data.data[key];
            if (Array.isArray(categoryData)) {
              indicatorCount += categoryData.length;
            }
          });
          console.log(`   提取的指标总数: ${indicatorCount} 个`);
        }
      } catch (error) {
        logError('结构化数据提取失败', error.message);
      }
      console.log('');

      // 4. AI OCR演示（如果配置了API密钥）
      if (process.env.API_KEY || process.env.OPENAI_API_KEY) {
        console.log('4️⃣ AI OCR解析演示');
        console.log('=' .repeat(50));

        try {
          const aiParser = new AIOCRParser();
          const aiResult = await aiParser.parse(options.pdf, {
            extractStructure: true,
            maxPages: 1 // 只解析第一页作为演示
          });

          if (aiResult.success) {
            logSuccess('AI OCR解析完成', `模型: ${process.env.MODEL_NAME || 'default'}`);

            // 保存AI解析结果
            const aiOutputFile = path.join(options.outputDir, 'ai-parsed.json');
            fs.writeFileSync(aiOutputFile, JSON.stringify(aiResult, null, 2));
            logSuccess('AI解析结果已保存', aiOutputFile);
          } else {
            logError('AI OCR解析失败', aiResult.error?.message);
          }
        } catch (error) {
          logError('AI OCR解析失败', error.message);
        }
      } else {
        console.log('4️⃣ AI OCR解析演示');
        console.log('=' .repeat(50));
        console.log('⚠️  未配置API密钥，跳过AI OCR演示');
      }
      console.log('');

      console.log('🎉 演示完成！');
      console.log(`📁 所有输出文件保存在: ${options.outputDir}`);

    } catch (error) {
      logError('演示过程中发生错误', error.message);
    }
  });

// 错误处理
program.on('command:*', (operands) => {
  console.error(`❌ 未知命令: ${operands[0]}`);
  console.log('使用 --help 查看可用命令');
});

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}