/**
 * PDF解析功能测试
 * 测试传统解析和AI OCR解析的效果
 */

import { config } from 'dotenv';
import { TraditionalPDFParser } from './parsers/traditional-pdf-parser';
import { AIOCRParser } from './parsers/ai-ocr-parser';
import * as path from 'path';
import * as fs from 'fs';

// 加载环境变量
config();

async function testParsingFeatures() {
  console.log('🧪 开始PDF解析功能测试...\n');

  const pdfPath = path.resolve(__dirname, '../test-reports.pdf');

  // 检查测试文件是否存在
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ 测试PDF文件不存在:', pdfPath);
    return;
  }

  // 显示环境配置
  console.log('📋 环境配置:');
  console.log(`  API Key: ${process.env.API_KEY ? '已配置' : '未配置'}`);
  console.log(`  API Endpoint: ${process.env.API_ENDPOINT || '未配置'}`);
  console.log(`  Model: ${process.env.MODEL_NAME || '未配置'}`);
  console.log('');

  // 1. 测试传统PDF解析
  console.log('📖 测试1: 传统PDF解析');
  try {
    const traditionalParser = new TraditionalPDFParser();
    const parseResult = await traditionalParser.parse(pdfPath);

    if (parseResult.success) {
      console.log('✅ 传统PDF解析成功');
      console.log(`   处理时间: ${parseResult.processingTime}ms`);
      console.log(`   页数: ${parseResult.document?.pages.length}`);

      if (parseResult.document) {
        // 显示基本信息
        console.log(`   文件大小: ${(parseResult.document.fileInfo.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   加密状态: ${parseResult.document.metadata.isEncrypted ? '是' : '否'}`);

        // 提取所有文本
        const fullText = await traditionalParser.extractText(pdfPath);
        console.log(`   提取文本长度: ${fullText.length} 字符`);
        console.log(`   文本预览: ${fullText.substring(0, 200)}...`);
      }
    } else {
      console.error('❌ 传统PDF解析失败:', parseResult.error?.message);
    }
  } catch (error) {
    console.error('❌ 传统PDF解析异常:', error);
  }

  // 2. 测试结构化数据提取（传统）
  console.log('\n📊 测试2: 结构化数据提取（传统）');
  try {
    const traditionalParser = new TraditionalPDFParser();
    const structuredData = await traditionalParser.extractStructuredData(pdfPath);

    console.log('✅ 结构化数据提取成功');
    console.log('   数据结构:');
    console.log(`     code: ${structuredData.code}`);
    console.log(`     message: ${structuredData.message}`);
    console.log(`     数据键: ${Object.keys(structuredData.data || {}).join(', ')}`);

    // 显示具体的数据内容
    if (structuredData.data) {
      Object.entries(structedData.data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          console.log(`     ${key}: ${value.length} 项数据`);
          // 显示前几项
          value.slice(0, 2).forEach((item: any, index: number) => {
            console.log(`       ${index + 1}. ${item.name}: ${item.value}`);
          });
        } else if (typeof value === 'object') {
          console.log(`     ${key}: ${Object.keys(value).length} 个字段`);
          Object.entries(value).forEach(([subKey, subValue]) => {
            console.log(`       ${subKey}: ${subValue}`);
          });
        } else {
          console.log(`     ${key}: ${value}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ 结构化数据提取失败:', error);
  }

  // 3. 测试AI OCR解析（如果配置了API）
  console.log('\n🤖 测试3: AI OCR解析');
  if (process.env.API_KEY && process.env.API_ENDPOINT) {
    try {
      const aiParser = new AIOCRParser();
      console.log('   正在调用AI OCR API...');

      const aiResult = await aiParser.parse(pdfPath, {
        model: process.env.MODEL_NAME,
        maxTokens: 2000, // 减少token使用
        temperature: 0.1,
        language: 'zh-CN',
        extractStructure: true
      });

      if (aiResult.success) {
        console.log('✅ AI OCR解析成功');
        console.log(`   处理时间: ${aiResult.processingTime}ms`);
        console.log(`   页数: ${aiResult.document?.pages.length}`);

        if (aiResult.apiUsage) {
          console.log(`   Token使用: ${aiResult.apiUsage.tokensUsed}`);
          console.log(`   预估成本: $${aiResult.apiUsage.cost.toFixed(4)}`);
        }

        // 提取AI识别的文本
        if (aiResult.document && aiResult.document.pages.length > 0) {
          const firstPageText = aiResult.document.pages[0].text;
          if (firstPageText) {
            console.log(`   首页文本预览: ${firstPageText.substring(0, 200)}...`);
          }
        }
      } else {
        console.error('❌ AI OCR解析失败:', aiResult.error?.message);
      }
    } catch (error) {
      console.error('❌ AI OCR解析异常:', error);
    }
  } else {
    console.log('⏭️  跳过AI OCR测试（未配置API_KEY或API_ENDPOINT）');
  }

  // 4. 测试AI结构化数据提取（如果配置了API）
  console.log('\n🎯 测试4: AI结构化数据提取');
  if (process.env.API_KEY && process.env.API_ENDPOINT) {
    try {
      const aiParser = new AIOCRParser();
      console.log('   正在使用AI提取结构化数据...');

      const aiStructuredData = await aiParser.extractStructuredData(pdfPath, undefined, {
        model: process.env.MODEL_NAME,
        maxTokens: 2000,
        temperature: 0.1,
        extractStructure: true
      });

      console.log('✅ AI结构化数据提取成功');
      console.log('   AI提取的数据结构:');
      console.log(`     code: ${aiStructuredData.code}`);
      console.log(`     message: ${aiStructuredData.message}`);
      console.log(`     数据键: ${Object.keys(aiStructuredData.data || {}).join(', ')}`);

      // 对比传统解析和AI解析的结果
      console.log('\n   对比分析:');
      if (aiStructuredData.data) {
        Object.entries(aiStructuredData.data).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            console.log(`     ${key}: AI识别到 ${value.length} 项指标`);
          } else {
            console.log(`     ${key}: AI识别到结构化数据`);
          }
        });
      }

    } catch (error) {
      console.error('❌ AI结构化数据提取失败:', error);
    }
  } else {
    console.log('⏭️  跳过AI结构化数据提取测试（未配置API）');
  }

  console.log('\n📝 测试完成！');
  console.log('\n💡 建议:');
  console.log('1. 检查传统解析是否正确提取了文本内容');
  console.log('2. 查看结构化数据是否匹配test-data.json的格式');
  console.log('3. 如果配置了AI，比较传统和AI解析结果的差异');
  console.log('4. 根据实际需要调整解析参数和提示词');
}

// 主函数
async function main() {
  try {
    await testParsingFeatures();
  } catch (error) {
    console.error('测试过程中发生严重错误:', error);
    process.exit(1);
  }
}

// 运行测试
main();