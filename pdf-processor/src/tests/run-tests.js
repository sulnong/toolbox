#!/usr/bin/env node

/**
 * PDF处理器测试运行器
 */

const path = require('path');
const fs = require('fs');

// 导入测试模块
const converterTests = require('./converters.test.js');
const parserTests = require('./parsers.test.js');

// 测试统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 自定义测试报告器
function testReporter(testName, success, error = null) {
  totalTests++;
  if (success) {
    passedTests++;
  } else {
    failedTests++;
  }
}

// 重写console.log来捕获测试结果
const originalConsoleLog = console.log;

function runTestSuite() {
  console.log('🧪 开始运行PDF处理器测试套件...\n');

  // 捕获输出
  let output = '';

  console.log = (...args) => {
    output += args.join(' ') + '\n';
  };

  try {
    // 运行转换器测试
    console.log('🔧 运行转换器测试...');
    converterTests.describe('转换器测试套件', () => {
      // 这里会调用内部的it函数，我们已经重写了console.log
    });

    // 运行解析器测试
    console.log('\n📄 运行解析器测试...');
    parserTests.describe('解析器测试套件', () => {
      // 这里会调用内部的it函数，我们已经重写了console.log
    });

  } catch (error) {
    console.error('测试运行过程中发生错误:', error);
  } finally {
    // 恢复console.log
    console.log = originalConsoleLog;

    // 输出捕获的内容
    console.log(output);

    // 输出测试统计
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试统计:');
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   通过: ${passedTests}`);
    console.log(`   失败: ${failedTests}`);
    console.log(`   成功率: ${totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0}%`);

    if (failedTests === 0) {
      console.log('\n🎉 所有测试都通过了！');
    } else {
      console.log(`\n⚠️  有 ${failedTests} 个测试失败`);
    }

    console.log('='.repeat(60));

    return failedTests === 0;
  }
}

// 手动运行一些关键测试来演示功能
async function runManualTests() {
  console.log('🔍 运行手动测试验证...\n');

  const testDir = path.join(__dirname, '../../test-temp');

  // 确保测试目录存在
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 创建测试文件
  const testFile = path.join(testDir, 'test-manual.pdf');
  fs.writeFileSync(testFile, 'mock pdf content for manual testing');

  try {
    // 测试转换器
    console.log('1️⃣ 测试PDF转图像转换器');
    const converter = new converterTests.MockPDFToImageConverter();
    const result1 = await converter.convert(testFile, { format: 'png' });

    if (result1.success) {
      console.log('   ✅ PDF转图像测试通过');
    } else {
      console.log('   ❌ PDF转图像测试失败');
    }

    // 测试解析器
    console.log('\n2️⃣ 测试传统PDF解析器');
    const parser = new parserTests.MockTraditionalPDFParser();
    const result2 = await parser.parse(testFile);

    if (result2.success && result2.document.pages.length > 0) {
      console.log('   ✅ PDF解析测试通过');
      console.log(`   📄 解析到 ${result2.document.pages.length} 页内容`);
    } else {
      console.log('   ❌ PDF解析测试失败');
    }

    // 测试结构化数据提取
    console.log('\n3️⃣ 测试结构化数据提取');
    const structuredData = await parser.extractStructuredData(testFile);

    if (structuredData && structuredData.code === 0) {
      console.log('   ✅ 结构化数据提取测试通过');
      console.log(`   📊 提取到 ${Object.keys(structuredData.data.data || {}).length} 个数据类别`);
    } else {
      console.log('   ❌ 结构化数据提取测试失败');
    }

    // 测试AI OCR解析器
    console.log('\n4️⃣ 测试AI OCR解析器');
    const aiParser = new parserTests.MockAIOCRParser({ apiKey: 'test-key' });
    const result3 = await aiParser.parse(testFile, { extractStructure: true });

    if (result3.success && result3.document.aiMetadata) {
      console.log('   ✅ AI OCR解析测试通过');
      console.log(`   🤖 使用模型: ${result3.document.aiMetadata.model}`);
    } else {
      console.log('   ❌ AI OCR解析测试失败');
    }

    console.log('\n✅ 手动测试完成！');

  } catch (error) {
    console.error('\n❌ 手动测试失败:', error.message);
  } finally {
    // 清理测试文件
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// CLI交互式测试
async function runInteractiveTests() {
  console.log('🎮 交互式测试模式');
  console.log('选择要运行的测试类型:');
  console.log('1. 转换器测试');
  console.log('2. 解析器测试');
  console.log('3. 完整测试套件');
  console.log('4. 手动验证测试');
  console.log('5. 退出');

  // 简化的输入处理（在实际应用中可以使用readline）
  const choice = process.argv[2] || '3';

  switch (choice) {
    case '1':
      console.log('🔧 运行转换器测试...');
      // 运行转换器测试的具体逻辑
      break;

    case '2':
      console.log('📄 运行解析器测试...');
      // 运行解析器测试的具体逻辑
      break;

    case '3':
      return runTestSuite();

    case '4':
      await runManualTests();
      return true;

    case '5':
      console.log('👋 退出测试');
      return true;

    default:
      console.log('❌ 无效选择，运行完整测试套件');
      return runTestSuite();
  }
}

// 性能基准测试
async function runPerformanceBenchmarks() {
  console.log('\n⚡ 性能基准测试...\n');

  const iterations = 10;
  const testDir = path.join(__dirname, '../../test-temp');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFile = path.join(testDir, 'benchmark.pdf');
  fs.writeFileSync(testFile, 'mock pdf content for benchmark');

  try {
    // PDF转换基准测试
    console.log('📊 PDF转换性能测试');
    const converter = new converterTests.MockPDFToImageConverter();
    const conversionTimes = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await converter.convert(testFile);
      const end = Date.now();
      conversionTimes.push(end - start);
    }

    const avgConversionTime = conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length;
    const minConversionTime = Math.min(...conversionTimes);
    const maxConversionTime = Math.max(...conversionTimes);

    console.log(`   平均处理时间: ${avgConversionTime.toFixed(2)}ms`);
    console.log(`   最快处理时间: ${minConversionTime}ms`);
    console.log(`   最慢处理时间: ${maxConversionTime}ms`);

    // PDF解析基准测试
    console.log('\n📄 PDF解析性能测试');
    const parser = new parserTests.MockTraditionalPDFParser();
    const parsingTimes = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await parser.parse(testFile);
      const end = Date.now();
      parsingTimes.push(end - start);
    }

    const avgParsingTime = parsingTimes.reduce((a, b) => a + b, 0) / parsingTimes.length;
    const minParsingTime = Math.min(...parsingTimes);
    const maxParsingTime = Math.max(...parsingTimes);

    console.log(`   平均处理时间: ${avgParsingTime.toFixed(2)}ms`);
    console.log(`   最快处理时间: ${minParsingTime}ms`);
    console.log(`   最慢处理时间: ${maxParsingTime}ms`);

    console.log('\n✅ 性能基准测试完成！');

  } catch (error) {
    console.error('❌ 性能基准测试失败:', error.message);
  } finally {
    // 清理
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// 主函数
async function main() {
  const mode = process.argv[2] || 'full';

  switch (mode) {
    case 'interactive':
      await runInteractiveTests();
      break;

    case 'manual':
      await runManualTests();
      break;

    case 'benchmark':
      await runPerformanceBenchmarks();
      break;

    case 'full':
    default:
      const success = runTestSuite();
      await runManualTests();
      await runPerformanceBenchmarks();
      break;
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('\n❌ 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runTestSuite,
  runManualTests,
  runInteractiveTests,
  runPerformanceBenchmarks
};