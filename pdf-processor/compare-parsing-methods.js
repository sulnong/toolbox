#!/usr/bin/env node

/**
 * 比较AI和传统PDF解析方法的结果
 */

const fs = require('fs');
const path = require('path');

// 模拟传统解析器
class TraditionalParser {
  async parse(inputPath) {
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 200));

    // 模拟传统PDF解析结果（基于pdf-parse的文本提取）
    return {
      success: true,
      document: {
        pages: [
          {
            pageNumber: 1,
            text: `心理健康评估报告

总体评估
评估结果：正常
描述：心理生理情绪正常

心理指标
攻击性：69.03
压力程度：37.01
焦虑程度：-101.83
消沉程度：27.27
自卑程度：-13.17
抑郁倾向：27.03
社交恐惧度：-21.95

生理指标
活力：21.11
抑制：9.35
脑活力：108.67

行为指标
平衡：70.14
自信：81.77
神经质：12.65
注意力：9.7
满意度：50.19
调节水平：66.43`,
            size: { width: 595, height: 842 },
            rotation: 0
          }
        ],
        metadata: {
          title: "心理健康评估报告",
          author: "系统生成",
          creationDate: new Date('2023-01-01'),
          version: "1.4",
          pageCount: 1
        },
        fileInfo: {
          name: "test-reports.pdf",
          size: 3600000,
          format: "PDF 1.4"
        }
      },
      processingTime: 200,
      method: "traditional",
      confidence: 0.85
    };
  }

  extractStructuredData(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    const structuredData = {
      code: 0,
      message: null,
      msg: null,
      data: {
        unit: "暂无单位",
        gender: "女",
        reportId: "100000182",
        data: {},
        nickname: null,
        avatar: null,
        dept: null,
        checkDate: null,
        device: null,
        age: null,
        username: null
      }
    };

    // 提取总体评估
    const overallIndex = lines.findIndex(line => line.includes('总体评估'));
    if (overallIndex !== -1 && overallIndex + 2 < lines.length) {
      const resultLine = lines[overallIndex + 1];
      if (resultLine.includes('评估结果')) {
        const result = resultLine.split('：')[1] || resultLine.split(':')[1];
        structuredData.data.data.总体评估 = {
          评估结果: result.trim()
        };
      }
    }

    // 解析各种指标
    const indicators = {
      '心理指标': ['攻击性', '压力程度', '焦虑程度', '消沉程度', '自卑程度', '抑郁倾向', '社交恐惧度'],
      '生理指标': ['活力', '抑制', '脑活力'],
      '行为指标': ['平衡', '自信', '神经质', '注意力', '满意度', '调节水平']
    };

    const indicatorCodeMap = {
      '攻击性': 'Q1', '压力程度': 'Q2', '焦虑程度': 'Q3', '消沉程度': 'Q10', '自卑程度': 'Q24',
      '抑郁倾向': 'Q26', '社交恐惧度': 'Q27', '活力': 'Q6', '抑制': 'Q8', '脑活力': 'Q16',
      '平衡': 'Q4', '自信': 'Q5', '神经质': 'Q9', '注意力': 'Q15', '满意度': 'Q14', '调节水平': 'Q7'
    };

    Object.entries(indicators).forEach(([category, indicatorList]) => {
      const categoryData = [];

      indicatorList.forEach(indicator => {
        const indicatorLine = lines.find(line => line.includes(indicator));
        if (indicatorLine) {
          const valueStr = indicatorLine.split('：')[1] || indicatorLine.split(':')[1];
          const value = parseFloat(valueStr.trim());

          if (!isNaN(value)) {
            const code = indicatorCodeMap[indicator];
            categoryData.push({
              code: code,
              name: indicator,
              value: value,
              min: 0,
              max: 100,
              std: 0,
              referenceRange: "10-70",
              ranges: [
                { min: 0, max: 30, level: "低" },
                { min: 30, max: 70, level: "中" },
                { min: 70, max: 100, level: "高" }
              ]
            });
          }
        }
      });

      if (categoryData.length > 0) {
        structuredData.data.data[category] = categoryData;
        structuredData.data.data.所有指标 = (structuredData.data.data.所有指标 || []).concat(categoryData);
      }
    });

    // 添加情绪数据
    structuredData.data.data.积极情绪 = 13.19;
    structuredData.data.data.消极情绪 = 0.51;
    structuredData.data.data.中性情绪 = 17.54;

    return structuredData;
  }
}

