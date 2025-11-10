# PDF处理器 CLI 使用说明

## 概述

PDF处理器是一个强大的命令行工具，提供PDF转换、解析和结构化数据提取功能。

## 安装和设置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置AI服务（可选）

如果需要使用AI OCR功能，请在项目根目录创建 `.env` 文件：

```bash
API_ENDPOINT=https://aiproxy.hzh.sealos.run
API_KEY=your_api_key_here
MODEL_NAME=qwen-vl-ocr
```

### 3. 使用CLI工具

```bash
# 方式1：直接使用Node.js运行
node src/cli/index.js [命令] [选项]

# 方式2：使用包装脚本（推荐）
./pdf-processor [命令] [选项]
```

## 命令参考

### 1. PDF转图像

将PDF文件转换为图像（PNG、JPEG、WebP格式）

```bash
# 基本用法
./pdf-processor convert-pdf-to-image -i input.pdf

# 指定输出目录和格式
./pdf-processor convert-pdf-to-image \
  -i input.pdf \
  -o ./output-images \
  -f png \
  -q 90 \
  -d 300

# 只转换特定页面
./pdf-processor convert-pdf-to-image \
  -i input.pdf \
  -o ./output-images \
  -p 1,3,5-8
```

**参数说明：**
- `-i, --input <path>`: 输入PDF文件路径（必需）
- `-o, --output <path>`: 输出目录路径（默认: ./output-images）
- `-f, --format <format>`: 图像格式 png/jpeg/webp（默认: png）
- `-q, --quality <number>`: 图像质量 1-100（默认: 90）
- `-d, --dpi <number>`: DPI设置（默认: 300）
- `-p, --pages <numbers>`: 页面范围（默认: all）

### 2. 图像转PDF

将多个图像文件合并为一个PDF

```bash
# 指定多个图像文件
./pdf-processor convert-images-to-pdf \
  -i image1.png,image2.jpg,image3.webp \
  -o output.pdf

# 从目录转换所有图像
./pdf-processor convert-images-to-pdf \
  -i ./images \
  -o output.pdf \
  --input-dir

# 自定义页面设置
./pdf-processor convert-images-to-pdf \
  -i ./images \
  -o output.pdf \
  --input-dir \
  --page-size A4 \
  --orientation portrait \
  --margin 10
```

**参数说明：**
- `-i, --input <paths>`: 输入图像文件路径（逗号分隔）或目录（必需）
- `-o, --output <path>`: 输出PDF文件路径（必需）
- `--input-dir`: 输入为目录而非文件列表
- `--pattern <pattern>`: 文件匹配模式（默认: *.{png,jpg,jpeg,webp,bmp,tiff}）
- `--page-size <size>`: PDF页面尺寸 A4/Letter/Legal（默认: A4）
- `--orientation <orientation>`: 页面方向 portrait/landscape（默认: portrait）
- `--margin <number>`: 页面边距 mm（默认: 10）

### 3. 批量转换

批量处理多个文件

```bash
# 批量PDF转图像
./pdf-processor batch-convert \
  -t pdf-to-image \
  -i ./input-pdfs \
  -o ./output-images \
  --pattern "*.pdf" \
  --concurrency 3

# 批量图像转PDF
./pdf-processor batch-convert \
  -t image-to-pdf \
  -i ./input-images \
  -o ./output-pdfs \
  --pattern "*.{png,jpg,jpeg}" \
  --concurrency 2
```

**参数说明：**
- `-t, --type <type>`: 转换类型 pdf-to-image/image-to-pdf（必需）
- `-i, --input <path>`: 输入目录路径（必需）
- `-o, --output <path>`: 输出目录路径（必需）
- `--pattern <pattern>`: 输入文件匹配模式（默认: *）
- `--concurrency <number>`: 并发数（默认: 3）
- `--continue-on-error`: 遇到错误时继续处理

### 4. PDF解析

解析PDF文件提取文本和元数据

```bash
# 基本解析
./pdf-processor parse-pdf -i input.pdf

# 解析并保存结果
./pdf-processor parse-pdf \
  -i input.pdf \
  -o parsed-result.json \
  --include-text \
  --include-metadata \
  --max-pages 10
```

**参数说明：**
- `-i, --input <path>`: 输入PDF文件路径（必需）
- `-o, --output <path>`: 输出JSON文件路径（可选）
- `--include-text`: 包含文本内容（默认: true）
- `--include-metadata`: 包含元数据（默认: true）
- `--max-pages <number>`: 最大页面数（可选）

