# PDF处理器

一个功能强大的PDF处理工具包，使用Node.js和TypeScript构建，支持PDF转换、解析、OCR识别和修改功能。

## 功能特性

- 🔄 **PDF转换**: PDF转图像、图像转PDF
- 📄 **PDF解析**: 传统文本解析、元数据提取
- 🤖 **AI OCR识别**: 支持多种AI服务提供商的智能OCR
- 📊 **结构化数据**: 提取和转换结构化数据（JSON/YAML/CSV）
- ✏️ **PDF修改**: 添加水印、注释、合并分割等
- 🚀 **批量处理**: 支持大规模批量操作
- 🔧 **可配置**: 灵活的配置和插件架构

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd pdf-processor

# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env

# 编辑.env文件，配置AI服务API密钥
```

## 配置

在`.env`文件中配置AI服务：

```env
# 默认AI服务提供商
DEFAULT_AI_PROVIDER=openai

# OpenAI配置
OPENAI_API_KEY=your_openai_api_key_here

# Google Cloud Vision配置
GOOGLE_CLOUD_VISION_KEY=your_google_vision_key_here

# Azure Computer Vision配置
AZURE_COMPUTER_VISION_KEY=your_azure_vision_key_here
AZURE_COMPUTER_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com/

# 其他配置...
```

## 快速开始

```typescript
import { PDFProcessor } from './src/index';

const processor = PDFProcessor.create();

console.log('版本:', processor.getVersion());
console.log('支持的功能:', processor.getSupportedFeatures());
```

## API文档

详细的API文档正在开发中...

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 项目结构

```
pdf-processor/
├── src/
│   ├── converters/      # 转换器模块
│   ├── parsers/         # 解析器模块
│   ├── transformers/    # 数据转换模块
│   ├── types/          # TypeScript类型定义
│   ├── utils/          # 工具函数
│   └── index.ts        # 主入口
├── tests/              # 测试文件
├── examples/           # 示例代码
├── docs/              # 文档
└── dist/              # 构建输出
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！