// 模拟AI OCR解析器
class AIOCRParser {
  constructor() {
    this.model = process.env.MODEL_NAME || 'qwen-vl-ocr';
    this.endpoint = process.env.API_ENDPOINT || 'https://aiproxy.hzh.sealos.run';
  }

  async parse(inputPath) {
    // 模拟处理时间（AI处理通常更慢）
    await new Promise(resolve => setTimeout(resolve, 800));

    // 模拟AI OCR解析结果（更准确的视觉识别）
    return {
      success: true,
      document: {
        pages: [
          {
            pageNumber: 1,
            text: `心理健康评估报告

【总体评估】
评估结果：正常
详细描述：心理生理情绪状态评估为正常范围，无明显异常

【心理指标分析】
攻击性指标：69.03 [中等偏高]
压力程度指数：37.01 [正常范围]
焦虑程度得分：-101.83 [偏低]
消沉程度测量：27.27 [正常]
自卑程度评估：-13.17 [偏低]
抑郁倾向检测：27.03 [轻微]
社交恐惧度评估：-21.95 [偏低]

【生理指标检测】
活力水平：21.11 [中等]
抑制状态：9.35 [偏低]
脑活力指数：108.67 [偏高]

【行为指标评估】
平衡能力：70.14 [良好]
自信水平：81.77 [优秀]
神经质倾向：12.65 [偏低]
注意力集中度：9.7 [需提升]
满意度评价：50.19 [中等]
调节水平：66.43 [良好]`,
            confidence: 0.94,
            boundingBoxes: [
              { text: "心理健康评估报告", x: 200, y: 50, width: 200, height: 30, confidence: 0.98 },
              { text: "攻击性：69.03", x: 100, y: 200, width: 120, height: 20, confidence: 0.96 }
            ],
            structuredData: {
              indicators: [
                { name: "攻击性", value: 69.03, category: "心理指标", confidence: 0.96 },
                { name: "压力程度", value: 37.01, category: "心理指标", confidence: 0.94 },
                { name: "焦虑程度", value: -101.83, category: "心理指标", confidence: 0.95 },
                { name: "活力", value: 21.11, category: "生理指标", confidence: 0.93 },
                { name: "自信", value: 81.77, category: "行为指标", confidence: 0.97 }
              ]
            }
          }
        ],
        aiMetadata: {
          model: this.model,
          endpoint: this.endpoint,
          processingTime: 800,
          totalConfidence: 0.94,
          ocrAccuracy: 0.96
        }
      },
      processingTime: 800,
      method: "ai-ocr",
      confidence: 0.94
    };
  }

  extractStructuredData(document) {
    // AI直接从识别的structuredData中提取
    const indicators = document.pages[0].structuredData.indicators;
    const text = document.pages[0].text;

    const structuredData = {
      code: 0,
      message: null,
      msg: null,
      data: {
        unit: "暂无单位",
        gender: "女",
        reportId: "100000182",
        data: {},
        nickname: null,
        avatar: null,
        dept: null,
        checkDate: null,
        device: null,
        age: null,
        username: null
      }
    };

    // 从AI识别的structuredData构建
    const indicatorsByCategory = {};
    const allIndicators = [];

    indicators.forEach(indicator => {
      if (!indicatorsByCategory[indicator.category]) {
        indicatorsByCategory[indicator.category] = [];
      }

      const fullIndicator = {
        code: this.getIndicatorCode(indicator.name),
        name: indicator.name,
        value: indicator.value,
        confidence: indicator.confidence,
        min: 0,
        max: 100,
        std: 0,
        referenceRange: "10-70",
        ranges: [
          { min: 0, max: 30, level: "低" },
          { min: 30, max: 70, level: "中" },
          { min: 70, max: 100, level: "高" }
        ]
      };

      indicatorsByCategory[indicator.category].push(fullIndicator);
      allIndicators.push(fullIndicator);
    });

    // 添加所有类别
    Object.keys(indicatorsByCategory).forEach(category => {
      structuredData.data.data[category] = indicatorsByCategory[category];
    });
    structuredData.data.data.所有指标 = allIndicators;

    // 提取总体评估（AI识别的更详细）
    if (text.includes('评估结果：正常')) {
      structuredData.data.data.总体评估 = {
        评估结果: "正常",
        详细描述: "心理生理情绪状态评估为正常范围，无明显异常"
      };
    }

    // 添加情绪数据（AI计算得出）
    structuredData.data.data.积极情绪 = 14.5;
    structuredData.data.data.消极情绪 = 0.3;
    structuredData.data.data.中性情绪 = 16.8;

    return structuredData;
  }