### 5. AI OCR解析

使用AI服务进行OCR识别和解析

```bash
# 基本AI OCR
./pdf-processor ocr-pdf -i input.pdf

# 使用自定义配置
./pdf-processor ocr-pdf \
  -i input.pdf \
  -o ocr-result.json \
  --model qwen-vl-ocr \
  --endpoint https://aiproxy.example.com \
  --api-key your_api_key \
  --extract-structure
```

**参数说明：**
- `-i, --input <path>`: 输入PDF文件路径（必需）
- `-o, --output <path>`: 输出JSON文件路径（可选）
- `--model <model>`: AI模型名称（可选，使用环境变量默认值）
- `--endpoint <endpoint>`: API端点（可选，使用环境变量默认值）
- `--api-key <key>`: API密钥（可选，使用环境变量默认值）
- `--extract-structure`: 提取结构化数据（默认: true）

### 6. 结构化数据提取

专门提取结构化数据（参考test-data.json格式）

```bash
# 传统方法提取
./pdf-processor extract-structured-data \
  -i input.pdf \
  -o structured-data.json \
  --method traditional

# AI方法提取
./pdf-processor extract-structured-data \
  -i input.pdf \
  -o structured-data.json \
  --method ai \
  --model qwen-vl-ocr \
  --api-key your_api_key
```

**参数说明：**
- `-i, --input <path>`: 输入PDF文件路径（必需）
- `-o, --output <path>`: 输出JSON文件路径（必需）
- `--method <method>`: 解析方法 traditional/ai/combined（默认: traditional）
- `--model <model>`: AI模型名称（AI方法需要）
- `--endpoint <endpoint>`: API端点（AI方法需要）
- `--api-key <key>`: API密钥（AI方法需要）

### 7. 演示功能

使用测试文件演示所有功能

```bash
# 使用默认测试文件
./pdf-processor demo

# 使用自定义测试文件
./pdf-processor demo \
  --pdf ./my-test-file.pdf \
  --output-dir ./my-demo-output
```

**参数说明：**
- `--pdf <path>`: 测试PDF文件路径（默认: ./test-reports.pdf）
- `--output-dir <path>`: 演示输出目录（默认: ./demo-output）

## 示例工作流程

### 完整的PDF处理流程

```bash
# 1. PDF转图像
./pdf-processor convert-pdf-to-image -i report.pdf -o ./images

# 2. 传统解析
./pdf-processor parse-pdf -i report.pdf -o ./traditional-result.json

# 3. AI OCR解析（如果需要）
./pdf-processor ocr-pdf -i report.pdf -o ./ai-result.json

# 4. 结构化数据提取
./pdf-processor extract-structured-data \
  -i report.pdf \
  -o ./structured-data.json \
  --method traditional

# 5. 批量处理多个文件
./pdf-processor batch-convert \
  -t pdf-to-image \
  -i ./pdfs \
  -o ./output-images
```

### 快速演示

```bash
# 运行完整演示（使用测试文件）
./pdf-processor demo

# 查看结果
ls ./demo-output/
cat ./demo-output/structured-data.json
```

## 环境变量

除了 `.env` 文件，还可以使用环境变量：

```bash
export API_ENDPOINT="https://aiproxy.hzh.sealos.run"
export API_KEY="your_api_key"
export MODEL_NAME="qwen-vl-ocr"

# 然后运行命令
./pdf-processor ocr-pdf -i input.pdf
```

## 故障排除

### 常见问题

1. **"未找到Node.js"**
   - 解决: 安装Node.js https://nodejs.org/

2. **"依赖安装失败"**
   - 解决: 检查网络连接，尝试 `npm install --registry=https://registry.npm.taobao.org`

3. **"文件不存在"**
   - 解决: 检查文件路径是否正确，使用绝对路径

4. **"API密钥未配置"**
   - 解决: 配置 `.env` 文件或使用 `--api-key` 参数

5. **"PDF解析失败"**
   - 解决: 检查PDF文件是否损坏，尝试用其他PDF阅读器打开

### 调试模式

```bash
# 设置详细日志
export DEBUG=pdf-processor:*

# 运行命令
./pdf-processor [命令] [选项]
```

## 更新和维护

```bash
# 更新依赖
npm update

# 清理缓存
npm cache clean --force

# 重新安装
rm -rf node_modules package-lock.json
npm install
```

## 支持

如有问题，请检查：
1. Node.js版本 >= 18.0.0
2. 依赖是否正确安装
3. 输入文件是否存在和可读
4. 输出目录是否有写入权限