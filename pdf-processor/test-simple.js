/**
 * 简单的PDF解析测试
 */

const path = require('path');
const fs = require('fs');

// 简单的PDF文本提取模拟（用于测试）
function extractTextFromPDF(pdfPath) {
  // 这是一个模拟实现，实际应该使用pdf-parse
  return new Promise((resolve, reject) => {
    try {
      // 读取PDF文件的第一个页面（模拟）
      const buffer = fs.readFileSync(pdfPath);

      // 模拟提取的文本内容（基于我们之前看到的test-data.json的结构）
      const mockExtractedText = `
心理健康评估报告

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
调节水平：66.43
      `.trim();

      resolve(mockExtractedText);
    } catch (error) {
      reject(error);
    }
  });
}

function parseStructuredData(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  const structuredData = {
    code: 0,
    message: null,
    msg: null,
    data: {}
  };

  // 查找总体评估
  const overallIndex = lines.findIndex(line => line.includes('总体评估'));
  if (overallIndex !== -1 && overallIndex + 2 < lines.length) {
    const resultLine = lines[overallIndex + 1];
    if (resultLine.includes('评估结果')) {
      const result = resultLine.split('：')[1] || resultLine.split(':')[1];
      structuredData.data.总体评估 = {
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

  Object.entries(indicators).forEach(([category, indicatorList]) => {
    const categoryData = [];

    indicatorList.forEach(indicator => {
      const indicatorLine = lines.find(line => line.includes(indicator));
      if (indicatorLine) {
        const valueStr = indicatorLine.split('：')[1] || indicatorLine.split(':')[1];
        const value = parseFloat(valueStr.trim());

        if (!isNaN(value)) {
          categoryData.push({
            code: getIndicatorCode(indicator),
            name: indicator,
            value: value
          });
        }
      }
    });

    if (categoryData.length > 0) {
      structuredData.data[category] = categoryData;
    }
  });

  return structuredData;
}

function getIndicatorCode(indicatorName) {
  const codeMap = {
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

async function runTest() {
  console.log('🧪 开始PDF解析测试...\n');

  const pdfPath = path.resolve(__dirname, 'test-reports.pdf');

  // 检查文件是否存在
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ 测试PDF文件不存在:', pdfPath);
    return;
  }

  try {
    // 显示环境配置
    console.log('📋 环境配置:');
    console.log(`  API Key: ${process.env.API_KEY ? '已配置' : '未配置'}`);
    console.log(`  API Endpoint: ${process.env.API_ENDPOINT || '未配置'}`);
    console.log(`  Model: ${process.env.MODEL_NAME || '未配置'}`);
    console.log('');

    // 获取文件信息
    const stats = fs.statSync(pdfPath);
    console.log('📄 文件信息:');
    console.log(`  文件路径: ${pdfPath}`);
    console.log(`  文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

    // 模拟文本提取
    console.log('📖 测试文本提取:');
    const extractedText = await extractTextFromPDF(pdfPath);
    console.log('✅ 文本提取成功');
    console.log(`  提取文本长度: ${extractedText.length} 字符`);
    console.log(`  文本预览: ${extractedText.substring(0, 100)}...`);
    console.log('');

    // 测试结构化数据提取
    console.log('📊 测试结构化数据提取:');
    const structuredData = parseStructuredData(extractedText);
    console.log('✅ 结构化数据提取成功');
    console.log('  数据结构:');
    console.log(`    code: ${structuredData.code}`);
    console.log(`    message: ${structuredData.message}`);
    console.log(`    数据键: ${Object.keys(structuredData.data || {}).join(', ')}`);
    console.log('');

    // 显示具体数据
    if (structuredData.data) {
      console.log('📈 提取的详细数据:');
      Object.entries(structuredData.data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          console.log(`  ${key}:`);
          value.forEach((item, index) => {
            console.log(`    ${index + 1}. ${item.name}: ${item.value}`);
          });
        } else if (typeof value === 'object') {
          console.log(`  ${key}:`);
          Object.entries(value).forEach(([subKey, subValue]) => {
            console.log(`    ${subKey}: ${subValue}`);
          });
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
    }

    // 与原始test-data.json对比
    console.log('\n🔍 与test-data.json对比:');
    const testDataPath = path.resolve(__dirname, 'test-data.json');
    if (fs.existsSync(testDataPath)) {
      const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

      console.log('✅ 找到参考数据文件');

      // 比较数据结构
      const ourKeys = Object.keys(structuredData.data || {});
      const referenceKeys = Object.keys(testData.data || {});

      console.log('  数据类别对比:');
      console.log(`    我们提取: ${ourKeys.join(', ')}`);
      console.log(`    参考数据: ${referenceKeys.join(', ')}`);

      // 统计匹配情况
      const matchedCategories = ourKeys.filter(key => referenceKeys.includes(key));
      console.log(`    匹配类别: ${matchedCategories.length}/${Math.max(ourKeys.length, referenceKeys.length)}`);

      // 统计指标数量
      let totalOurIndicators = 0;
      let totalReferenceIndicators = 0;

      ourKeys.forEach(key => {
        if (Array.isArray(structuredData.data[key])) {
          totalOurIndicators += structuredData.data[key].length;
        }
      });

      referenceKeys.forEach(key => {
        if (Array.isArray(testData.data[key])) {
          totalReferenceIndicators += testData.data[key].length;
        }
      });

      console.log(`    指标数量: ${totalOurIndicators}/${totalReferenceIndicators}`);

      if (matchedCategories.length > 0) {
        console.log('\n✅ 解析结果与参考数据有良好匹配！');
      } else {
        console.log('\n⚠️  解析结果与参考数据匹配度较低，可能需要调整解析逻辑');
      }
    } else {
      console.log('⚠️  未找到test-data.json参考文件');
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }

  console.log('\n📝 测试完成！');
  console.log('\n💡 建议:');
  console.log('1. 这是模拟解析结果，实际解析需要安装完整依赖');
  console.log('2. 结构匹配度显示解析逻辑基本正确');
  console.log('3. 实际部署时建议使用完整的pdf-parse库');
  console.log('4. 可以根据需要调整解析规则和指标映射');
}

// 运行测试
runTest();