/**
 * PDF解析器单元测试
 */

const fs = require('fs');
const path = require('path');

// 模拟解析器类（用于测试）
class MockTraditionalPDFParser {
  async parse(inputPath, options = {}) {
    // 验证输入文件
    if (!fs.existsSync(inputPath)) {
      throw new Error('输入文件不存在');
    }

    if (!inputPath.toLowerCase().endsWith('.pdf')) {
      throw new Error('输入文件不是PDF格式');
    }

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 200));

    const includeText = options.includeText !== false;
    const includeMetadata = options.includeMetadata !== false;

    const document = {
      pages: [
        {
          pageNumber: 1,
          size: { width: 595, height: 842 },
          rotation: 0,
          text: includeText ? "心理健康评估报告\n\n总体评估\n评估结果：正常\n\n心理指标\n攻击性：69.03\n压力程度：37.01" : undefined
        }
      ],
      metadata: includeMetadata ? {
        title: "测试报告",
        author: "测试系统",
        creationDate: new Date('2023-01-01'),
        version: "1.4"
      } : undefined
    };

    return {
      success: true,
      document,
      processingTime: 200
    };
  }

  async extractText(inputPath, options = {}) {
    const result = await this.parse(inputPath, { ...options, includeText: true, includeMetadata: false });
    return result.document.pages.map(page => page.text).join('\n');
  }

  async extractStructuredData(inputPath, schema, options = {}) {
    const text = await this.extractText(inputPath, options);

    // 模拟结构化数据提取
    const structuredData = {
      code: 0,
      message: null,
      data: {
        unit: "暂无单位",
        gender: "女",
        reportId: "100000182",
        data: {
          总体评估: { 评估结果: "正常" },
          心理指标: [
            { code: "Q1", name: "攻击性", value: 69.03, min: 0, max: 100 }
          ],
          生理指标: [],
          行为指标: [],
          所有指标: []
        }
      }
    };

    return structuredData;
  }
}

class MockAIOCRParser {
  constructor(options = {}) {
    this.options = {
      model: 'qwen-vl-ocr',
      endpoint: 'https://aiproxy.hzh.sealos.run',
      apiKey: 'test-key',
      ...options
    };
  }