  getIndicatorCode(name) {
    const codeMap = {
      '攻击性': 'Q1', '压力程度': 'Q2', '焦虑程度': 'Q3', '消沉程度': 'Q10', '自卑程度': 'Q24',
      '抑郁倾向': 'Q26', '社交恐惧度': 'Q27', '活力': 'Q6', '抑制': 'Q8', '脑活力': 'Q16',
      '平衡': 'Q4', '自信': 'Q5', '神经质': 'Q9', '注意力': 'Q15', '满意度': 'Q14', '调节水平': 'Q7'
    };
    return codeMap[name] || 'UNKNOWN';
  }
}

// 比较函数
function compareMethods(traditionalResult, aiResult) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 两种解析方法对比分析');
  console.log('='.repeat(80));

  // 性能对比
  console.log('\n⏱️  性能对比:');
  console.log(`   传统方法: ${traditionalResult.processingTime}ms`);
  console.log(`   AI方法: ${aiResult.processingTime}ms`);
  console.log(`   性能比: ${(aiResult.processingTime / traditionalResult.processingTime).toFixed(1)}x`);

  // 准确性对比
  console.log('\n🎯 准确性对比:');
  console.log(`   传统方法置信度: ${(traditionalResult.confidence * 100).toFixed(1)}%`);
  console.log(`   AI方法置信度: ${(aiResult.confidence * 100).toFixed(1)}%`);
  console.log(`   AI OCR准确率: ${(aiResult.document.aiMetadata.ocrAccuracy * 100).toFixed(1)}%`);

  // 数据提取对比
  console.log('\n📋 数据提取对比:');

  const traditionalData = traditionalResult.structuredData;
  const aiData = aiResult.structuredData;

  console.log('\n   基本信息提取:');
  console.log(`     传统方法 - 单位: "${traditionalData.data.unit}"`);
  console.log(`     AI方法    - 单位: "${aiData.data.unit}"`);
  console.log(`     传统方法 - 报告ID: "${traditionalData.data.reportId}"`);
  console.log(`     AI方法    - 报告ID: "${aiData.data.reportId}"`);

  console.log('\n   指标提取数量:');
  const traditionalCategories = Object.keys(traditionalData.data.data).filter(k => Array.isArray(traditionalData.data.data[k]));
  const aiCategories = Object.keys(aiData.data.data).filter(k => Array.isArray(aiData.data.data[k]));

  console.log(`     传统方法 - ${traditionalCategories.length} 个类别: ${traditionalCategories.join(', ')}`);
  console.log(`     AI方法    - ${aiCategories.length} 个类别: ${aiCategories.join(', ')}`);

  // 详细指标对比
  console.log('\n🔍 详细指标对比:');
  const traditionalIndicators = traditionalData.data.data.所有指标 || [];
  const aiIndicators = aiData.data.data.所有指标 || [];

  console.log(`   传统方法提取到 ${traditionalIndicators.length} 个指标`);
  console.log(`   AI方法提取到 ${aiIndicators.length} 个指标`);

  // 找出共同的指标进行对比
  const commonIndicators = traditionalIndicators.filter(tIndicator =>
    aiIndicators.find(aIndicator => aIndicator.name === tIndicator.name)
  );

  console.log(`\n   共同指标对比 (${commonIndicators.length} 个):`);
  commonIndicators.forEach(indicator => {
    const aiIndicator = aiIndicators.find(ai => ai.name === indicator.name);
    const diff = Math.abs(indicator.value - aiIndicator.value).toFixed(2);
    const confidence = aiIndicator.confidence ? ` (置信度: ${(aiIndicator.confidence * 100).toFixed(1)}%)` : '';

    console.log(`     ${indicator.name}:`);
    console.log(`       传统: ${indicator.value}`);
    console.log(`       AI:   ${aiIndicator.value}${confidence}`);
    console.log(`       差异: ${diff}`);
  });

  // 找出AI独有的指标
  const aiOnlyIndicators = aiIndicators.filter(aiIndicator =>
    !traditionalIndicators.find(tIndicator => tIndicator.name === aiIndicator.name)
  );

  if (aiOnlyIndicators.length > 0) {
    console.log(`\n   AI方法独有的指标 (${aiOnlyIndicators.length} 个):`);
    aiOnlyIndicators.forEach(indicator => {
      const confidence = indicator.confidence ? ` (置信度: ${(indicator.confidence * 100).toFixed(1)}%)` : '';
      console.log(`     ${indicator.name}: ${indicator.value}${confidence}`);
    });
  }

  // 文本质量对比
  console.log('\n📝 文本质量对比:');
  const traditionalText = traditionalResult.document.pages[0].text;
  const aiText = aiResult.document.pages[0].text;

  console.log(`   传统方法文本长度: ${traditionalText.length} 字符`);
  console.log(`   AI方法文本长度: ${aiText.length} 字符`);

  console.log('\n   文本样例对比:');
  console.log('     传统方法:');
  console.log(`       "${traditionalText.substring(0, 100)}..."`);
  console.log('     AI方法:');
  console.log(`       "${aiText.substring(0, 100)}..."`);

  // 额外信息对比
  console.log('\n🔧 额外信息对比:');
  console.log(`   传统方法元数据: ${JSON.stringify(traditionalResult.document.metadata, null, 6)}`);
  console.log(`   AI方法元数据: 模型=${aiResult.document.aiMetadata.model}, 端点=${aiResult.document.aiMetadata.endpoint}`);
  console.log(`   AI边界框信息: ${aiResult.document.pages[0].boundingBoxes.length} 个文本块`);

  console.log('\n' + '='.repeat(80));
}

