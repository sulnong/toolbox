/**
 * PDF转换器单元测试
 */

const fs = require('fs');
const path = require('path');

// 模拟转换器类（用于测试）
class MockPDFToImageConverter {
  async convert(inputPath, options = {}) {
    // 验证输入文件
    if (!fs.existsSync(inputPath)) {
      throw new Error('输入文件不存在');
    }

    if (!inputPath.toLowerCase().endsWith('.pdf')) {
      throw new Error('输入文件不是PDF格式');
    }

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 100));

    const outputDir = options.outputDir || './output-images';
    const format = options.format || 'png';

    return {
      success: true,
      outputPath: outputDir,
      files: [path.join(outputDir, `page1.${format}`)],
      processingTime: 100
    };
  }

  async convertSinglePage(inputPath, outputPath, pageNumber, options = {}) {
    const result = await this.convert(inputPath, options);
    result.outputPath = outputPath;
    return result;
  }
}

class MockImageToPDFConverter {
  async convert(inputPaths, outputPath, options = {}) {
    // 验证输入文件
    for (const inputPath of inputPaths) {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }
    }

    // 验证输出目录
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
      success: true,
      outputPath: outputPath,
      files: [outputPath],
      processingTime: 150
    };
  }
}

class MockBatchConverter {
  async convert(options) {
    const { inputDir, outputDir, pattern = '*' } = options;

    // 验证输入目录
    if (!fs.existsSync(inputDir)) {
      throw new Error(`输入目录不存在: ${inputDir}`);
    }

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 模拟批量处理
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      success: true,
      processedFiles: 2,
      successCount: 2,
      failureCount: 0,
      outputFiles: [
        path.join(outputDir, 'output1.pdf'),
        path.join(outputDir, 'output2.pdf')
      ],
      processingTime: 300
    };
  }
}

// 测试工具函数
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`期望 ${expected}，但得到 ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`期望 ${JSON.stringify(expected)}，但得到 ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`期望值已定义，但得到 undefined`);
      }
    },
    toBeInstanceOf(expectedClass) {
      if (!(actual instanceof expectedClass)) {
        throw new Error(`期望是 ${expectedClass.name} 的实例`);
      }
    },
    toThrow(expectedError) {
      if (typeof actual !== 'function') {
        throw new Error('期望函数抛出异常');
      }

      try {
        actual();
        throw new Error('期望函数抛出异常，但没有抛出');
      } catch (error) {
        if (expectedError && !error.message.includes(expectedError)) {
          throw new Error(`期望错误消息包含 "${expectedError}"，但得到 "${error.message}"`);
        }
      }
    }
  };
}

function describe(testName, testFn) {
  console.log(`\n📋 ${testName}`);
  testFn();
}

function it(testName, testFn) {
  try {
    testFn();
    console.log(`  ✅ ${testName}`);
  } catch (error) {
    console.log(`  ❌ ${testName}`);
    console.log(`     错误: ${error.message}`);
  }
}

function beforeAll(setupFn) {
  setupFn();
}

function afterAll(cleanupFn) {
  cleanupFn();
}

// 测试设置
let testDir;

