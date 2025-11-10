/**
 * 综合测试文件
 * 测试所有已实现的PDF处理功能
 */

import { PDFToImageConverter } from './converters/pdf-to-image';
import { ImageToPDFConverter } from './converters/image-to-pdf';
import { BatchConverter } from './converters/batch-converter';
import { TraditionalPDFParser } from './parsers/traditional-pdf-parser';
import { AIOCRParser } from './parsers/ai-ocr-parser';
import * as path from 'path';
import * as fs from 'fs';

async function runComprehensiveTests() {
  console.log('🚀 开始PDF处理器综合测试...\n');

  const pdfPath = path.resolve(__dirname, '../test-reports.pdf');
  const outputDir = path.resolve(__dirname, '../test-output');

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 检查测试文件是否存在
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ 测试PDF文件不存在:', pdfPath);
    return;
  }

  const results = {
    pdfToImage: false,
    imageToPDF: false,
    batch: false,
    traditionalParser: false,
    aiParser: false
  };

  try {
    // 1. 测试PDF转图像
    console.log('📄 测试1: PDF转图像');
    const imageConverter = new PDFToImageConverter();
    const imageResult = await imageConverter.convert(pdfPath, {
      format: 'png',
      outputDir: path.join(outputDir, 'images'),
      prefix: 'test',
      quality: 90,
      dpi: 300
    });

    if (imageResult.success) {
      console.log('✅ PDF转图像成功');
      console.log(`   处理时间: ${imageResult.metadata.processingTime}ms`);
      console.log(`   页数: ${imageResult.metadata.pageCount}`);
      console.log(`   输出文件: ${imageResult.outputFiles.length}个`);
      results.pdfToImage = true;
    } else {
      console.error('❌ PDF转图像失败:', imageResult.error?.message);
    }

    // 2. 测试传统PDF解析
    console.log('\n📖 测试2: 传统PDF解析');
    const traditionalParser = new TraditionalPDFParser();
    const parseResult = await traditionalParser.parse(pdfPath);

    if (parseResult.success) {
      console.log('✅ 传统PDF解析成功');
      console.log(`   处理时间: ${parseResult.processingTime}ms`);
      console.log(`   页数: ${parseResult.document?.pages.length}`);

      if (parseResult.document) {
        console.log(`   文档标题: ${parseResult.document.metadata.title || '无'}`);
        console.log(`   作者: ${parseResult.document.metadata.author || '无'}`);
      }
      results.traditionalParser = true;
    } else {
      console.error('❌ 传统PDF解析失败:', parseResult.error?.message);
    }

    // 3. 测试结构化数据提取
    console.log('\n📊 测试3: 结构化数据提取');
    try {
      const structuredData = await traditionalParser.extractStructuredData(pdfPath);
      console.log('✅ 结构化数据提取成功');
      console.log('   数据结构:', Object.keys(structuredData));

      if (structuredData.data) {
        console.log('   包含数据类别:', Object.keys(structuredData.data));
        if (structuredData.data.心理指标) {
          console.log(`   心理指标数量: ${structuredData.data.心理指标.length}`);
        }
      }
    } catch (error) {
      console.error('❌ 结构化数据提取失败:', error);
    }

    // 4. 测试批量转换（如果有多个PDF文件）
    console.log('\n🔄 测试4: 批量转换功能');
    try {
      // 创建一个包含我们测试PDF的目录进行批量处理
      const batchConverter = new BatchConverter();
      const batchInputDir = path.dirname(pdfPath);
      const batchOutputDir = path.join(outputDir, 'batch-output');

      // 模拟批量转换（使用通配符匹配PDF文件）
      const batchResult = await batchConverter.convert({
        inputDir: batchInputDir,
        outputDir: batchOutputDir,
        inputPattern: 'test-reports.pdf',
        conversionOptions: {
          format: 'png',
          quality: 80,
          dpi: 200
        },
        concurrency: 1,
        continueOnError: true,
        progressCallback: (progress) => {
          console.log(`   进度: ${progress.percentage}% (${progress.completed}/${progress.total})`);
        }
      });

      if (batchResult.success) {
        console.log('✅ 批量转换成功');
        console.log(`   处理时间: ${batchResult.metadata.processingTime}ms`);
        console.log(`   输出文件: ${batchResult.outputFiles.length}个`);
        results.batch = true;
      } else {
        console.error('❌ 批量转换失败:', batchResult.error?.message);
      }
    } catch (error) {
      console.error('❌ 批量转换测试失败:', error);
    }

    // 5. 测试图像转PDF（如果之前成功生成了图像）
    console.log('\n🖼️  测试5: 图像转PDF');
    if (results.pdfToImage && imageResult.outputFiles.length > 0) {
      try {
        const imageToPDFConverter = new ImageToPDFConverter();
        const imageFiles = imageResult.outputFiles.slice(0, 3); // 只使用前3个图像进行测试
        const pdfOutputPath = path.join(outputDir, 'converted-from-images.pdf');

        const imageToPDFResult = await imageToPDFConverter.convert(imageFiles, pdfOutputPath, {
          pageSize: 'a4',
          orientation: 'portrait',
          quality: 85
        });

        if (imageToPDFResult.success) {
          console.log('✅ 图像转PDF成功');
          console.log(`   处理时间: ${imageToPDFResult.metadata.processingTime}ms`);
          console.log(`   输入图像: ${imageFiles.length}个`);
          console.log(`   输出PDF: ${pdfOutputPath}`);
          results.imageToPDF = true;
        } else {
          console.error('❌ 图像转PDF失败:', imageToPDFResult.error?.message);
        }
      } catch (error) {
        console.error('❌ 图像转PDF测试失败:', error);
      }
    } else {
      console.log('⏭️  跳过图像转PDF测试（没有可用的图像文件）');
    }

    // 6. 测试AI OCR解析（如果有API密钥）
    console.log('\n🤖 测试6: AI OCR解析');
    const hasOpenAIKey = process.env.OPENAI_API_KEY;
    if (hasOpenAIKey) {
      try {
        const aiParser = new AIOCRParser();
        // 只处理第一页以节省API调用成本
        const aiResult = await aiParser.parse(pdfPath, {
          model: 'gpt-4-vision-preview',
          maxTokens: 1000,
          temperature: 0.1,
          language: 'zh-CN'
        });

        if (aiResult.success) {
          console.log('✅ AI OCR解析成功');
          console.log(`   处理时间: ${aiResult.processingTime}ms`);
          console.log(`   页数: ${aiResult.document?.pages.length}`);
          if (aiResult.apiUsage) {
            console.log(`   API使用: ${aiResult.apiUsage.tokensUsed} tokens`);
            console.log(`   成本: $${aiResult.apiUsage.cost.toFixed(4)}`);
          }
          results.aiParser = true;
        } else {
          console.error('❌ AI OCR解析失败:', aiResult.error?.message);
        }
      } catch (error) {
        console.error('❌ AI OCR解析测试失败:', error);
      }
    } else {
      console.log('⏭️  跳过AI OCR测试（未设置OPENAI_API_KEY环境变量）');
    }

    // 总结测试结果
    console.log('\n📋 测试结果总结:');
    console.log('='.repeat(50));

    Object.entries(results).forEach(([feature, passed]) => {
      const status = passed ? '✅ 通过' : '❌ 失败';
      const featureNames = {
        pdfToImage: 'PDF转图像',
        imageToPDF: '图像转PDF',
        batch: '批量转换',
        traditionalParser: '传统PDF解析',
        aiParser: 'AI OCR解析'
      };
      console.log(`${featureNames[feature as keyof typeof featureNames]}: ${status}`);
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    console.log('='.repeat(50));
    console.log(`总体结果: ${passedTests}/${totalTests} 测试通过`);

    if (passedTests === totalTests) {
      console.log('🎉 所有测试都通过了！PDF处理器功能正常。');
    } else {
      console.log('⚠️  部分测试失败，请检查相关功能的实现。');
    }

  } catch (error) {
    console.error('❌ 测试过程中发生严重错误:', error);
  }
}

// 显示环境信息
function showEnvironmentInfo() {
  console.log('环境信息:');
  console.log(`  Node.js: ${process.version}`);
  console.log(`  工作目录: ${process.cwd()}`);
  console.log(`  OpenAI API: ${process.env.OPENAI_API_KEY ? '已配置' : '未配置'}`);
  console.log('');
}

// 主函数
async function main() {
  showEnvironmentInfo();
  await runComprehensiveTests();
}

// 运行测试
main().catch(console.error);