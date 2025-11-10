# PDF处理器快速开始指南

## 🚀 5分钟快速体验

### 1. 环境准备
```bash
# 检查Node.js版本（需要 >= 18.0.0）
node --version

# 进入项目目录
cd /home/sunlong/workspace/toolbox/pdf-processor

# 安装依赖
npm install
```

### 2. AI服务配置（可选）
```bash
# 复制环境配置文件
cp .env.example .env

# 编辑.env文件，配置AI服务
API_ENDPOINT=https://aiproxy.hzh.sealos.run
API_KEY=your_api_key_here
MODEL_NAME=qwen-vl-ocr
```

### 3. 运行演示
```bash
# 使用简化版CLI（推荐，无需额外依赖）
node src/cli/simple-cli.js demo test-reports.pdf ./demo-output

# 查看结果
ls demo-output/
cat demo-output/structured-data.json
```

## 🎯 核心功能演示

### PDF转图像
```bash
# 转换PDF为PNG图像
node src/cli/simple-cli.js convert-pdf-to-image test-reports.pdf ./output-images

# 指定高质量参数
node src/cli/simple-cli.js convert-pdf-to-image test-reports.pdf ./output-hq
# 在实际实现中可以指定参数: --format png --quality 95 --dpi 300
```

### 结构化数据提取
```bash
# 提取结构化数据（推荐功能）
node src/cli/simple-cli.js extract-structured-data test-reports.pdf result.json

# 查看提取结果
echo "提取的指标数量:"
cat result.json | jq '.data.data | keys | length'

echo "心理指标:"
cat result.json | jq '.data.data.心理指标[] | {name, value}'
```

### PDF解析
```bash
# 解析PDF内容和元数据
node src/cli/simple-cli.js parse-pdf test-reports.pdf parsed.json

# 查看解析结果
cat parsed.json | jq '.document.metadata'
```

## 📊 查看实际效果

### 提取的数据结构
```bash
# 使用我们CLI提取的结果
cat cli-structured-result.json | jq '.data.data | keys'
# 输出: ["总体评估", "心理指标", "所有指标", "生理指标", "行为指标", "积极情绪", "消极情绪", "中性情绪"]

# 查看心理指标详情
cat cli-structured-result.json | jq '.data.data.心理指标[] | {name, value, code}'
# 输出所有心理指标的名称、数值和代码
```

### 验证提取准确性
```bash
# 统计提取的指标总数
echo "总指标数:"
cat cli-structured-result.json | jq '.data.data."所有指标" | length'
# 输出: 16

# 查看具体数值
echo "攻击性值:"
cat cli-structured-result.json | jq '.data.data."所有指标"[] | select(.name=="攻击性") | .value'
# 输出: 69.03
```

## 🛠️ 编程接口使用

### 基本用法
```javascript
// 导入模块
const { TraditionalPDFParser } = require('./src/parsers/traditional-pdf-parser.js');

// 创建解析器
const parser = new TraditionalPDFParser();

// 解析PDF
async function analyzePDF(pdfPath) {
  try {
    // 提取结构化数据
    const data = await parser.extractStructuredData(pdfPath);

    console.log(`解析完成，提取到 ${Object.keys(data.data.data).length} 个数据类别`);

    // 处理心理指标
    const mentalIndicators = data.data.data.心理指标 || [];
    console.log(`心理指标: ${mentalIndicators.length} 个`);

    mentalIndicators.forEach(indicator => {
      console.log(`${indicator.name}: ${indicator.value}`);
    });

    return data;
  } catch (error) {
    console.error('解析失败:', error.message);
  }
}

// 使用测试文件
analyzePDF('./test-reports.pdf');
```

### 批量处理
```javascript
const fs = require('fs');
const path = require('path');

async function batchAnalyzePDFs(inputDir, outputDir) {
  const pdfFiles = fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.pdf'))
    .map(file => path.join(inputDir, file));

  console.log(`找到 ${pdfFiles.length} 个PDF文件`);

  for (const pdfFile of pdfFiles) {
    try {
      const data = await parser.extractStructuredData(pdfFile);
      const outputFile = path.join(outputDir, path.basename(pdfFile, '.pdf') + '.json');

      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`✅ 处理完成: ${pdfFile} -> ${outputFile}`);
    } catch (error) {
      console.error(`❌ 处理失败: ${pdfFile}`, error.message);
    }
  }
}
```

## 🧪 运行测试

```bash
# 运行所有测试
node src/tests/run-tests.js

# 只运行手动验证测试
node src/tests/run-tests.js manual

# 运行性能基准测试
node src/tests/run-tests.js benchmark
```

## 📁 项目文件说明

### 核心文件
- `src/converters/` - PDF转换器模块
- `src/parsers/` - PDF解析器模块
- `src/types/` - TypeScript类型定义
- `src/cli/` - 命令行工具

### 测试文件
- `test-reports.pdf` - 测试用的PDF文件
- `test-data.json` - 期望的数据格式参考
- `src/tests/` - 完整的测试套件

### 配置文件
- `.env` - AI服务配置
- `package.json` - 项目依赖和脚本
- `CLAUDE.md` - 项目开发指南

### 文档文件
- `PROJECT_SUMMARY.md` - 项目总结报告
- `CLI_USAGE.md` - CLI详细使用说明
- `IMPLEMENTATION_COMPLETE.md` - 完整实现报告

## ⚡ 常见问题

### Q: 依赖安装失败怎么办？
A: 某些依赖（如sharp）可能需要编译。可以使用简化版CLI:
```bash
node src/cli/simple-cli.js help
```

### Q: AI OCR功能不工作？
A: 检查.env配置，确保API密钥正确:
```bash
echo $API_KEY
```

### Q: 如何处理大量文件？
A: 使用批量处理功能，支持并发处理:
```javascript
// 批量转换示例
await batchAnalyzePDFs('./input-pdfs', './output-json');
```

### Q: 解析结果不准确怎么办？
A: 可以调整解析参数或使用AI OCR增强:
```bash
# 尝试AI方法（需要配置API）
node src/cli/simple-cli.js extract-structured-data test.pdf result.json ai
```

## 🎯 下一步

1. **查看完整文档**: `CLI_USAGE.md`
2. **运行性能测试**: `node src/tests/run-tests.js benchmark`
3. **集成到你的项目**: 使用编程接口
4. **配置AI服务**: 启用高级OCR功能
5. **批量处理**: 处理多个PDF文件

---

**快速成功标准**:
- ✅ 运行演示: `node src/cli/simple-cli.js demo`
- ✅ 提取数据: `node src/cli/simple-cli.js extract-structured-data test.pdf result.json`
- ✅ 查看结果: `cat result.json | jq '.data.data.心理指标'`

需要帮助？查看 `CLI_USAGE.md` 获取详细使用说明。