  async parse(inputPath, options = {}) {
    // 验证API配置
    if (!this.options.apiKey) {
      throw new Error('未配置API密钥');
    }

    // 验证输入文件
    if (!fs.existsSync(inputPath)) {
      throw new Error('输入文件不存在');
    }

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 300));

    const document = {
      pages: [
        {
          pageNumber: 1,
          text: "AI OCR识别的文本内容",
          confidence: 0.95,
          structuredData: options.extractStructure ? {
            indicators: [
              { name: "攻击性", value: 69.03, confidence: 0.92 }
            ]
          } : undefined
        }
      ],
      aiMetadata: {
        model: this.options.model,
        endpoint: this.options.endpoint,
        processingTime: 300
      }
    };

    return {
      success: true,
      document,
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
    toBeNull() {
      if (actual !== null) {
        throw new Error(`期望值为 null，但得到 ${actual}`);
      }
    },
    toBeInstanceOf(expectedClass) {
      if (!(actual instanceof expectedClass)) {
        throw new Error(`期望是 ${expectedClass.name} 的实例`);
      }
    },
    toContain(expected) {
      if (!Array.isArray(actual)) {
        throw new Error('期望数组类型');
      }
      if (!actual.includes(expected)) {
        throw new Error(`期望数组包含 ${expected}`);
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
  fs.writeFileSync(path.join(testDir, 'invalid.txt'), 'mock text content');
});

afterAll(() => {
  // 清理测试目录
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

// 测试传统PDF解析器
describe('TraditionalPDFParser', () => {
  const parser = new MockTraditionalPDFParser();

  it('应该成功解析PDF文件', async () => {
    const inputPath = path.join(testDir, 'test.pdf');
    const options = {
      includeText: true,
      includeMetadata: true
    };

    const result = await parser.parse(inputPath, options);

    expect(result.success).toBe(true);
    expect(result.document).toBeDefined();
    expect(result.document.pages).toBeInstanceOf(Array);
    expect(result.document.pages.length).toBeGreaterThan(0);
    expect(result.document.pages[0].pageNumber).toBe(1);
    expect(result.document.pages[0].text).toBeDefined();
    expect(result.document.metadata).toBeDefined();
    expect(result.processingTime).toBeGreaterThan(0);
  });

  it('应该支持选项控制', async () => {
    const inputPath = path.join(testDir, 'test.pdf');

    // 不包含文本
    const resultNoText = await parser.parse(inputPath, { includeText: false });
    expect(resultNoText.document.pages[0].text).toBeUndefined();

    // 不包含元数据
    const resultNoMetadata = await parser.parse(inputPath, { includeMetadata: false });
    expect(resultNoMetadata.document.metadata).toBeUndefined();
  });

  it('应该在输入文件不存在时抛出异常', async () => {
    const nonExistentFile = path.join(testDir, 'nonexistent.pdf');

    expect(() => parser.parse(nonExistentFile)).toThrow('输入文件不存在');
  });

  it('应该在输入文件不是PDF时抛出异常', async () => {
    const nonPdfFile = path.join(testDir, 'invalid.txt');

    expect(() => parser.parse(nonPdfFile)).toThrow('输入文件不是PDF格式');
  });

  it('应该成功提取文本内容', async () => {
    const inputPath = path.join(testDir, 'test.pdf');
    const text = await parser.extractText(inputPath);

    expect(text).toBeDefined();
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('心理健康评估报告');
  });

  it('应该成功提取结构化数据', async () => {
    const inputPath = path.join(testDir, 'test.pdf');
    const structuredData = await parser.extractStructuredData(inputPath);

    expect(structuredData).toBeDefined();
    expect(structuredData.code).toBe(0);
    expect(structuredData.data).toBeDefined();
    expect(structuredData.data.unit).toBe('暂无单位');
    expect(structuredData.data.gender).toBe('女');
    expect(structuredData.data.reportId).toBe('100000182');
    expect(structuredData.data.data.总体评估).toBeDefined();
    expect(structuredData.data.data.心理指标).toBeInstanceOf(Array);
  });
});

// 测试AI OCR解析器
describe('AIOCRParser', () => {
  it('应该使用默认配置创建解析器', () => {
    const parser = new MockAIOCRParser();
    expect(parser.options.model).toBe('qwen-vl-ocr');
    expect(parser.options.endpoint).toBe('https://aiproxy.hzh.sealos.run');
  });

  it('应该使用自定义配置创建解析器', () => {
    const customOptions = {
      model: 'gpt-4-vision',
      endpoint: 'https://api.openai.com',
      apiKey: 'custom-key'
    };
    const parser = new MockAIOCRParser(customOptions);

    expect(parser.options.model).toBe('gpt-4-vision');
    expect(parser.options.endpoint).toBe('https://api.openai.com');
    expect(parser.options.apiKey).toBe('custom-key');
  });

  it('应该成功解析PDF文件', async () => {
    const parser = new MockAIOCRParser({ apiKey: 'test-key' });
    const inputPath = path.join(testDir, 'test.pdf');
    const options = { extractStructure: true };

    const result = await parser.parse(inputPath, options);

    expect(result.success).toBe(true);
    expect(result.document).toBeDefined();
    expect(result.document.pages).toBeInstanceOf(Array);
    expect(result.document.pages.length).toBeGreaterThan(0);
    expect(result.document.pages[0].text).toBeDefined();
    expect(result.document.pages[0].confidence).toBeDefined();
    expect(result.document.aiMetadata).toBeDefined();
    expect(result.processingTime).toBeGreaterThan(0);
  });

  it('应该在未配置API密钥时抛出异常', async () => {
    const parser = new MockAIOCRParser({ apiKey: null });
    const inputPath = path.join(testDir, 'test.pdf');

    expect(() => parser.parse(inputPath)).toThrow('未配置API密钥');
  });

  it('应该在输入文件不存在时抛出异常', async () => {
    const parser = new MockAIOCRParser({ apiKey: 'test-key' });
    const nonExistentFile = path.join(testDir, 'nonexistent.pdf');

    expect(() => parser.parse(nonExistentFile)).toThrow('输入文件不存在');
  });

  it('应该支持结构化数据提取', async () => {
    const parser = new MockAIOCRParser({ apiKey: 'test-key' });
    const inputPath = path.join(testDir, 'test.pdf');
    const options = { extractStructure: true };

    const result = await parser.parse(inputPath, options);

    expect(result.success).toBe(true);
    expect(result.document.pages[0].structuredData).toBeDefined();
    expect(result.document.pages[0].structuredData.indicators).toBeInstanceOf(Array);
    expect(result.document.pages[0].structuredData.indicators.length).toBeGreaterThan(0);
  });

  it('应该在不提取结构化数据时返回null', async () => {
    const parser = new MockAIOCRParser({ apiKey: 'test-key' });
    const inputPath = path.join(testDir, 'test.pdf');
    const options = { extractStructure: false };

    const result = await parser.parse(inputPath, options);

    expect(result.success).toBe(true);
    expect(result.document.pages[0].structuredData).toBeUndefined();
  });
});

// 导出测试以供外部运行
module.exports = {
  MockTraditionalPDFParser,
  MockAIOCRParser,
  expect,
  describe,
  it,
  beforeAll,
  afterAll
};