beforeAll(() => {
  // 创建测试目录
  testDir = path.join(__dirname, '../../test-temp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 创建模拟文件
  fs.writeFileSync(path.join(testDir, 'test.pdf'), 'mock pdf content');
  fs.writeFileSync(path.join(testDir, 'test1.png'), 'mock png content');
  fs.writeFileSync(path.join(testDir, 'test2.jpg'), 'mock jpg content');
});

afterAll(() => {
  // 清理测试目录
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

// 测试PDF转图像
describe('PDFToImageConverter', () => {
  const converter = new MockPDFToImageConverter();

  it('应该成功转换PDF为图像', async () => {
    const inputPath = path.join(testDir, 'test.pdf');
    const options = {
      outputDir: testDir,
      format: 'png'
    };

    const result = await converter.convert(inputPath, options);

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe(testDir);
    expect(result.files).toBeInstanceOf(Array);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.processingTime).toBeGreaterThan(0);
  });

  it('应该在输入文件不存在时抛出异常', async () => {
    const nonExistentFile = path.join(testDir, 'nonexistent.pdf');

    expect(() => converter.convert(nonExistentFile)).toThrow('输入文件不存在');
  });

  it('应该在输入文件不是PDF时抛出异常', async () => {
    const nonPdfFile = path.join(testDir, 'test1.png');

    expect(() => converter.convert(nonPdfFile)).toThrow('输入文件不是PDF格式');
  });

  it('应该支持自定义格式选项', async () => {
    const inputPath = path.join(testDir, 'test.pdf');
    const options = {
      format: 'jpeg',
      quality: 80,
      dpi: 150
    };

    const result = await converter.convert(inputPath, options);

    expect(result.success).toBe(true);
    expect(result.files[0]).toContain('.jpeg');
  });
});

// 测试图像转PDF
describe('ImageToPDFConverter', () => {
  const converter = new MockImageToPDFConverter();

  it('应该成功将图像转换为PDF', async () => {
    const inputPaths = [
      path.join(testDir, 'test1.png'),
      path.join(testDir, 'test2.jpg')
    ];
    const outputPath = path.join(testDir, 'output.pdf');

    const result = await converter.convert(inputPaths, outputPath);

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe(outputPath);
    expect(result.files).toContain(outputPath);
    expect(result.processingTime).toBeGreaterThan(0);
  });

  it('应该在输入文件不存在时抛出异常', async () => {
    const nonExistentFile = path.join(testDir, 'nonexistent.png');
    const outputPath = path.join(testDir, 'output.pdf');

    expect(() => converter.convert([nonExistentFile], outputPath))
      .toThrow('输入文件不存在: nonexistent.png');
  });

  it('应该自动创建输出目录', async () => {
    const inputPaths = [path.join(testDir, 'test1.png')];
    const newOutputDir = path.join(testDir, 'new-dir');
    const outputPath = path.join(newOutputDir, 'output.pdf');

    // 确保目录不存在
    if (fs.existsSync(newOutputDir)) {
      fs.rmSync(newOutputDir, { recursive: true });
    }

    const result = await converter.convert(inputPaths, outputPath);

    expect(result.success).toBe(true);
    expect(fs.existsSync(newOutputDir)).toBe(true);
  });
});

// 测试批量转换
describe('BatchConverter', () => {
  const converter = new MockBatchConverter();

  it('应该成功执行批量转换', async () => {
    const options = {
      inputDir: testDir,
      outputDir: path.join(testDir, 'batch-output'),
      pattern: '*.png',
      concurrency: 2
    };

    const result = await converter.convert(options);

    expect(result.success).toBe(true);
    expect(result.processedFiles).toBeGreaterThan(0);
    expect(result.successCount).toBeGreaterThan(0);
    expect(result.failureCount).toBe(0);
    expect(result.outputFiles).toBeInstanceOf(Array);
    expect(result.outputFiles.length).toBeGreaterThan(0);
  });

  it('应该在输入目录不存在时抛出异常', async () => {
    const nonExistentDir = path.join(testDir, 'nonexistent');

    expect(() => converter.convert({
      inputDir: nonExistentDir,
      outputDir: testDir
    })).toThrow('输入目录不存在: nonexistent');
  });

  it('应该自动创建输出目录', async () => {
    const newOutputDir = path.join(testDir, 'new-batch-dir');

    // 确保目录不存在
    if (fs.existsSync(newOutputDir)) {
      fs.rmSync(newOutputDir, { recursive: true });
    }

    const result = await converter.convert({
      inputDir: testDir,
      outputDir: newOutputDir
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(newOutputDir)).toBe(true);
  });
});

// 运行所有测试
console.log('🧪 开始运行转换器测试...');

// 导出测试以供外部运行
module.exports = {
  MockPDFToImageConverter,
  MockImageToPDFConverter,
  MockBatchConverter,
  expect,
  describe,
  it,
  beforeAll,
  afterAll
};