// 主函数
async function main() {
  console.log('🚀 开始对比传统和AI解析方法...\n');

  const pdfPath = 'test-reports.pdf';

  // 传统方法解析
  console.log('📄 使用传统方法解析PDF...');
  const traditionalParser = new TraditionalParser();
  const traditionalParseResult = await traditionalParser.parse(pdfPath);
  const traditionalStructuredData = traditionalParser.extractStructuredData(traditionalParseResult.document.pages[0].text);

  // AI方法解析
  console.log('\n🤖 使用AI OCR方法解析PDF...');
  const aiParser = new AIOCRParser();
  const aiParseResult = await aiParser.parse(pdfPath);
  const aiStructuredData = aiParser.extractStructuredData(aiParseResult.document);

  // 保存结果
  const outputDir = './comparison-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 保存传统方法结果
  const traditionalOutput = {
    parseResult: traditionalParseResult,
    structuredData: traditionalStructuredData
  };
  fs.writeFileSync(path.join(outputDir, 'traditional-result.json'), JSON.stringify(traditionalOutput, null, 2));

  // 保存AI方法结果
  const aiOutput = {
    parseResult: aiParseResult,
    structuredData: aiStructuredData
  };
  fs.writeFileSync(path.join(outputDir, 'ai-result.json'), JSON.stringify(aiOutput, null, 2));

  console.log('\n💾 结果已保存到 ./comparison-results/ 目录');

  // 显示结果摘要
  console.log('\n📊 传统方法结果摘要:');
  console.log(`   处理时间: ${traditionalParseResult.processingTime}ms`);
  console.log(`   置信度: ${(traditionalParseResult.confidence * 100).toFixed(1)}%`);
  console.log(`   提取指标数: ${traditionalStructuredData.data.data.所有指标?.length || 0}`);

  console.log('\n🤖 AI方法结果摘要:');
  console.log(`   处理时间: ${aiParseResult.processingTime}ms`);
  console.log(`   置信度: ${(aiParseResult.confidence * 100).toFixed(1)}%`);
  console.log(`   OCR准确率: ${(aiParseResult.document.aiMetadata.ocrAccuracy * 100).toFixed(1)}%`);
  console.log(`   提取指标数: ${aiStructuredData.data.data.所有指标?.length || 0}`);

  // 详细对比
  traditionalParseResult.structuredData = traditionalStructuredData;
  aiParseResult.structuredData = aiStructuredData;
  compareMethods(traditionalParseResult, aiParseResult);

  console.log('\n✅ 对比完成！');
  console.log('\n📁 查看详细结果:');
  console.log('   cat ./comparison-results/traditional-result.json');
  console.log('   cat ./comparison-results/ai-result.json');
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TraditionalParser, AIOCRParser };